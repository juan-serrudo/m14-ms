# Práctica #3 – Autenticación Servicio a Servicio

## Resumen

Esta práctica implementa autenticación servicio a servicio usando **OAuth2 con Keycloak** y el flujo **client_credentials**. Los microservicios se autentican entre sí mediante tokens JWT, eliminando la confianza implícita basada únicamente en la red de Docker.

---

## Arquitectura de Autenticación

### Flujo "Antes" (sin autenticación)

```
password-service ──[HTTP sin autenticación]──> users-service-lb ──> users-service-1/2
```

- **Cliente**: `password-service` realiza llamadas HTTP directas a `users-service-lb`
- **Servidor**: `users-service` acepta todas las peticiones sin validación
- **Problema**: Cualquier servicio en la red Docker puede llamar a `users-service`

### Flujo "Después" (con OAuth2/Keycloak)

```
password-service ──[1. Obtener token]──> Keycloak
password-service ──[2. HTTP + Bearer token]──> users-service-lb ──> users-service-1/2
users-service ──[3. Validar token]──> Keycloak (JWKS)
```

1. **Cliente (`password-service`)**:
   - Obtiene un `access_token` desde Keycloak usando `client_credentials`
   - Incluye el token en la cabecera `Authorization: Bearer <token>`
   - Implementa caché de tokens para evitar solicitudes innecesarias

2. **Servidor (`users-service`)**:
   - Valida el token JWT recibido (firma, issuer, audiencia, expiración)
   - Rechaza peticiones sin token o con token inválido/expirado
   - No confía en la red Docker: requiere token válido

---

## Configuración de Keycloak

### Realm

- **Nombre**: `microservices-realm`
- **Descripción**: Realm dedicado para autenticación entre microservicios

### Clientes OAuth2

#### 1. `password-service` (Cliente)
- **Tipo**: `confidential`
- **Autenticación**: `client-secret`
- **Service Accounts**: Habilitado (requerido para `client_credentials`)
- **Grant Types**: `client_credentials`
- **Roles/Scopes**: `users.read` (permiso para leer información de usuarios)

#### 2. `users-service` (Servidor)
- **Tipo**: `confidential`
- **Autenticación**: `client-secret`
- **Service Accounts**: Habilitado (por si necesita obtener tokens en el futuro)
- **Grant Types**: `client_credentials`
- **Roles/Scopes**: `users.write` (permiso para escribir información de usuarios)

### Roles y Scopes

- `users.read`: Permite leer información de usuarios
- `users.write`: Permite crear/actualizar/eliminar usuarios

---

## Implementación Técnica

### 1. Infraestructura (Docker Compose)

- **keycloak-db**: PostgreSQL para almacenar configuración de Keycloak
- **keycloak**: Servidor Keycloak con importación automática del realm
- **Configuración automática**: El realm se importa desde `infra/keycloak/realm-export.json` al iniciar

### 2. Cliente (password-service)

#### Servicio de Autenticación (`OAuth2Service`)
- Obtiene tokens desde Keycloak usando `client_credentials`
- Implementa caché de tokens con renovación automática
- Maneja errores y reintentos

#### Modificación de `UserClientService`
- Antes de cada llamada HTTP, obtiene un token válido
- Incluye la cabecera `Authorization: Bearer <token>`
- Mantiene compatibilidad con Circuit Breaker y Retry existentes

### 3. Servidor (users-service)

#### Guard de Autenticación (`JwtAuthGuard`)
- Valida tokens JWT usando JWKS de Keycloak
- Verifica:
  - Firma del token (usando clave pública de Keycloak)
  - Issuer (`iss`) debe ser `http://keycloak:8080/realms/microservices-realm`
  - Audiencia (`aud`) debe incluir el client_id esperado
  - Expiración (`exp`)
- Rechaza peticiones sin token o con token inválido

#### Aplicación del Guard
- Se aplica a todos los endpoints de `UserController` excepto `/health`
- Retorna `401 Unauthorized` si el token es inválido o falta

---

## Variables de Entorno

### password-service

```env
KEYCLOAK_AUTH_URL=http://keycloak:8080
KEYCLOAK_REALM=microservices-realm
KEYCLOAK_CLIENT_ID=password-service
KEYCLOAK_CLIENT_SECRET=<secret-generado>
```

### users-service

```env
KEYCLOAK_AUTH_URL=http://keycloak:8080
KEYCLOAK_REALM=microservices-realm
KEYCLOAK_CLIENT_ID=users-service
KEYCLOAK_CLIENT_SECRET=<secret-generado>
JWT_AUDIENCE=users-service
JWT_ISSUER=http://keycloak:8080/realms/microservices-realm
```

---

## Seguridad

### Principios Aplicados

1. **Zero Trust**: No hay confianza implícita por estar en la misma red
2. **Autenticación mutua**: Cada servicio debe autenticarse con Keycloak
3. **Tokens con expiración**: Los tokens tienen tiempo de vida limitado
4. **Validación estricta**: Verificación de firma, issuer, audiencia y expiración
5. **Secrets en variables de entorno**: Los `client_secret` no están hardcodeados

### Limitaciones en este Entorno

- Los `client_secret` están en `docker-compose.yml` (en producción usar secretos gestionados)
- Keycloak en modo desarrollo (en producción usar HTTPS y configuración robusta)
- No se implementa mTLS (mutual TLS) adicional (opcional para mayor seguridad)

---

## Uso

### Iniciar toda la infraestructura

```bash
docker compose up
```

Esto levanta:
- Kafka, Zookeeper
- Keycloak + PostgreSQL (con realm preconfigurado)
- users-service-1, users-service-2, users-service-lb
- password-service
- frontend

### Verificar autenticación

1. **Sin token** (debe fallar):
```bash
curl http://localhost:8080/api/users
# 401 Unauthorized
```

2. **Con token válido** (debe funcionar):
```bash
# El password-service obtiene el token automáticamente
curl http://localhost:3000/api/password-manager
# Funciona porque password-service incluye el token automáticamente
```

---

## Archivos Modificados/Creados

### Nuevos Archivos

- `PRACTICA3.md` (este archivo)
- `infra/keycloak/realm-export.json` (configuración del realm)
- `microservices/password/src/modules/oauth2/oauth2.service.ts` (servicio de autenticación)
- `microservices/password/src/modules/oauth2/oauth2.module.ts` (módulo OAuth2)
- `microservices/users/src/guards/jwt-auth.guard.ts` (guard de validación JWT)
- `microservices/users/src/guards/jwt-auth.module.ts` (módulo del guard)

### Archivos Modificados

- `docker-compose.yml` (añadidos keycloak-db, keycloak, variables de entorno)
- `microservices/password/src/modules/user-client/user-client.service.ts` (añadido token Bearer)
- `microservices/password/src/modules/user-client/user-client.module.ts` (importa OAuth2Module)
- `microservices/users/src/app.module.ts` (importa JwtAuthModule)
- `microservices/users/src/modules/user/user.controller.ts` (aplica guard)
- `microservices/password/package.json` (dependencias OAuth2)
- `microservices/users/package.json` (dependencias JWT)

---

## Notas de Implementación

- El caché de tokens evita solicitar un nuevo token en cada llamada HTTP
- Los tokens se renuevan automáticamente cuando están cerca de expirar (5 minutos antes)
- El guard de validación JWT usa JWKS para obtener las claves públicas de Keycloak
- Se mantiene compatibilidad con Circuit Breaker y Retry existentes en `UserClientService`

