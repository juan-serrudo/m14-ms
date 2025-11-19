# Tests - Práctica #1 Microservicios

Este directorio contiene archivos de pruebas para demostrar el cumplimiento de la Práctica #1.

## Archivos Disponibles

### `practica1.http`
Archivo de pruebas para el plugin **REST Client** de VS Code (`humao.rest-client`).

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

El archivo `practica1.http` está organizado en secciones:

1. **Health Checks**: Verificación de que los servicios están activos
2. **Microservicio Users**: CRUD completo de usuarios
3. **Load Balancer**: Demostración de distribución de carga
4. **Microservicio Password**: CRUD completo de contraseñas
5. **Flujo Completo**: Secuencia de operaciones que demuestra el sistema completo
6. **Pruebas de Resiliencia**: Notas sobre cómo probar Retry y Circuit Breaker

## Flujo Recomendado para Demostración

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

## Notas Importantes

- **Variables**: Las variables están definidas al inicio del archivo. Asegúrate de que los servicios estén corriendo en los puertos correctos.
- **CORS**: Si hay problemas de CORS desde el navegador, las pruebas desde REST Client no deberían tener problemas.
- **Orden de ejecución**: Algunas pruebas dependen de datos creados en pruebas anteriores. Ejecuta las pruebas en orden para mejores resultados.
- **Validación de userId**: Las pruebas 4.5 y 4.9 demuestran que el servicio Password valida la existencia del usuario antes de realizar operaciones.

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

