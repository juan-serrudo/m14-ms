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
- 2 réplicas del microservicio `users`
- 1 Load Balancer NGINX para `users`
- 1 microservicio `password`
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

### Frontend
- URL: `http://localhost:8081`

## 🏗️ Arquitectura

```
Frontend (Puerto 80)
    │
    ├── Password Service (Puerto 3000)
    │       │
    │       └── Users Service LB (Puerto 8080)
    │               │
    │               ├── Users Service 1 (Puerto 3001)
    │               └── Users Service 2 (Puerto 3001)
```

## 📋 Características Implementadas

- ✅ Separación por dominio (Users y Password)
- ✅ Comunicación síncrona HTTP entre microservicios
- ✅ Patrón Retry (2 reintentos, timeout 2s)
- ✅ Patrón Circuit Breaker (umbral: 5 fallos, cooldown: 15s)
- ✅ Load Balancer NGINX con 2 réplicas
- ✅ Bases de datos SQLite independientes
- ✅ Docker Compose para orquestación completa


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

