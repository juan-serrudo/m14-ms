# Práctica #2 - Comunicación Asíncrona con Kafka

## Resumen de la Implementación

Esta práctica implementa comunicación asíncrona basada en eventos entre los microservicios `users` y `password` usando **Apache Kafka**, cumpliendo con los requisitos de la Práctica #2.

---

## 📁 Archivos Nuevos Creados

### Infraestructura Kafka
- `docker-compose.yml` (modificado) - Agregados servicios: `zookeeper`, `kafka-broker`, `kafka-init`

### Microservicio Users (Producer)
- `microservices/users/src/interfaces/user-events.interface.ts` - Interfaz de eventos de usuarios
- `microservices/users/src/modules/kafka/kafka.module.ts` - Módulo Kafka con producer
- `microservices/users/src/modules/kafka/kafka-producer.service.ts` - Servicio producer de Kafka

### Microservicio Password (Consumer)
- `microservices/password/src/interfaces/user-events.interface.ts` - Interfaz de eventos de usuarios
- `microservices/password/src/modules/kafka/kafka.module.ts` - Módulo Kafka con consumer
- `microservices/password/src/modules/kafka/kafka-consumer.service.ts` - Servicio consumer de Kafka
- `microservices/password/src/modules/user-cache/user-cache.service.ts` - Servicio de cache local
- `microservices/password/src/modules/user-cache/user-cache.module.ts` - Módulo de cache
- `microservices/password/src/modules/user-cache/user-cache.controller.ts` - Controlador para ver cache

---

## 📝 Archivos Modificados

### docker-compose.yml
- Agregados servicios: `zookeeper`, `kafka-broker`, `kafka-init`
- Agregadas variables de entorno Kafka a `users-service-1`, `users-service-2`, `password-service`
- Agregado `depends_on: kafka-init` a servicios que usan Kafka

### Microservicio Users
- `package.json` - Agregadas dependencias: `@nestjs/microservices`, `kafkajs`
- `src/configurations/configuration.ts` - Agregadas variables Kafka
- `src/app.module.ts` - Agregado `KafkaModule`
- `src/modules/user/user.service.ts` - Agregada publicación de eventos en `save()`, `update()`, `delete()`

### Microservicio Password
- `package.json` - Agregadas dependencias: `@nestjs/microservices`, `kafkajs`
- `src/configurations/configuration.ts` - Agregadas variables Kafka
- `src/app.module.ts` - Agregados `KafkaModule` y `UserCacheModule`
- `src/modules/password-manager/password-manager.service.ts` - Actualizado para usar cache local + fallback HTTP

---

## ✅ Cumplimiento de Requisitos

### 1. Infraestructura Kafka en docker-compose.yml

#### ✅ Servicios Kafka
- **Zookeeper**: `bitnami/zookeeper:3.9` - Coordinación de Kafka
- **Kafka Broker**: `bitnami/kafka:3.6` - Broker principal
- **Kafka Init**: Contenedor que crea topics al arrancar

#### ✅ Kafka Init
- Espera a que `kafka-broker` esté disponible (healthcheck)
- Crea topic `user-events` con 3 particiones y replication-factor 1
- Comando idempotente (no falla si el topic ya existe)

#### ✅ Configuración de Red
- Todos los servicios en `microservices-network`
- Kafka accesible como `kafka-broker:9092` desde los microservicios
- No expuesto al host (solo comunicación interna)

---

### 2. Integración Kafka en Microservicios

#### ✅ Microservicio Users (Producer)

**Dependencias:**
- `@nestjs/microservices` - Framework de microservicios de NestJS
- `kafkajs` - Cliente Kafka para Node.js

**Módulo Kafka:**
- `KafkaModule` con `ClientsModule` configurado para Kafka
- `KafkaProducerService` que implementa `OnModuleInit` y `OnModuleDestroy`

**Eventos Publicados:**
- `USER_CREATED` - Al crear un usuario
- `USER_UPDATED` - Al actualizar un usuario
- `USER_DELETED` - Al eliminar un usuario

**Configuración:**
- Variables de entorno: `KAFKA_BROKER`, `KAFKA_CLIENT_ID`, `KAFKA_USER_EVENTS_TOPIC`
- Retry automático para conexión a Kafka (10 intentos, 3s entre intentos)

#### ✅ Microservicio Password (Consumer)

**Dependencias:**
- `@nestjs/microservices` - Framework de microservicios de NestJS
- `kafkajs` - Cliente Kafka para Node.js

**Módulo Kafka:**
- `KafkaModule` con `KafkaConsumerService`
- `UserCacheModule` para mantener cache local de usuarios

**Eventos Consumidos:**
- `USER_CREATED` - Agrega usuario al cache local
- `USER_UPDATED` - Actualiza usuario en cache local
- `USER_DELETED` - Elimina usuario del cache local

**Configuración:**
- Variables de entorno: `KAFKA_BROKER`, `KAFKA_CLIENT_ID`, `KAFKA_USER_EVENTS_TOPIC`, `KAFKA_GROUP_ID`
- Retry automático para conexión a Kafka (10 intentos, 3s entre intentos)

---

### 3. Reemplazo/Complemento de Comunicación Síncrona

#### ✅ Patrón Híbrido: Eventual Consistency + Fallback HTTP

