# Tests - Microservicios

Este directorio contiene archivos de pruebas para demostrar el cumplimiento de las prácticas de microservicios.

## Archivos Disponibles

### `practica1.http`
Archivo de pruebas para el plugin **REST Client** de VS Code (`humao.rest-client`).
Demuestra la Práctica #1: Comunicación síncrona HTTP, Load Balancer, Retry y Circuit Breaker.

### `practica2.http`
Archivo de pruebas para el plugin **REST Client** de VS Code (`humao.rest-client`).
Demuestra la Práctica #2: Comunicación asíncrona con Kafka, Event-Driven Architecture y Eventual Consistency.

## Cómo Usar

### Opción 1: REST Client (VS Code) - Recomendado

1. **Instalar la extensión REST Client en VS Code:**
   - Abrir VS Code
   - Ir a Extensiones (Ctrl+Shift+X)
   - Buscar "REST Client" por Huachao Mao
   - Instalar

2. **Abrir el archivo de pruebas:**
   ```bash
   tests/practica1.http
   ```

3. **Asegurarse de que los servicios estén corriendo:**
   ```bash
   docker compose up -d
   ```

4. **Ejecutar las pruebas:**
   - Cada request tiene un botón "Send Request" arriba de la línea
   - Hacer clic en "Send Request" para ejecutar cada prueba
   - Los resultados se mostrarán en una nueva pestaña

### Opción 2: Postman / Thunder Client

1. **Importar el archivo:**
   - Abrir Postman o Thunder Client
   - Importar el archivo `practica1.http`
   - Ajustar las variables de entorno si es necesario

2. **Configurar variables de entorno:**
   - `usersBaseUrl`: `http://localhost:8080/api/users`
   - `passwordBaseUrl`: `http://localhost:3000/api/password-manager`

## Estructura de las Pruebas

### Práctica #1 (`practica1.http`)

El archivo está organizado en secciones:

1. **Health Checks**: Verificación de que los servicios están activos
2. **Microservicio Users**: CRUD completo de usuarios
3. **Load Balancer**: Demostración de distribución de carga
4. **Microservicio Password**: CRUD completo de contraseñas
5. **Flujo Completo**: Secuencia de operaciones que demuestra el sistema completo
6. **Pruebas de Resiliencia**: Notas sobre cómo probar Retry y Circuit Breaker

### Práctica #2 (`practica2.http`)

El archivo está organizado en secciones:

1. **Health Checks**: Verificación de que todos los servicios están funcionando
2. **Estado Inicial del Cache**: Verificar que el cache local está vacío
3. **Kafka Producer**: Demostrar que users-service publica eventos (USER_CREATED, USER_UPDATED, USER_DELETED)
4. **Eventual Consistency**: Demostrar que password-service consume eventos y actualiza cache local
5. **Evento USER_DELETED**: Verificar que la eliminación se propaga mediante Kafka
6. **Fallback HTTP Síncrono**: Demostrar el patrón híbrido (cache + HTTP)
7. **Verificación Final**: Estado completo del sistema

## Flujo Recomendado para Demostración

### Práctica #1

1. Ejecutar Health Checks (sección 1)
2. Crear usuarios (sección 2.1-2.3)
3. Listar usuarios (sección 2.4)
4. Demostrar Load Balancer (sección 3)
5. Crear contraseñas (sección 4.2-4.4)
6. **Demostrar validación de userId** (sección 4.5 - debe fallar)
7. Listar contraseñas por usuario (sección 4.7)
8. **Demostrar validación de userId en listado** (sección 4.9 - debe fallar)
9. Descifrar contraseña (sección 4.12)
10. Flujo completo (sección 5)

### Práctica #2

1. Ejecutar Health Checks (sección 1)
2. Verificar estado inicial del cache (sección 2 - debe estar vacío)
3. Crear Usuario 1 y verificar que aparece en cache (sección 3.1-3.2)
   - **Esperar 2-3 segundos** después de crear el usuario para que Kafka procese el evento
4. Crear Usuario 2 y verificar cache (sección 3.3)
5. Actualizar Usuario 1 y verificar actualización en cache (sección 3.4)
6. Crear passwords usando cache local (sección 4 - eventual consistency)
7. Eliminar Usuario 2 y verificar eliminación en cache (sección 5)
8. Demostrar fallback HTTP síncrono (sección 6)
9. Verificación final del estado (sección 7)

**IMPORTANTE**: Los eventos de Kafka pueden tardar 1-3 segundos en procesarse. Espera unos segundos después de crear/actualizar/eliminar usuarios antes de verificar el cache.

## Notas Importantes

### Práctica #1

- **Variables**: Las variables están definidas al inicio del archivo. Asegúrate de que los servicios estén corriendo en los puertos correctos.
- **CORS**: Si hay problemas de CORS desde el navegador, las pruebas desde REST Client no deberían tener problemas.
- **Orden de ejecución**: Algunas pruebas dependen de datos creados en pruebas anteriores. Ejecuta las pruebas en orden para mejores resultados.
- **Validación de userId**: Las pruebas 4.5 y 4.9 demuestran que el servicio Password valida la existencia del usuario antes de realizar operaciones.

### Práctica #2

- **Kafka debe estar corriendo**: Asegúrate de que Kafka, Zookeeper y kafka-init estén funcionando (`docker compose ps`)
- **Tiempo de procesamiento**: Los eventos de Kafka pueden tardar 1-3 segundos en procesarse. Espera unos segundos después de crear/actualizar/eliminar usuarios antes de verificar el cache.
- **Eventual Consistency**: El cache local se actualiza de forma asíncrona mediante eventos. No es inmediato, pero es eventualmente consistente.
- **Patrón Híbrido**: Si un usuario no está en cache, password-service hace fallback a validación HTTP síncrona (comportamiento híbrido).
- **Logs de Kafka**: Para ver los logs de eventos, ejecuta:
  ```bash
  docker compose logs users-service-1 | grep Kafka
  docker compose logs password-service | grep Kafka
  ```

## Solución de Problemas

### Error: "ECONNREFUSED"
- Verificar que los servicios estén corriendo: `docker compose ps`
- Verificar que los puertos no estén ocupados

### Error: "404 Not Found"
- Verificar que el endpoint existe en el controlador
- Verificar que el prefijo `/api` esté configurado correctamente

### Error: "400 Bad Request"
- Verificar que el body del request tenga todos los campos requeridos
- Verificar que los tipos de datos sean correctos (userId debe ser número)

### Error: "Usuario no existe"
- Esto es esperado en las pruebas 4.5 y 4.9
- Demuestra que la validación entre microservicios funciona correctamente

