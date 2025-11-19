# Implementación - Práctica #1: Microservicios

## Resumen de la Implementación

Este documento describe la implementación completa de la **Práctica #1 – Implementación de microservicios**, que incluye dos microservicios independientes con comunicación síncrona, patrones de resiliencia (Retry y Circuit Breaker), Load Balancer con réplicas, y orquestación con Docker Compose.

---

## 📁 Archivos Nuevos Creados

### Microservicio Users (`microservices/users/`)
- `package.json` - Dependencias del proyecto
- `tsconfig.json` - Configuración TypeScript
- `nest-cli.json` - Configuración NestJS CLI
- `Dockerfile` - Imagen Docker del microservicio
- `src/entitys/user.entity.ts` - Entidad User
- `src/dto/user.dto.ts` - DTOs de creación y actualización
- `src/dto/response.dto.ts` - DTO de respuesta estándar
- `src/providers/database.providers.ts` - Provider de base de datos SQLite
- `src/providers/user.providers.ts` - Provider del repositorio User
- `src/configurations/configuration.ts` - Configuración de entorno
- `src/modules/user/user.service.ts` - Lógica de negocio
- `src/modules/user/user.controller.ts` - Controlador REST
- `src/app.module.ts` - Módulo principal
- `src/app.controller.ts` - Controlador raíz
- `src/app.service.ts` - Servicio raíz
- `src/main.ts` - Punto de entrada
- `src/helpers/cors.helper.ts` - Helper CORS
- `src/helpers/package-json.helper.ts` - Helper para package.json
- `src/helpers/swagger.helper.ts` - Helper Swagger
- `src/interceptors/response-format.interceptor.ts` - Interceptor de formato de respuesta

### Cliente HTTP con Retry y Circuit Breaker (`microservices/password/src/modules/user-client/`)
- `user-client.service.ts` - Servicio cliente HTTP con Retry y Circuit Breaker
- `user-client.module.ts` - Módulo del cliente HTTP

### Load Balancer NGINX (`infra/users-lb/`)
- `nginx.conf` - Configuración NGINX con upstream para 2 réplicas
- `Dockerfile` - Imagen Docker del Load Balancer

### Frontend (`frontend/`)
- `index.html` - Página HTML estática informativa
- `Dockerfile` - Imagen NGINX para servir el frontend

### Orquestación
- `docker-compose.yml` - Archivo de orquestación completo en la raíz

---

## 📝 Archivos Modificados

### Microservicio Password (`microservices/password/`)
1. **`src/entitys/password-manager.entity.ts`**
   - Agregado campo `userId: number` (obligatorio)

2. **`src/dto/password-manager.dto.ts`**
   - Agregado campo `userId: number` en `CreatePasswordManagerDto` (obligatorio)
   - Agregado campo `userId?: number` en `UpdatePasswordManagerDto` (opcional)
   - Agregado import `IsNumber` de class-validator

3. **`src/modules/password-manager/password-manager.service.ts`**
   - Inyectado `UserClientService` para validación de usuarios
   - Agregada validación de `userId` en método `save()` antes de crear contraseña
   - Agregada validación de `userId` en método `update()` si se actualiza el userId
   - Agregado método `findByUserId(userId: number)` para listar contraseñas por usuario
   - Actualizado campo `userId` en todas las consultas SELECT

4. **`src/modules/password-manager/password-manager.controller.ts`**
   - Agregado endpoint `GET /api/password-manager/user/:userId`

5. **`src/app.module.ts`**
   - Agregado `UserClientModule` en imports

6. **`src/configurations/configuration.ts`**
   - Agregada variable `USER_SERVICE_BASE_URL` con valor por defecto

7. **`src/providers/database.providers.ts`**
   - Actualizado para usar `DATABASE_PATH` desde variables de entorno

8. **`src/main.ts`**
   - Agregado `app.setGlobalPrefix('api')` para consistencia

9. **`package.json`**
   - Agregadas dependencias `@nestjs/axios` y `axios`

10. **`Dockerfile`**
    - Cambiado de `yarn` a `npm` para consistencia

---

## ✅ Cumplimiento de Requisitos

### 1. Definición de Microservicios A y B (Dominio)

#### ✅ Microservicio A: `users`
- **Ubicación:** `microservices/users/`
- **Dominio:** Gestión de usuarios
- **Base de datos:** SQLite independiente (`users.sqlite`)
- **Endpoints implementados:**
  - `GET /api/users` - Lista todos los usuarios
  - `GET /api/users/:id` - Obtiene usuario por ID
  - `GET /api/users/exists/:id` - Verifica existencia de usuario
  - `POST /api/users` - Crea nuevo usuario
  - `PUT /api/users/:id` - Actualiza usuario
  - `DELETE /api/users/:id` - Elimina usuario
