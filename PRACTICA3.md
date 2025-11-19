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
docker compose up --build
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

## ⚙️ Pruebas con REST Client para Defensa

### Requisitos

1. **VS Code** con la extensión **REST Client** (`humao.rest-client`)
2. **Docker Compose** instalado y funcionando
3. Toda la infraestructura levantada con `docker compose up --build`

### Pasos para la Defensa (3 minutos)

#### 1. Preparación (30 segundos)

```bash
# Desde la raíz del proyecto
docker compose up --build
```

Esperar a que todos los servicios estén `healthy` (verificar con `docker compose ps`).

#### 2. Abrir archivos de prueba en VS Code

Abrir los siguientes archivos en VS Code:
- `tests/practica1.http` - Demuestra separación por dominio y arquitectura
- `tests/practica2.http` - Demuestra comunicación asíncrona con Kafka
- `tests/practica3.http` - Demuestra autenticación servicio a servicio

#### 3. Secuencia de demostración recomendada

##### Práctica #1 - Arquitectura y Dominios (30 segundos)

**Ejecutar en `practica1.http`:**

1. **Request 2.1**: Crear usuario
   - **Comentar**: "Aquí vemos el dominio de Users, con su propia base de datos"
   - **Resultado esperado**: 201 Created

2. **Request 4.2**: Crear contraseña
   - **Comentar**: "Aquí vemos el dominio de Password, independiente. Valida el usuario vía HTTP síncrono"
   - **Resultado esperado**: 201 Created

3. **Request 3.1-3.3**: Múltiples requests al Load Balancer
   - **Comentar**: "El Load Balancer distribuye entre 2 réplicas, alta disponibilidad"
   - **Resultado esperado**: 200 OK (puede variar según la réplica)

##### Práctica #2 - Kafka y Eventos (30 segundos)

**Ejecutar en `practica2.http`:**

1. **Request 2.1**: Verificar cache vacío
   - **Comentar**: "El cache local está vacío inicialmente"
   - **Resultado esperado**: `{"totalUsers": 0}`

2. **Request 3.1**: Crear usuario
   - **Comentar**: "users-service publica evento USER_CREATED a Kafka"
   - **Resultado esperado**: 201 Created

3. **Esperar 2-3 segundos** (eventual consistency)

4. **Request 3.2**: Verificar cache
   - **Comentar**: "password-service consumió el evento y actualizó su cache local. Eventual consistency."
   - **Resultado esperado**: `{"totalUsers": 1}`

##### Práctica #3 - Autenticación Servicio a Servicio (2 minutos)

**Ejecutar en `practica3.http`:**

1. **Request 4.1**: Intentar acceder sin token
   - **Comentar**: "Sin token, users-service rechaza la petición. Zero Trust Architecture."
   - **Resultado esperado**: 401 Unauthorized
   - **Tiempo**: 10 segundos

2. **Request 2.1**: Obtener token desde Keycloak
   - **Comentar**: "password-service obtiene token usando client_credentials. Este es el flujo OAuth2."
   - **Resultado esperado**: 200 OK con `access_token`
   - **Tiempo**: 10 segundos

3. **Request 4.4**: Acceder con token válido
   - **Comentar**: "Con token válido, users-service acepta. Valida firma, issuer, audience y expiración usando JWKS."
   - **Resultado esperado**: 200 OK con lista de usuarios
   - **Tiempo**: 10 segundos

4. **Request 5.3**: Flujo completo servicio a servicio
   - **Comentar**: "password-service crea una contraseña. Internamente obtiene token automáticamente y lo incluye en la llamada a users-service. Flujo completo demostrado."
   - **Resultado esperado**: 201 Created (si el usuario existe)
   - **Tiempo**: 20 segundos

5. **Request 7.1** (opcional si hay tiempo): Obtener JWKS
   - **Comentar**: "users-service usa estas claves públicas de Keycloak para validar la firma JWT"
   - **Resultado esperado**: 200 OK con JSON Web Key Set
   - **Tiempo**: 10 segundos

#### 4. Puntos clave a mencionar durante la demostración

- **Alta cohesión y bajo acoplamiento**: Cada servicio es independiente, se comunican vía HTTP REST
- **Separación por dominio**: Users y Password son bounded contexts independientes
- **Load Balancer**: Distribuye carga entre réplicas para alta disponibilidad
- **Event-Driven Architecture**: Kafka permite comunicación asíncrona y eventual consistency
- **Zero Trust**: Autenticación servicio a servicio con OAuth2/Keycloak, sin confianza implícita
- **Validación JWT**: users-service valida tokens usando JWKS, verificando firma, issuer, audience y expiración

#### 5. Trade-offs y decisiones arquitectónicas

**Puntos a mencionar si el docente pregunta:**

- **HTTP síncrono vs Kafka asíncrono**: 
  - HTTP: Consistencia inmediata, pero acoplamiento temporal
  - Kafka: Eventual consistency, pero desacoplamiento y escalabilidad

- **Load Balancer con réplicas**:
  - Ventaja: Alta disponibilidad, distribución de carga
  - Trade-off: Complejidad adicional, necesidad de sincronización de datos

- **Autenticación con Keycloak**:
  - Ventaja: Centralizada, estándar OAuth2, validación robusta
  - Trade-off: Punto único de fallo (mitigado con alta disponibilidad en producción)

- **Bases de datos SQLite por servicio**:
  - Ventaja: Separación de datos, independencia
  - Trade-off: No hay transacciones distribuidas (patrón correcto para microservicios)

### Archivos de prueba

- `tests/practica1.http`: Práctica #1 - Arquitectura y comunicación síncrona
- `tests/practica2.http`: Práctica #2 - Comunicación asíncrona con Kafka
- `tests/practica3.http`: Práctica #3 - Autenticación servicio a servicio

Cada archivo incluye:
- Comentarios explicativos sobre qué demuestra cada request
- Sección "RESUMEN PARA DEFENSA" con secuencia recomendada
- Variables de entorno para facilitar las pruebas

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

