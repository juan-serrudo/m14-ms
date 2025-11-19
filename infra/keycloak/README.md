# Configuración de Keycloak

Este directorio contiene la configuración automática de Keycloak para la Práctica #3.

## Archivos

- `realm-export.json`: Exportación del realm `microservices-realm` con los clientes OAuth2 configurados.

## Configuración Automática

Keycloak se configura automáticamente al iniciar usando el comando `start-dev --import-realm`.

El archivo `realm-export.json` se monta en `/opt/keycloak/data/import/realm-export.json` y Keycloak lo importa automáticamente al arrancar.

## Realm y Clientes Configurados

### Realm
- **Nombre**: `microservices-realm`

### Clientes OAuth2

#### 1. `password-service`
- **Client ID**: `password-service`
- **Client Secret**: `password-service-secret-12345`
- **Service Accounts**: Habilitado
- **Grant Types**: `client_credentials`

#### 2. `users-service`
- **Client ID**: `users-service`
- **Client Secret**: `users-service-secret-12345`
- **Service Accounts**: Habilitado
- **Grant Types**: `client_credentials`

## Verificación

Para verificar que el realm se importó correctamente:

1. Acceder a la consola de administración de Keycloak:
   - URL: http://localhost:8090
   - Usuario: `admin`
   - Contraseña: `admin`

2. Seleccionar el realm `microservices-realm` en el dropdown superior izquierdo.

3. Verificar que los clientes `password-service` y `users-service` existen en:
   - **Clients** → Ver lista de clientes

4. Verificar que los client scopes `users.read` y `users.write` existen en:
   - **Client scopes** → Ver lista de scopes

## Notas

- Los `client_secret` están hardcodeados en este archivo para facilitar la configuración automática.
- En producción, estos secrets deberían ser generados automáticamente y almacenados de forma segura.
- El realm se importa automáticamente solo si Keycloak se inicia en modo desarrollo (`start-dev`).

