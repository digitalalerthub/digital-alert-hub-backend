# Guia de Pruebas del Proyecto

## Objetivo

Este documento explica como estan organizadas las pruebas actuales de Digital Alert Hub, que cubren hoy, como ejecutarlas y que limites siguen existiendo. El alcance incluye backend y frontend.

## Stack de pruebas

### Backend

- Framework: Vitest
- Entorno: `node`
- Patron de archivos: `tests/**/*.test.ts`
- Configuracion: [`vitest.config.ts`](../vitest.config.ts)

### Frontend

- Framework: Vitest
- Entorno: `jsdom`
- Setup adicional: [`src/test/setup.ts`](../../digital-alert-hub-frontend/src/test/setup.ts)
- Configuracion: [`vite.config.ts`](../../digital-alert-hub-frontend/vite.config.ts)

## Comandos principales

### Backend

Desde [`digital-alert-hub-backend`](../README.md):

```bash
npm test
npm run test:watch
```

Para ejecutar un archivo concreto:

```bash
npm test -- tests/authService.test.ts
```

### Frontend

Desde [`digital-alert-hub-frontend`](../../digital-alert-hub-frontend/README.md):

```bash
npm test
npm run test:watch
```

Para ejecutar un archivo concreto:

```bash
npm test -- src/pages/Auth/Callback.test.tsx
```

## Cobertura funcional actual

## Backend

La suite del backend valida principalmente logica de negocio, middleware y endurecimiento de seguridad.

### 1. Salud de la aplicacion y configuracion base

Archivo: [`tests/app.test.ts`](../tests/app.test.ts)

Valida:

- `GET /` y `GET /health`
- exposicion del spec OpenAPI
- CSP compatible con Swagger UI
- allowlist de CORS
- proteccion CSRF basada en `Origin` para requests autenticados por cookie
- resolucion de configuracion de seguridad

### 2. CRUD de alertas

Archivo: [`tests/alertCrud.test.ts`](../tests/alertCrud.test.ts)

Valida:

- listado de alertas
- detalle por id
- creacion con evidencias e historial
- actualizacion cuando el propietario tiene permiso
- rechazo de actualizacion o borrado sin permisos
- eliminacion de alertas pendientes por el propietario

### 3. Autenticacion y seguridad de sesion

Archivos:

- [`tests/authService.test.ts`](../tests/authService.test.ts)
- [`tests/authMiddleware.test.ts`](../tests/authMiddleware.test.ts)
- [`tests/authSessionService.test.ts`](../tests/authSessionService.test.ts)

Valida:

- registro publico con rol ciudadano forzado
- reCAPTCHA en flujos sensibles
- mensajes genericos para reducir enumeracion
- enlaces de recuperacion no reutilizables
- canje de codigo temporal de Google
- rehidratacion del rol actual desde base de datos
- rechazo de sesiones revocadas
- revocacion efectiva en logout por `session_version`

### 4. Perfil y ciclo de vida de cuenta

Archivo: [`tests/profileService.test.ts`](../tests/profileService.test.ts)

Valida:

- cambio de contrasena exigiendo contrasena actual
- eliminacion de dependencias antes de borrar cuenta

### 5. Evidencias y carga de archivos

Archivo: [`tests/alertEvidenceService.test.ts`](../tests/alertEvidenceService.test.ts)

Valida:

- deteccion de firmas JPEG, PNG y WEBP
- rechazo de archivos con firma binaria invalida

### 6. Validaciones, roles y rate limiting

Archivos:

- [`tests/userValidation.test.ts`](../tests/userValidation.test.ts)
- [`tests/roleMiddleware.test.ts`](../tests/roleMiddleware.test.ts)
- [`tests/rateLimitMiddleware.test.ts`](../tests/rateLimitMiddleware.test.ts)
- [`tests/userAdminService.test.ts`](../tests/userAdminService.test.ts)

Valida:

- normalizacion y validacion de email, telefono y contrasena
- control de acceso por rol administrador
- limitacion de intentos por IP
- creacion de usuarios desde administracion y envio de activacion