- **Entidad User:** `id`, `email` (único), `name`, `status` (active/inactive), `createdAt`, `updatedAt`

#### ✅ Microservicio B: `password`
- **Ubicación:** `microservices/password/` (existente, modificado)
- **Dominio:** Gestión de contraseñas cifradas
- **Base de datos:** SQLite independiente (`password.sqlite`)
- **Campo agregado:** `userId` (number) en entidad `PasswordManager`
- **Endpoints actualizados:** Todos los endpoints ahora trabajan con `userId`
- **Nuevo endpoint:** `GET /api/password-manager/user/:userId` - Lista contraseñas por usuario

---

### 2. Comunicación entre Microservicios + Retry + Circuit Breaker

#### ✅ Cliente HTTP (`UserClientService`)
- **Ubicación:** `microservices/password/src/modules/user-client/user-client.service.ts`
- **Método principal:** `userExists(userId: number): Promise<boolean>`
- **Comunicación:** HTTP síncrona hacia el Load Balancer de users

#### ✅ Patrón Retry
- **Implementación:** Usando RxJS `retry()` y `timeout()`
- **Configuración:**
  - `timeout(2000)` - Timeout de 2 segundos
  - `retry({ count: 2, delay: 500 })` - 2 reintentos con delay de 500ms
- **Ubicación:** Líneas 95-100 en `user-client.service.ts`
- **Comentario:** `// PATRÓN RETRY: timeout de 2 segundos y retry de 2 intentos`

#### ✅ Patrón Circuit Breaker
- **Implementación:** Circuit Breaker en memoria con estados CLOSED, OPEN, HALF_OPEN
- **Configuración:**
  - Umbral de fallos: 5 fallos consecutivos
  - Tiempo de enfriamiento: 15 segundos (15000ms)
  - Estados: `CLOSED` (normal), `OPEN` (fallando), `HALF_OPEN` (probando recuperación)
- **Ubicación:** Líneas 15-80 en `user-client.service.ts`
- **Comentarios:**
  - `// Circuit Breaker Implementation` (línea 6)
  - `// Verifica el estado del Circuit Breaker` (línea 30)
  - `// Registra un fallo y actualiza el estado` (línea 45)
  - `// Registra un éxito y resetea el Circuit Breaker` (línea 60)
  - `// Si el circuito está abierto, fallar rápido` (línea 88)

#### ✅ Validación de Usuario
- **En `PasswordManagerService.save()`:** Valida `userId` antes de crear contraseña
- **En `PasswordManagerService.update()`:** Valida `userId` si se actualiza
- **En `PasswordManagerService.findByUserId()`:** Valida `userId` antes de listar
- **Errores:** Retorna 404 con mensaje claro si el usuario no existe

---

### 3. Réplicas y Load Balancer (NGINX)

#### ✅ Dos Réplicas de Users Service
- **`users-service-1`:** Puerto 3001 (host) → 3001 (container)
- **`users-service-2`:** Puerto 3002 (host) → 3001 (container)
- **Base de datos:** Cada réplica tiene su propia BD SQLite en volúmenes separados

#### ✅ Load Balancer NGINX
- **Ubicación:** `infra/users-lb/`
- **Configuración:** `nginx.conf` con upstream `users_service_cluster`
- **Puerto:** 8080 (host) → 80 (container)
- **Upstream:** Distribuye carga entre `users-service-1:3001` y `users-service-2:3001`
- **Proxy headers:** Configurados correctamente (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)

#### ✅ Configuración en Password Service
- **Variable de entorno:** `USER_SERVICE_BASE_URL=http://users-service-lb`
- **Todas las llamadas** desde `password-service` van a través del Load Balancer

---

### 4. Docker Compose de Todo el Sistema

#### ✅ Servicios Definidos
1. **`users-service-1`** - Réplica 1 del microservicio users
2. **`users-service-2`** - Réplica 2 del microservicio users
3. **`users-service-lb`** - Load Balancer NGINX para users
4. **`password-service`** - Microservicio de contraseñas
5. **`frontend`** - Frontend simple con NGINX

#### ✅ Características
- **Red:** `microservices-network` (bridge) para comunicación interna
- **Volúmenes:** 
  - `users-db-1` - Base de datos de users-service-1
  - `users-db-2` - Base de datos de users-service-2
  - `password-db` - Base de datos de password-service
- **Healthchecks:** Configurados para todos los servicios
- **Dependencias:** `depends_on` configurado correctamente
- **Variables de entorno:** Todas las configuraciones necesarias definidas

