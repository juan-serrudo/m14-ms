import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';

interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  azp?: string;
  client_id?: string;
  [key: string]: any;
}

/**
 * Guard de autenticación JWT para validar tokens de Keycloak
 * 
 * Valida:
 * - Firma del token usando JWKS de Keycloak
 * - Issuer (iss) debe coincidir con el realm configurado
 * - Audiencia (aud) debe incluir el client_id esperado
 * - Expiración (exp) del token
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly keycloakAuthUrl: string;
  private readonly keycloakRealm: string;
  private readonly expectedAudience: string;
  private readonly expectedIssuer: string;
  private jwksClient: JwksClient;

  constructor(private readonly configService: ConfigService) {
    this.keycloakAuthUrl =
      this.configService.get<string>('KEYCLOAK_AUTH_URL') || 'http://keycloak:8080';
    this.keycloakRealm =
      this.configService.get<string>('KEYCLOAK_REALM') || 'microservices-realm';
    this.expectedAudience =
      this.configService.get<string>('JWT_AUDIENCE') || 'users-service';
    this.expectedIssuer = `${this.keycloakAuthUrl}/realms/${this.keycloakRealm}`;

    // Configurar cliente JWKS para obtener las claves públicas de Keycloak
    const jwksUri = `${this.expectedIssuer}/protocol/openid-connect/certs`;
    this.jwksClient = jwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 86400000, // 24 horas
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });

    this.logger.log(`JwtAuthGuard inicializado`);
    this.logger.log(`Issuer esperado: ${this.expectedIssuer}`);
    this.logger.log(`Audiencia esperada: ${this.expectedAudience}`);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Excluir endpoints de health check de la autenticación
    // El prefijo global es /api, así que /api/health es el endpoint completo
    const url = request.url.split('?')[0]; // Remover query parameters
    if (url === '/api/health' || url === '/health' || url === '/api' || url.endsWith('/health')) {
      this.logger.debug(`Endpoint de health check excluido de autenticación: ${url}`);
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('Petición sin token de autenticación');
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    try {
      const payload = await this.verifyToken(token);
      this.validatePayload(payload);
      
      // Adjuntar el payload al request para uso posterior si es necesario
      (request as any).user = payload;
      
      this.logger.debug('Token validado exitosamente');
      return true;
    } catch (error: any) {
      this.logger.error(`Error al validar token: ${error.message}`);
      throw new UnauthorizedException(`Token inválido: ${error.message}`);
    }
  }

  /**
   * Extrae el token Bearer de la cabecera Authorization
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }

  /**
   * Verifica y decodifica el token JWT usando JWKS
   */
  private async verifyToken(token: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          // Obtener la clave pública desde JWKS
          this.jwksClient.getSigningKey(header.kid, (err, key) => {
            if (err) {
              this.logger.error(`Error al obtener clave JWKS: ${err.message}`);
              return callback(err);
            }
            if (!key) {
              return callback(new Error('No se pudo obtener la clave de firma desde JWKS'));
            }
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
          });
        },
        {
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) {
            reject(err);
          } else {
            resolve(decoded as JwtPayload);
          }
        },
      );
    });
  }

  /**
   * Valida el payload del token (issuer, audiencia, expiración)
   */
  private validatePayload(payload: JwtPayload): void {
    // Validar issuer
    if (payload.iss !== this.expectedIssuer) {
      throw new Error(
        `Issuer inválido. Esperado: ${this.expectedIssuer}, Obtenido: ${payload.iss}`,
      );
    }

    // Validar audiencia
    const audience = payload.aud;
    if (!audience) {
      throw new Error('Token sin audiencia (aud)');
    }

    const audiences = Array.isArray(audience) ? audience : [audience];
    if (!audiences.includes(this.expectedAudience)) {
      throw new Error(
        `Audiencia inválida. Esperado: ${this.expectedAudience}, Obtenido: ${audiences.join(', ')}`,
      );
    }

    // Validar expiración (jwt.verify ya lo hace, pero verificamos explícitamente)
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('Token expirado');
      }
    } else {
      throw new Error('Token sin tiempo de expiración (exp)');
    }

    this.logger.debug(
      `Token válido para cliente: ${payload.azp || payload.client_id || 'unknown'}`,
    );
  }
}

