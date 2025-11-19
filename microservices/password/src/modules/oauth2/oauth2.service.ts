import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Servicio OAuth2 para obtener tokens de acceso desde Keycloak
 * usando el flujo client_credentials.
 * 
 * Implementa caché de tokens para evitar solicitudes innecesarias
 * y renueva automáticamente cuando están cerca de expirar.
 */
@Injectable()
export class OAuth2Service implements OnModuleInit {
  private readonly logger = new Logger(OAuth2Service.name);
  private readonly keycloakAuthUrl: string;
  private readonly keycloakRealm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  
  // Caché de tokens
  private cachedToken: CachedToken | null = null;
  private readonly tokenRenewalBuffer = 5 * 60 * 1000; // 5 minutos antes de expirar

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.keycloakAuthUrl = this.configService.get<string>('KEYCLOAK_AUTH_URL') || 'http://keycloak:8080';
    this.keycloakRealm = this.configService.get<string>('KEYCLOAK_REALM') || 'microservices-realm';
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID') || 'password-service';
    this.clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET') || '';
  }

  onModuleInit() {
    this.logger.log(`OAuth2Service inicializado para cliente: ${this.clientId}`);
    this.logger.log(`Keycloak URL: ${this.keycloakAuthUrl}`);
    this.logger.log(`Realm: ${this.keycloakRealm}`);
  }

  /**
   * Obtiene un token de acceso válido desde Keycloak.
   * Si hay un token en caché que aún no ha expirado, lo retorna.
   * Si el token está cerca de expirar o no existe, solicita uno nuevo.
   * 
   * @returns Promise<string> - Token de acceso JWT
   */
  async getAccessToken(): Promise<string> {
    // Verificar si hay un token en caché válido
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      this.logger.debug('Usando token en caché');
      return this.cachedToken.token;
    }

    // Obtener un nuevo token
    this.logger.log('Obteniendo nuevo token de acceso desde Keycloak...');
    try {
      const tokenResponse = await this.requestToken();
      this.cacheToken(tokenResponse);
      return tokenResponse.access_token;
    } catch (error: any) {
      this.logger.error(`Error al obtener token de acceso: ${error.message}`);
      throw new Error(`No se pudo obtener token de acceso: ${error.message}`);
    }
  }

  /**
   * Solicita un nuevo token desde Keycloak usando client_credentials
   */
  private async requestToken(): Promise<TokenResponse> {
    const tokenUrl = `${this.keycloakAuthUrl}/realms/${this.keycloakRealm}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(
          tokenUrl,
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 5000,
          },
        ),
      );

      if (!response.data.access_token) {
        throw new Error('Respuesta de Keycloak no contiene access_token');
      }

      this.logger.debug(`Token obtenido exitosamente. Expira en ${response.data.expires_in} segundos`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error al solicitar token: ${error.message}`);
      if (error.response) {
        this.logger.error(`Respuesta de error: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Verifica si un token en caché aún es válido
   */
  private isTokenValid(cached: CachedToken): boolean {
    const now = Date.now();
    // Considerar el token válido si aún no ha expirado y no está cerca de expirar
    return cached.expiresAt > (now + this.tokenRenewalBuffer);
  }

  /**
   * Guarda el token en caché con su tiempo de expiración
   */
  private cacheToken(tokenResponse: TokenResponse): void {
    const expiresIn = tokenResponse.expires_in || 300; // Default 5 minutos
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    this.cachedToken = {
      token: tokenResponse.access_token,
      expiresAt: expiresAt,
    };

    this.logger.debug(`Token guardado en caché. Expira en ${expiresIn} segundos`);
  }

  /**
   * Limpia el token en caché (útil para testing o forzar renovación)
   */
  clearCache(): void {
    this.cachedToken = null;
    this.logger.debug('Caché de token limpiado');
  }
}