#### ✅ Ejecución
- **Comando:** `docker compose up -d` desde la raíz del proyecto
- **Sin pasos manuales:** Todo se levanta automáticamente
- **Puertos expuestos:**
  - Frontend: `http://localhost:8081`
  - Users LB: `http://localhost:8080`
  - Users Service 1: `http://localhost:3001`
  - Users Service 2: `http://localhost:3002`
  - Password Service: `http://localhost:3000`

---

### 5. Ajustes en Microservicio Password

#### ✅ Entidad `PasswordManager`
- Campo `userId: number` agregado (obligatorio)

#### ✅ DTOs
- `CreatePasswordManagerDto`: Campo `userId` obligatorio
- `UpdatePasswordManagerDto`: Campo `userId` opcional

#### ✅ Endpoints
- Todos los endpoints existentes funcionan con `userId`
- Nuevo endpoint: `GET /api/password-manager/user/:userId`

#### ✅ Validación
- Todas las operaciones que requieren `userId` validan la existencia del usuario
- Errores claros y amigables (404) si el usuario no existe

---

### 6. Calidad y Explicación

#### ✅ Código Limpio
- Estructura consistente con el proyecto existente
- Mismos patrones de organización (módulos, providers, DTOs)
- Comentarios claros indicando Retry y Circuit Breaker

#### ✅ Documentación
- Este archivo `IMPLEMENTACION.md` con resumen completo
- Comentarios en código indicando patrones implementados

---

## 🚀 Cómo Ejecutar

1. **Clonar/Descargar el repositorio**
2. **Ejecutar desde la raíz:**
   ```bash
   docker compose up -d
   ```
3. **Verificar servicios:**
   ```bash
   docker compose ps
   ```
4. **Acceder al frontend:**
   - Abrir navegador en `http://localhost:8081`
5. **Probar APIs:**
   - Users: `http://localhost:8080/api/users`
   - Password: `http://localhost:3000/api/password-manager`

---

## 📊 Arquitectura del Sistema

```
┌─────────────┐
│  Frontend   │ (Puerto 80)
│   (NGINX)   │
└─────────────┘
       │
       ├─────────────────────────────────┐
       │                                 │
┌──────▼──────────┐            ┌──────────▼──────────┐
│ Password Service│            │  Users Service LB   │ (Puerto 8080)
│   (Puerto 3000) │            │      (NGINX)       │
└──────┬──────────┘            └──────────┬──────────┘
       │                                 │
       │ HTTP (con Retry + CB)           │
       │                                 │
       │                    ┌────────────┴────────────┐
       │                    │                         │
       │            ┌────────▼────────┐    ┌──────────▼──────────┐
       │            │ Users Service 1 │    │  Users Service 2   │
       │            │   (Puerto 3001) │    │   (Puerto 3001)    │
       │            └─────────────────┘    └────────────────────┘
       │                    │                         │
       │            ┌────────▼────────┐    ┌──────────▼──────────┐
       │            │  users-db-1     │    │    users-db-2      │
       │            │  (SQLite)       │    │    (SQLite)        │
       │            └─────────────────┘    └────────────────────┘
       │
       │
┌──────▼──────────┐
│  password-db    │
│   (SQLite)      │
└─────────────────┘
```

---

## 🎯 Patrones Implementados

1. **Separación por Dominio:** Users y Password como microservicios independientes
2. **Bounded Context:** Cada microservicio tiene su propia base de datos
3. **Comunicación Síncrona:** HTTP REST entre microservicios
4. **Retry Pattern:** Reintentos automáticos en llamadas HTTP fallidas
5. **Circuit Breaker:** Protección contra fallos en cascada
6. **Load Balancing:** Distribución de carga con NGINX
7. **Réplicas:** Dos instancias del microservicio users para alta disponibilidad
8. **Containerización:** Docker para todos los servicios
9. **Orquestación:** Docker Compose para gestión completa

---

## ✅ Checklist de Cumplimiento

- [x] Microservicio A (users) creado con CRUD completo
- [x] Microservicio B (password) modificado con userId
- [x] Bases de datos SQLite independientes
- [x] Comunicación HTTP síncrona entre servicios
- [x] Patrón Retry implementado (2 reintentos, timeout 2s)
- [x] Patrón Circuit Breaker implementado (5 fallos, 15s cooldown)
- [x] Load Balancer NGINX configurado
- [x] Dos réplicas de users-service
- [x] Docker Compose completo
- [x] Frontend simple incluido
- [x] Validación de userId en todas las operaciones
- [x] Documentación completa

---

**Fecha de Implementación:** 2024
**Autor:** Implementación para Práctica #1 - Microservicios