**Antes (Práctica #1):**
- Solo comunicación HTTP síncrona con Retry y Circuit Breaker

**Ahora (Práctica #2):**
- **Primera opción**: Cache local (eventual consistency desde Kafka)
- **Fallback**: Validación HTTP síncrona si no está en cache

**Beneficios:**
- Reduce llamadas HTTP innecesarias
- Demuestra eventual consistency
- Mantiene resiliencia con fallback HTTP
- Mejor rendimiento cuando el cache está actualizado

**Implementación:**
- `PasswordManagerService` primero consulta `UserCacheService`
- Si no encuentra, usa `UserClientService` (HTTP) como fallback
- Logs claros indicando qué método se usó

---

### 4. Docker Compose Completo

#### ✅ Todos los Servicios
- `zookeeper` - Coordinación Kafka
- `kafka-broker` - Broker Kafka
- `kafka-init` - Inicialización de topics
- `users-service-1` y `users-service-2` - Con Kafka producer
- `users-service-lb` - Load Balancer
- `password-service` - Con Kafka consumer
- `frontend` - Frontend simple

#### ✅ Orden de Inicio
- `zookeeper` → `kafka-broker` → `kafka-init` → servicios de aplicación
- `depends_on` configurado correctamente

#### ✅ Ejecución
- `docker compose up -d` desde la raíz levanta todo
- Sin pasos manuales adicionales

---

### 5. Eventual Consistency Demostrada

#### ✅ Cache Local de Usuarios
- `UserCacheService` mantiene un `Map<number, CachedUser>` en memoria
- Se actualiza mediante eventos de Kafka
- Endpoint `/api/user-cache/stats` para ver el estado del cache

#### ✅ Escenarios de Demostración

1. **Usuario creado en users-service:**
   - Se publica evento `USER_CREATED` en Kafka
   - `password-service` consume el evento
   - Usuario agregado al cache local
   - Próxima validación usa cache (rápido, sin HTTP)

2. **Usuario actualizado:**
   - Se publica evento `USER_UPDATED`
   - Cache se actualiza automáticamente

3. **Usuario eliminado:**
   - Se publica evento `USER_DELETED`
   - Cache se actualiza automáticamente

4. **Eventual Consistency:**
   - Si un usuario se crea pero el evento aún no llegó, se usa fallback HTTP
   - Logs indican "existe vía HTTP pero no en cache local (eventual consistency)"

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐
│  Zookeeper      │
└────────┬────────┘
         │
┌────────▼────────┐
│  Kafka Broker   │
│  (user-events)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼────┐
│Users  │  │Password│
│Service│  │Service │
│(Prod) │  │(Cons)  │
└───────┘  └────────┘
    │         │
    │         │
    │    ┌────▼──────────┐
    │    │ UserCache     │
    │    │ (Local)       │
    │    └───────────────┘
    │
┌───▼──────────┐
│ Load        │
│ Balancer    │
└─────────────┘
```

---

## 🚀 Cómo Ejecutar

1. **Levantar todos los servicios:**
   ```bash
   docker compose up -d
   ```

2. **Verificar que Kafka está funcionando:**
   ```bash
   docker compose logs kafka-init
   docker compose logs kafka-broker
   ```

3. **Verificar que los servicios se conectaron a Kafka:**
   ```bash
   docker compose logs users-service-1 | grep Kafka
   docker compose logs password-service | grep Kafka
   ```

4. **Probar el flujo completo:**
   - Crear un usuario: `POST http://localhost:8080/api/users`
   - Verificar cache: `GET http://localhost:3000/api/user-cache/stats`
   - Crear contraseña: `POST http://localhost:3000/api/password-manager` (debe usar cache)

---

## 📊 Flujo de Eventos

### Escenario 1: Crear Usuario y Contraseña

1. **Cliente** → `POST /api/users` → `users-service` (a través de LB)
2. **users-service** → Guarda usuario en BD → Publica `USER_CREATED` en Kafka
3. **Kafka** → Distribuye evento a consumers
4. **password-service** → Consume evento → Actualiza cache local
5. **Cliente** → `POST /api/password-manager` → `password-service`
6. **password-service** → Consulta cache local → Usuario encontrado → Crea contraseña

### Escenario 2: Eventual Consistency

1. **Cliente** → `POST /api/users` → `users-service`
2. **users-service** → Guarda usuario → Publica evento (puede tardar)
3. **Cliente** → `POST /api/password-manager` → `password-service` (inmediatamente)
4. **password-service** → Cache no tiene usuario → Fallback HTTP → Usuario existe → Crea contraseña
5. **Log**: "Usuario existe vía HTTP pero no en cache local (eventual consistency)"
6. **Evento llega** → Cache se actualiza → Próxima vez usa cache

---

## 🎯 Patrones Implementados

1. **Event-Driven Architecture**: Comunicación asíncrona basada en eventos
2. **Eventual Consistency**: Cache local que se sincroniza eventualmente
3. **Producer-Consumer**: Users produce, Password consume
4. **Degradación Elegante**: Si Kafka falla, se usa HTTP como fallback
5. **Retry Pattern**: Reintentos automáticos para conexión a Kafka

---

## 📝 Endpoints Nuevos

### Password Service
- `GET /api/user-cache/stats` - Estadísticas del cache local
- `GET /api/user-cache/users` - Lista usuarios en cache local

---

## ✅ Checklist de Cumplimiento

- [x] Infraestructura Kafka (Zookeeper + Broker + Init) en docker-compose.yml
- [x] Kafka producer en users-service
- [x] Kafka consumer en password-service
- [x] Eventos publicados: USER_CREATED, USER_UPDATED, USER_DELETED
- [x] Cache local de usuarios en password-service
- [x] Patrón híbrido: Cache local + Fallback HTTP
- [x] Eventual consistency demostrada
- [x] Variables de entorno configuradas
- [x] Retry para conexión a Kafka
- [x] Endpoints para ver estado del cache
- [x] Documentación completa

---

**Fecha de Implementación:** 2024
**Autor:** Implementación para Práctica #2 - Comunicación Asíncrona con Kafka

