# Documentacion de Despliegue

## 1. Objetivo

Este documento describe el despliegue vigente de Digital Alert Hub y reemplaza versiones antiguas que ya no reflejaban el flujo real de autenticacion ni la postura actual de seguridad.

## 2. Arquitectura

- Frontend: React + Vite, desplegado en Vercel.
- Backend: Express + TypeScript, desplegado en Render.
- Base de datos: PostgreSQL en Neon.
- Evidencias: Cloudinary.
- Email transaccional: Gmail API con fallback SMTP segun configuracion.

## 3. Principios de Despliegue

- El frontend y backend deben publicarse con configuraciones coherentes de dominios.
- La base de datos y las variables de entorno deben estar alineadas entre ambientes.
- La documentacion publica de la API no debe quedar expuesta en produccion salvo habilitacion explicita.
- La sesion no se maneja con `localStorage`; el despliegue actual usa cookie `HttpOnly`.

## 4. Variables de Entorno del Backend

La referencia minima vigente es `.env.example`.

Variables relevantes:

```env
PORT=
NODE_ENV=
DATABASE_URL=
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_SSL=
DB_SYNC=
DB_LOG_SQL=
JWT_SECRET=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_SECURE=
EMAIL_USER=
EMAIL_PASS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
FRONTEND_URL=
FRONTEND_URLS=
API_DOCS_ENABLED=
REQUEST_BODY_LIMIT=
SLOW_REQUEST_THRESHOLD_MS=
RESPONSE_TIMING_ENABLED=
GOOGLE_GMAIL_CLIENT_ID=
GOOGLE_GMAIL_CLIENT_SECRET=
GOOGLE_GMAIL_REFRESH_TOKEN=
GOOGLE_GMAIL_SENDER=
RECAPTCHA_SECRET_KEY=
AUTH_RATE_LIMIT_WINDOW_MS=
AUTH_LOGIN_RATE_LIMIT_MAX=
AUTH_REGISTER_RATE_LIMIT_MAX=
AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX=
AUTH_RESEND_VERIFICATION_RATE_LIMIT_MAX=
AUTH_RESET_PASSWORD_RATE_LIMIT_MAX=
AUTH_MAX_LOGIN_ATTEMPTS=
AUTH_LOGIN_LOCK_MINUTES=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 5. Variables de Entorno del Frontend

Las principales variables esperadas en el frontend son:

```env
VITE_API_URL=
VITE_RECAPTCHA_SITE_KEY=
VITE_GOOGLE_MAPS_API_KEY=
```

Notas:

- El frontend ya no necesita guardar ni leer JWT desde `localStorage`.
- El login con Google redirige al backend; no depende de un token expuesto en query string.

## 6. Despliegue del Backend en Render

### 6.1 Comandos esperados

- Build: `npm run build`
- Start: `npm start`

### 6.2 Requisitos

- `NODE_ENV=production`
- conexion valida a Neon
- `JWT_SECRET` robusto
- `FRONTEND_URL` o `FRONTEND_URLS` configurados con los dominios reales del frontend

### 6.3 CORS y cookies

El backend usa allowlist de origenes en `src/config/securityConfig.ts`.

Por tanto:

- `FRONTEND_URL` puede definir un origen principal,
- `FRONTEND_URLS` puede contener varios dominios separados por coma,
- el dominio del frontend en Vercel debe coincidir exactamente, sin errores de barra final o subdominio.

### 6.4 Documentacion API

`/api/docs` queda deshabilitado por defecto en produccion.

Si se requiere habilitarlo temporalmente:

```env
API_DOCS_ENABLED=true
```

No debe dejarse activo sin una razon clara.

## 7. Despliegue del Frontend en Vercel

### 7.1 Build esperado

- Build: `npm run build`

### 7.2 Configuracion vigente

El archivo `vercel.json` debe:

- publicar `dist`,
- resolver rutas SPA hacia `index.html`,
- y aplicar headers de seguridad, incluida CSP.

### 7.3 Seguridad del frontend

El despliegue actual incorpora:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`

Esto es parte del baseline de seguridad del frontend y no debe eliminarse sin evaluacion previa.

## 8. Flujo de Autenticacion Desplegado

### 8.1 Login local

1. El frontend envia credenciales a `POST /api/auth/login`.
2. El backend valida usuario, estado, correo verificado y captcha.
3. El backend emite una cookie `HttpOnly`.
4. El frontend consulta `/api/auth/session` para hidratar contexto.

### 8.2 Login con Google

1. El frontend redirige al backend en `/api/auth/google`.
2. Google vuelve al callback del backend.
3. El backend emite un codigo temporal de un solo uso.
4. El frontend recibe `code` en `/auth/callback`.
5. El frontend lo canjea en `POST /api/auth/google/exchange`.
6. El backend responde fijando la cookie de sesion.

Importante:

- ya no se usa `?token=` en la URL,
- ya no se persiste el token en `localStorage`.

### 8.3 Logout

