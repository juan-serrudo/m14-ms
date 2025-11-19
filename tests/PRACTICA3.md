# Pruebas REST Client - Práctica #3

Este directorio contiene archivos de prueba para el plugin **REST Client** de VS Code (extensión `humao.rest-client`).

## Requisitos Previos

1. **Instalar la extensión REST Client en VS Code:**
   - Buscar: `REST Client` (por Huachao Mao)
   - ID: `humao.rest-client`

2. **Iniciar la infraestructura:**
   ```bash
   docker compose up
   ```
   Asegúrate de que todos los servicios estén corriendo:
   - Keycloak (puerto 8090)
   - users-service-lb (puerto 8080)
   - password-service (puerto 3000)

## Archivos Disponibles

### `practica3-auth.http`

Archivo principal con todas las pruebas de autenticación servicio a servicio. Incluye:

1. **Obtención de tokens desde Keycloak**
   - Token para `password-service` (cliente)
   - Token para `users-service` (servidor)
   - Pruebas con credenciales inválidas

2. **Health Checks**
   - Verificación de que los endpoints `/health` no requieren autenticación

3. **Pruebas de Autenticación en users-service**
   - Acceso sin token (debe fallar con 401)
   - Acceso con token inválido (debe fallar con 401)
   - Acceso con token válido (debe funcionar con 200)

4. **Flujo Completo Servicio a Servicio**
   - Simulación del comportamiento real: `password-service` → `users-service`
   - Demostración de que `password-service` obtiene tokens automáticamente

5. **Pruebas de Tokens Manipulados/Inválidos**
   - Tokens con formato incorrecto
   - Tokens expirados (simulados)

6. **Verificación Técnica (Opcional)**
   - JWKS (claves públicas de Keycloak)
   - Información del realm

## Cómo Usar

### Opción 1: Ejecutar Pruebas Individuales

1. Abre el archivo `practica3-auth.http` en VS Code
2. Verás botones "Send Request" sobre cada petición HTTP
3. Haz clic en el botón para ejecutar la petición
4. El resultado aparecerá en una nueva pestaña

### Opción 2: Ejecutar Todas las Pruebas en Orden

1. Abre el archivo `practica3-auth.http`
2. Usa la sección **"8. RESUMEN DE PRUEBAS PARA DEFENSA"**
3. Ejecuta cada prueba en orden (PASO 1, PASO 2, PASO 3, PASO 4)
4. Verifica que los resultados coincidan con los esperados

### Opción 3: Usar Variables de Entorno

Las variables están definidas al inicio del archivo. Puedes modificarlas si tus puertos son diferentes:

```http
@keycloak_port = 8090
@users_service_url = http://localhost:8080
@password_service_url = http://localhost:3000
```

## Pruebas Clave para la Defensa

### ✅ Prueba 1: Sin Autenticación (Debe Fallar)

```http
GET {{users_service_url}}/api/users
```

**Resultado Esperado:** `401 Unauthorized`

**Evidencia:** Demuestra que `users-service` requiere autenticación.

---

### ✅ Prueba 2: Obtener Token desde Keycloak

```http
POST {{keycloak_url}}/realms/{{realm}}/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={{client_id_password}}&client_secret={{client_secret_password}}
```

**Resultado Esperado:** `200 OK` con `access_token` en el body

**Evidencia:** Demuestra que Keycloak funciona y emite tokens OAuth2.

---

### ✅ Prueba 3: Con Autenticación (Debe Funcionar)

```http
GET {{users_service_url}}/api/users
Authorization: Bearer {{access_token}}
```

**Resultado Esperado:** `200 OK` con lista de usuarios

**Evidencia:** Demuestra que la autenticación funciona correctamente.

---

### ✅ Prueba 4: Flujo Completo Servicio a Servicio

```http
POST {{password_service_url}}/api/password-manager
Content-Type: application/json

{
  "title": "Prueba",
  "password": "test123",
  "masterKey": "master123",
  "userId": 1,
  "category": "Test"
}
```

**Resultado Esperado:** `200 OK` o `404` (si el usuario no existe)

**Evidencia:** Demuestra que `password-service`:
- Obtiene token automáticamente desde Keycloak
- Incluye el token en la llamada a `users-service`
- `users-service` valida el token y responde

---

## Interpretación de Resultados

### Códigos de Estado HTTP

- **200 OK**: Petición exitosa con autenticación válida
- **401 Unauthorized**: Token faltante, inválido o expirado
- **403 Forbidden**: Token válido pero sin permisos (no aplica en este caso)
- **404 Not Found**: Recurso no encontrado (normal si no hay datos)
- **500 Internal Server Error**: Error en el servidor (revisar logs)

### Respuestas de Keycloak

- **200 OK**: Token obtenido exitosamente
  ```json
  {
    "access_token": "eyJhbGc...",
    "expires_in": 300,
    "token_type": "Bearer"
  }
  ```
- **401 Unauthorized**: Credenciales inválidas
  ```json
  {
    "error": "invalid_client",
    "error_description": "Invalid client credentials"
  }
  ```

## Troubleshooting

### Error: "Cannot connect to server"

- Verifica que `docker compose up` esté ejecutándose
- Verifica que los puertos no estén ocupados:
  ```bash
  netstat -tuln | grep -E '8090|8080|3000'
  ```

### Error: "401 Unauthorized" cuando debería funcionar

- Verifica que el token no haya expirado (tokens expiran en 5 minutos por defecto)
- Obtén un nuevo token ejecutando la prueba 2.1 nuevamente
- Verifica que el `client_secret` sea correcto

### Error: "Token inválido" pero el token parece correcto

- Verifica que Keycloak esté completamente iniciado (puede tardar 1-2 minutos)
- Revisa los logs de Keycloak: `docker logs keycloak`
- Verifica que el realm `microservices-realm` se haya importado correctamente

## Notas Adicionales

- Los tokens tienen una vida útil limitada (configurado en Keycloak, por defecto 5 minutos)
- El plugin REST Client guarda automáticamente las variables globales (como `access_token`) entre peticiones
- Puedes ver el token completo en la respuesta de Keycloak para inspección manual
- Para pruebas más avanzadas, puedes decodificar el JWT en https://jwt.io

## Referencias

- [REST Client Extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OAuth2 Client Credentials Flow](https://oauth.net/2/grant-types/client-credentials/)

