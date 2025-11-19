# Sistema de Microservicios

Sistema completo de microservicios implementado con NestJS, TypeORM, SQLite, Docker y Docker Compose.

## 🚀 Inicio Rápido

### Prerrequisitos
- Docker
- Docker Compose

### Ejecutar el Sistema

Desde la raíz del proyecto:

```bash
docker compose up -d
```

Esto levantará todos los servicios:
- **Infraestructura Kafka**: Zookeeper, Kafka Broker, Kafka Init
- 2 réplicas del microservicio `users` (con Kafka Producer)
- 1 Load Balancer NGINX para `users`
- 1 microservicio `password` (con Kafka Consumer)
- 1 frontend

### Verificar Servicios

```bash
docker compose ps
```

### Detener Servicios

```bash
docker compose down
```

### Ver Logs

```bash
docker compose logs -f [nombre-servicio]
```

## 📡 Endpoints Disponibles

### Microservicio Users (a través del Load Balancer)
- Base URL: `http://localhost:8080/api/users`
- `GET /api/users` - Lista todos los usuarios
- `GET /api/users/:id` - Obtiene usuario por ID
- `GET /api/users/exists/:id` - Verifica existencia de usuario
- `POST /api/users` - Crea nuevo usuario
- `PUT /api/users/:id` - Actualiza usuario
- `DELETE /api/users/:id` - Elimina usuario

### Microservicio Password
- Base URL: `http://localhost:3000/api/password-manager`
- `GET /api/password-manager` - Lista todas las contraseñas
- `GET /api/password-manager/:id` - Obtiene contraseña por ID
- `GET /api/password-manager/user/:userId` - Lista contraseñas por usuario
- `GET /api/password-manager/category/:category` - Lista por categoría
- `POST /api/password-manager` - Crea nueva contraseña (requiere `userId`)
- `PUT /api/password-manager/:id` - Actualiza contraseña
- `DELETE /api/password-manager/:id?masterKey=xxx` - Elimina contraseña
- `POST /api/password-manager/:id/decrypt` - Descifra contraseña
- `GET /api/user-cache/stats` - Estadísticas del cache local (eventual consistency)
- `GET /api/user-cache/users` - Lista usuarios en cache local

### Frontend
- URL: `http://localhost:8081`

## 🏗️ Arquitectura

```
Frontend (Puerto 8081)
    │
    ├── Password Service (Puerto 3000)
    │       │
    │       ├── Users Service LB (Puerto 8080) [HTTP Síncrono]
    │       │       │
    │       │       ├── Users Service 1 (Puerto 3001)
    │       │       └── Users Service 2 (Puerto 3001)
    │       │
    │       └── Kafka Consumer → User Cache (Eventual Consistency)
    │
    └── Kafka Broker
            │
            └── Users Service (Producer) → user-events topic
```

## 📋 Características Implementadas

### Práctica #1 - Comunicación Síncrona
- ✅ Separación por dominio (Users y Password)
- ✅ Comunicación síncrona HTTP entre microservicios
- ✅ Patrón Retry (2 reintentos, timeout 2s)
- ✅ Patrón Circuit Breaker (umbral: 5 fallos, cooldown: 15s)
- ✅ Load Balancer NGINX con 2 réplicas
- ✅ Bases de datos SQLite independientes
- ✅ Docker Compose para orquestación completa

### Práctica #2 - Comunicación Asíncrona con Kafka
- ✅ Infraestructura Kafka (Zookeeper + Broker + Init)
- ✅ Kafka Producer en users-service (publica eventos)
- ✅ Kafka Consumer en password-service (consume eventos)
- ✅ Cache local de usuarios (eventual consistency)
- ✅ Patrón híbrido: Cache local + Fallback HTTP
- ✅ Eventos: USER_CREATED, USER_UPDATED, USER_DELETED

## 🔧 Desarrollo Local

Para desarrollo local sin Docker:

### Microservicio Users
```bash
cd microservices/users
npm install
npm run start:dev
```

### Microservicio Password
```bash
cd microservices/password
npm install
npm run start:dev
```

## 📝 Notas

- Las bases de datos SQLite se crean automáticamente en `/app/data/` dentro de los contenedores
- Los volúmenes de Docker persisten las bases de datos entre reinicios
- El Load Balancer distribuye la carga entre las 2 réplicas de users-service usando round-robin
- Kafka topics se crean automáticamente al iniciar (kafka-init)
- El cache local de usuarios se actualiza mediante eventos de Kafka (eventual consistency)
- Si Kafka no está disponible, password-service usa validación HTTP como fallback

## 📚 Documentación

- `IMPLEMENTACION.md` - Detalles de la Práctica #1 (Comunicación Síncrona)
- `PRACTICA2.md` - Detalles de la Práctica #2 (Comunicación Asíncrona con Kafka)
- `PRACTICA3.md` - Detalles de la Práctica #3 (Autenticación Servicio a Servicio)
- `MIGRACION_BASE_DATOS.md` - Migración de bases de datos compartidas
- `tests/practica1.http` - Archivo de pruebas REST Client para Práctica #1
- `tests/practica2.http` - Archivo de pruebas REST Client para Práctica #2
- `tests/practica3.http` - Archivo de pruebas REST Client para Práctica #3

---

## ⚙️ Pruebas con REST Client para Defensa

### Requisitos

1. **VS Code** con la extensión **REST Client** (`humao.rest-client`)
2. **Docker Compose** instalado y funcionando

### Inicio Rápido para Defensa

```bash
# 1. Levantar toda la infraestructura
docker compose up --build

# 2. Esperar a que todos los servicios estén healthy
docker compose ps

# 3. Abrir VS Code en la carpeta del proyecto
code .
```

### Archivos de Prueba

Abrir en VS Code y ejecutar los requests con el botón "Send Request":

- **`tests/practica1.http`**: Demuestra separación por dominio, Load Balancer, comunicación síncrona HTTP
- **`tests/practica2.http`**: Demuestra comunicación asíncrona con Kafka, eventual consistency
- **`tests/practica3.http`**: Demuestra autenticación servicio a servicio con OAuth2/Keycloak

### Secuencia Recomendada para Defensa (3 minutos)

#### 1. Práctica #1 - Arquitectura (30 seg)
- Ejecutar: `practica1.http` → Request 2.1 (crear usuario) → Request 4.2 (crear password)
- **Comentar**: "Separación por dominio, cada servicio con su BD independiente"

#### 2. Práctica #2 - Kafka (30 seg)
- Ejecutar: `practica2.http` → Request 2.1 (cache vacío) → Request 3.1 (crear usuario) → Esperar 2-3 seg → Request 3.2 (cache actualizado)
- **Comentar**: "Kafka permite comunicación asíncrona, eventual consistency"

#### 3. Práctica #3 - Autenticación (2 min)
- Ejecutar: `practica3.http` → Request 4.1 (sin token → 401) → Request 2.1 (obtener token) → Request 4.4 (con token → 200) → Request 5.3 (flujo completo)
- **Comentar**: "Autenticación servicio a servicio con OAuth2, Zero Trust Architecture"

### Documentación Detallada

Para instrucciones detalladas sobre cómo usar REST Client en la defensa, ver:
- **`PRACTICA3.md`** - Sección "⚙️ Pruebas con REST Client para Defensa"

Cada archivo `.http` incluye:
- ✅ Comentarios explicativos sobre qué demuestra cada request
- ✅ Sección "RESUMEN PARA DEFENSA" con secuencia recomendada
- ✅ Variables de entorno para facilitar las pruebas