1. El frontend llama `POST /api/auth/logout`.
2. El backend revoca la version de sesion del usuario.
3. El backend limpia la cookie.
4. Cualquier token emitido con la version anterior deja de ser valido.

## 9. Base de Datos

El backend incluye validaciones de esquema al iniciar y puede agregar columnas de autenticacion si faltan.

Campos relevantes ya soportados:

- `email_verificado`
- `password_action_version`
- `oauth_login_version`
- `session_version`
- `intentos_fallidos`
- `bloqueo_hasta`

Recomendacion:

- no confiar en `sequelize.sync` como estrategia principal de despliegue en ambientes compartidos,
- usar el arranque controlado del backend y validar logs de esquema.

## 10. Checklist de Despliegue

### Backend

- Confirmar que Render usa el branch o commit esperado.
- Confirmar variables completas y actualizadas.
- Confirmar acceso a Neon.
- Confirmar `FRONTEND_URL` o `FRONTEND_URLS`.
- Confirmar `API_DOCS_ENABLED=false` salvo necesidad puntual.
- Ejecutar smoke test de `/health`.

### Frontend

- Confirmar `VITE_API_URL`.
- Confirmar CSP vigente en `vercel.json`.
- Confirmar rutas SPA funcionando.
- Confirmar callback OAuth en `/auth/callback`.

### Smoke tests funcionales

- Registro local.
- Verificacion de cuenta.
- Login local.
- Login Google.
- Forgot-password.
- Reset-password.
- Logout.
- Consulta de perfil.
- Eliminacion de cuenta.

## 11. Problemas Frecuentes

### 11.1 CORS o cookie no persistente

Posibles causas:

- origen del frontend no incluido en allowlist,
- desalineacion entre dominio real y variable configurada,
- frontend apuntando a un backend distinto del esperado.

### 11.2 Google OAuth falla

Posibles causas:

- callback URI no registrada correctamente en Google Cloud,
- `GOOGLE_CALLBACK_URL` desalineada con la URL real de Render,
- deploy con variables antiguas.

### 11.3 El backend responde 500 en flujos sensibles

Posibles causas:

- codigo de produccion atrasado respecto al repo,
- esquema de base de datos parcialmente actualizado,
- variables de entorno incompletas o invalidas.

## 12. Recomendacion Operativa

Despues de cada despliegue productivo, el equipo debe validar al menos:

- autenticacion local,
- autenticacion Google,
- cierre de sesion,
- recuperacion de contrasena,
- perfil,
- y permisos de rutas protegidas.

Sin ese paso, un deploy "verde" puede igual dejar una regresion funcional o de seguridad.

## 13. Pipeline recomendado con GitHub Actions y Render

El repositorio incluye un workflow en `.github/workflows/backend-ci-render.yml` con este flujo:

1. `npm ci`
2. `npm test`
3. `npm run build`
4. trigger del deploy en Render por deploy hook
5. smoke test contra el backend desplegado

### Secretos y variables requeridos en GitHub

- Secret: `RENDER_DEPLOY_HOOK_URL`
- Variable: `RENDER_SERVICE_URL`

Ejemplo de `RENDER_SERVICE_URL`:

```env
RENDER_SERVICE_URL=https://digital-alert-hub-backend.onrender.com
```

### Comportamiento del smoke test

El smoke test espera que en produccion:

- `GET /health` responda `200` con `{ "status": "ok" }`
- `GET /` contenga `API DigitalAlertHub activa`
- `GET /api/docs` responda `404` mientras `API_DOCS_ENABLED=false`
- `GET /health` exponga headers de seguridad y temporizacion (`CSP`, `nosniff`, `DENY`, `Server-Timing`, `X-Response-Time`)

Si alguna de esas validaciones falla, el workflow marca el despliegue como fallido.

### Ajuste de rama de CI y despliegue

El workflow hace CI en `dev` y `main`, pero solo dispara deploy automatico desde `main`.

Si Render publica otra rama, ajusta el `push.branches` y la condicion de los jobs `deploy_render` y `smoke_tests` en el workflow.

```yaml
on:
  push:
    branches:
      - dev
      - main
```

### Comando local equivalente

Si necesitas ejecutar el smoke test manualmente contra un deploy ya publicado:

```bash
DEPLOYED_BACKEND_URL=https://digital-alert-hub-backend.onrender.com npm run smoke:deploy
```

### Guardia manual de rendimiento

El mismo workflow permite lanzar un benchmark manual desde `workflow_dispatch`.

Parametros disponibles:

- `run_performance_guard`
- `performance_samples`
- `performance_p95_threshold_ms`
- `performance_mean_threshold_ms`

Comando local equivalente:

```bash
DEPLOYED_BACKEND_URL=https://digital-alert-hub-backend.onrender.com npm run benchmark:deploy
```

Variables opcionales:

```bash
PERF_SAMPLES=20
PERF_P95_THRESHOLD_MS=800
PERF_MEAN_THRESHOLD_MS=400
PERF_ENDPOINTS=/health,/
```