## Frontend

La suite del frontend valida principalmente comportamientos criticos de autenticacion, rutas y formularios.

### 1. Callback de autenticacion

Archivo: [`src/pages/Auth/Callback.test.tsx`](../../digital-alert-hub-frontend/src/pages/Auth/Callback.test.tsx)

Valida:

- sincronizacion del contexto antes de redirigir al panel principal
- manejo de callback sin codigo valido

### 2. Reset de contrasena

Archivo: [`src/pages/Auth/ResetPasswordPage.test.tsx`](../../digital-alert-hub-frontend/src/pages/Auth/ResetPasswordPage.test.tsx)

Valida:

- bloqueo de envio con contrasena invalida
- envio correcto cuando el formulario es valido

### 3. Proteccion de rutas por rol

Archivo: [`src/components/Route/RoleRoute.test.tsx`](../../digital-alert-hub-frontend/src/components/Route/RoleRoute.test.tsx)

Valida:

- acceso permitido con rol valido
- redireccion cuando no hay sesion
- redireccion cuando el rol no esta autorizado

### 4. Validacion de redirecciones internas

Archivo: [`src/utils/navigation.test.ts`](../../digital-alert-hub-frontend/src/utils/navigation.test.ts)

Valida:

- aceptacion de rutas internas validas
- rechazo de valores vacios
- rechazo de redirects externos o ambiguos
- rechazo de backslashes y saltos de linea

### 5. Validacion basica de UI administrativa

Archivo: [`src/components/Admin/UserModal.test.tsx`](../../digital-alert-hub-frontend/src/components/Admin/UserModal.test.tsx)

Valida:

- cierre del modal
- errores de validacion antes del envio

## Que si demuestran estas pruebas

- Que los flujos mas sensibles de autenticacion y recuperacion tienen regresion automatizada.
- Que el backend ya valida varios controles de seguridad incorporados en el endurecimiento reciente.
- Que el frontend cubre partes criticas del flujo de callback, control de acceso y saneamiento de redirects.

## Que no demuestran por si solas

- No equivalen a una prueba de penetracion completa.
- No miden cobertura porcentual automatica porque hoy no existe un script de `coverage`.
- No validan rendimiento, carga o resiliencia bajo trafico real.
- No sustituyen pruebas manuales del flujo completo con servicios externos reales como Google OAuth, Maps, reCAPTCHA, Cloudinary o correo.

## Recomendaciones de uso en el equipo

### Antes de abrir un Pull Request

- Ejecutar `npm test` en el repositorio afectado
- Ejecutar `npm run build`
- Si el cambio toca autenticacion, seguridad o permisos, correr tambien las suites relacionadas del otro repositorio

### En cambios de seguridad

Minimo recomendado en backend:

```bash
npm test -- tests/app.test.ts tests/authService.test.ts tests/authMiddleware.test.ts tests/authSessionService.test.ts tests/profileService.test.ts
```

Minimo recomendado en frontend:

```bash
npm test -- src/pages/Auth/Callback.test.tsx src/utils/navigation.test.ts src/components/Route/RoleRoute.test.tsx
```

## Brechas actuales y siguientes mejoras

- Añadir script de cobertura con reporte HTML o texto.
- Integrar ejecucion de pruebas en CI.
- Incorporar pruebas E2E para login, logout, recuperacion de contrasena y creacion de alertas.
- Añadir pruebas de integracion para reportes y flujos de subida de evidencia en frontend.
- Documentar una matriz minima de pruebas manuales por release.

## Conclusion

El proyecto ya cuenta con una base de pruebas automatizadas util y enfocada en los flujos mas sensibles, especialmente en backend. La cobertura actual es suficiente para detectar regresiones importantes en autenticacion, autorizacion, validaciones y varios controles de seguridad, pero todavia debe complementarse con cobertura formal, CI y pruebas E2E para considerarse una estrategia de testing madura.
