import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, retry, catchError, throwError } from 'rxjs';
import { OAuth2Service } from '../oauth2/oauth2.service';

/**
 * Circuit Breaker Implementation
 * Estados: CLOSED (normal), OPEN (fallando), HALF_OPEN (probando recuperación)
 */
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class UserClientService {
  private readonly logger = new Logger(UserClientService.name);
  private readonly userServiceBaseUrl: string;
  
  // Circuit Breaker state
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private readonly failureThreshold: number = 5; // Umbral de fallos para abrir el circuito
  private readonly resetTimeout: number = 15000; // 15 segundos de enfriamiento
  private lastFailureTime: number = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly oauth2Service: OAuth2Service,
  ) {
    this.userServiceBaseUrl = this.configService.get<string>('USER_SERVICE_BASE_URL') || 'http://users-service-lb';
  }

  /**
   * Verifica el estado del Circuit Breaker y lo actualiza si es necesario
   */
  private checkCircuitState(): void {
    const now = Date.now();

    // Si está OPEN y ha pasado el tiempo de enfriamiento, cambiar a HALF_OPEN
    if (this.circuitState === CircuitState.OPEN) {
      if (now - this.lastFailureTime >= this.resetTimeout) {
        this.logger.log('Circuit Breaker: Cambiando de OPEN a HALF_OPEN (probando recuperación)');
        this.circuitState = CircuitState.HALF_OPEN;
        this.failureCount = 0;
      }
    }
  }

  /**
   * Registra un fallo y actualiza el estado del Circuit Breaker
   */
  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      if (this.circuitState !== CircuitState.OPEN) {
        this.logger.warn(`Circuit Breaker: Abriendo circuito después de ${this.failureCount} fallos consecutivos`);
        this.circuitState = CircuitState.OPEN;
      }
    }
  }

  /**
   * Registra un éxito y resetea el Circuit Breaker si estaba en HALF_OPEN
   */
  private recordSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit Breaker: Recuperación exitosa, cerrando circuito');
      this.circuitState = CircuitState.CLOSED;
    }
    this.failureCount = 0;
  }

  /**
   * Verifica si un usuario existe en el microservicio users
   * Implementa Retry Pattern y Circuit Breaker
   */
  async userExists(userId: number): Promise<boolean> {
    // Verificar estado del Circuit Breaker
    this.checkCircuitState();

    // Si el circuito está abierto, fallar rápido
    if (this.circuitState === CircuitState.OPEN) {
      this.logger.error('Circuit Breaker: Circuito abierto - servicio de usuarios no disponible');
      throw new Error('User service unavailable (circuit open)');
    }

    const url = `${this.userServiceBaseUrl}/api/users/exists/${userId}`;

    try {
      // Obtener token de acceso desde Keycloak (OAuth2 client_credentials)
      const accessToken = await this.oauth2Service.getAccessToken();
      
      // PATRÓN RETRY: timeout de 2 segundos y retry de 2 intentos
      // Si falla después de los retries, se lanza el error
      // AUTENTICACIÓN: Incluir token Bearer en la cabecera Authorization
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }).pipe(
          timeout(2000), // Timeout de 2 segundos
          retry({
            count: 2, // 2 reintentos adicionales (total 3 intentos)
            delay: 500, // Delay de 500ms entre reintentos
          }),
          catchError((error) => {
            this.logger.error(`Error al verificar usuario ${userId}: ${error.message}`);
            this.recordFailure();
            return throwError(() => error);
          }),
        ),
      );

      // Si llegamos aquí, la llamada fue exitosa
      this.recordSuccess();
      
      const exists = response.data?.response?.exists ?? false;
      this.logger.debug(`Usuario ${userId} existe: ${exists}`);
      
      return exists;
    } catch (error: any) {
      this.recordFailure();
      
      // Si el error es del Circuit Breaker, relanzarlo
      if (error.message === 'User service unavailable (circuit open)') {
        throw error;
      }

      // Para otros errores, lanzar un error descriptivo
      this.logger.error(`Error al verificar existencia del usuario ${userId}: ${error.message}`);
      throw new Error(`Error al verificar usuario: ${error.message}`);
    }
  }
}

