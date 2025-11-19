# Migración de Base de Datos - Réplicas Compartidas

## Problema Resuelto

Anteriormente, las réplicas `users-service-1` y `users-service-2` tenían bases de datos SQLite separadas (`users-db-1` y `users-db-2`), lo que causaba que los datos no se compartieran entre réplicas cuando el Load Balancer enrutaba las peticiones.

## Solución Implementada

Ahora ambas réplicas comparten el mismo volumen `users-db`, montado en `/app/data`, lo que permite que ambas vean la misma base de datos SQLite (`users.sqlite`).

### Cambios Realizados

1. **docker-compose.yml**:
   - `users-service-1` y `users-service-2` ahora montan el mismo volumen `users-db:/app/data`
   - Eliminados los volúmenes separados `users-db-1` y `users-db-2`
   - Agregados comentarios explicativos en la configuración

2. **password-service**:
   - Ya estaba correctamente configurado con un único volumen `password-db`
   - Agregados comentarios para futuras réplicas

## Migración de Datos Existentes

Si ya tienes datos en las bases de datos anteriores, sigue estos pasos:

### Opción 1: Empezar desde cero (Recomendado para práctica/demo)

```bash
# Detener servicios
docker compose down

# Eliminar volúmenes antiguos (esto borrará los datos)
docker volume rm m14-ms_users-db-1 m14-ms_users-db-2

# Levantar servicios con la nueva configuración
docker compose up -d
```

### Opción 2: Migrar datos de una réplica (si necesitas conservar datos)

Si necesitas conservar los datos de una de las réplicas:

```bash
# 1. Detener servicios
docker compose down

# 2. Crear el nuevo volumen compartido
docker volume create m14-ms_users-db

# 3. Copiar datos de una réplica (ejemplo: desde users-db-1)
docker run --rm \
  -v m14-ms_users-db-1:/source \
  -v m14-ms_users-db:/dest \
  alpine sh -c "cp -r /source/* /dest/"

# 4. Levantar servicios con la nueva configuración
docker compose up -d

# 5. (Opcional) Eliminar volúmenes antiguos después de verificar
docker volume rm m14-ms_users-db-1 m14-ms_users-db-2
```

## Verificación

Después de aplicar los cambios:

1. **Levantar servicios:**
   ```bash
   docker compose up -d
   ```

2. **Crear un usuario a través del Load Balancer:**
   ```bash
   curl -X POST http://localhost:8080/api/users \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test User","status":"active"}'
   ```

3. **Verificar que el usuario es visible desde ambas réplicas:**
   ```bash
   # Desde réplica 1
   curl http://localhost:3001/api/users
   
   # Desde réplica 2
   curl http://localhost:3002/api/users
   
   # Desde Load Balancer (puede ir a cualquiera de las dos)
   curl http://localhost:8080/api/users
   ```

   Todos deberían mostrar el mismo usuario creado.

## Consideraciones Importantes

### SQLite y Concurrencia

SQLite maneja bien la lectura concurrente, pero puede tener limitaciones con escrituras concurrentes en alto tráfico. Para una práctica/demo esto es suficiente, pero en producción con alto tráfico se recomendaría:

- Usar una base de datos más robusta (PostgreSQL, MySQL)
- Implementar un sistema de archivos compartido con bloqueo adecuado
- Usar un volumen NFS o similar para mejor rendimiento

### Para Futuras Réplicas de Password

Si en el futuro añades réplicas de `password-service`, simplemente:

1. Duplica la configuración de `password-service` como `password-service-2`
2. Asegúrate de que ambas monten el mismo volumen `password-db:/app/data`
3. Configura un Load Balancer similar al de `users-service-lb`

Ejemplo:
```yaml
password-service-1:
  ...
  volumes:
    - password-db:/app/data

password-service-2:
  ...
  volumes:
    - password-db:/app/data
```

## Estructura Final de Volúmenes

```
volumes:
  users-db:        # Compartido por users-service-1 y users-service-2
  password-db:     # Único para password-service (listo para futuras réplicas)
```

