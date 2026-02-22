# Activacion de Cuenta y Recuperacion de Contrasena - Guia Completa

Este documento registra el proceso exacto implementado en este backend para:
- Activar cuentas por confirmacion de correo
- Recuperar contrasena por correo
- Enviar correos usando Gmail API (HTTPS), compatible con Render (incluyendo plan free)

Tambien incluye los errores reales encontrados y su solucion.

## 1) Por que se eligio este enfoque

El SMTP desde instancias free de Render suele estar bloqueado en puertos de correo (25/465/587).
Por eso, en local puede funcionar SMTP, pero en deploy falla por timeout.

Solucion final aplicada:
- Usar Gmail API por HTTPS (no SMTP)
- Guardar tokens en variables de entorno
- Usar endpoints del backend para verificacion y recuperacion

## 2) Flujo actual del backend

### Flujo de activacion de cuenta
1. `POST /api/auth/register`
2. El usuario se crea con `estado=false` (inactivo)
3. El backend genera token JWT de verificacion (24h)
4. El backend envia correo con enlace:
   - `GET /api/auth/verify-account/:token`
5. El usuario abre el enlace
6. El backend cambia `estado=true`
7. El backend redirige a `FRONTEND_URL/login?verified=1`

### Comportamiento de login
- Si la cuenta no esta verificada (`estado=false`), login responde `403`.

### Flujo de recuperacion de contrasena
1. `POST /api/auth/forgot-password`
2. El backend genera token JWT de recuperacion (15m)
3. El backend envia correo con enlace del frontend:
   - `${FRONTEND_URL}/reset-password/:token`
4. El frontend llama `POST /api/auth/reset-password/:token`

## 3) Variables de entorno requeridas

Usar estas variables en `.env` local y en Render (Production):

```env
PORT=4000
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
JWT_SECRET=...

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

GOOGLE_GMAIL_CLIENT_ID=...
GOOGLE_GMAIL_CLIENT_SECRET=...
GOOGLE_GMAIL_REFRESH_TOKEN=...
GOOGLE_GMAIL_SENDER=digitalalerthub@gmail.com

# Fallback opcional usado por el codigo si GOOGLE_GMAIL_SENDER esta vacio
EMAIL_USER=digitalalerthub@gmail.com
```

Valores recomendados en produccion:
- `FRONTEND_URL=https://<dominio-frontend>`
- `BACKEND_URL=https://digital-alert-hub-backend-rh08.onrender.com`

## 4) Configuracion de Google Cloud (sin saltar pasos)

### Paso A - Habilitar Gmail API
En Google Cloud Console, en el mismo proyecto del OAuth client:
- APIs and Services > Library
- Buscar `Gmail API`
- Click en `Enable`

Si no se habilita, el backend falla con:
- `403 PERMISSION_DENIED`
- `accessNotConfigured`
- `SERVICE_DISABLED`

### Paso B - OAuth consent screen
- OAuth consent screen > User type: External
- Si la app esta en Testing, agregar usuarios de prueba
- Agregar al menos la cuenta remitente (ejemplo: `digitalalerthub@gmail.com`)

Si se omite, la autorizacion puede fallar con:
- `403 access_denied`

### Paso C - Redirect URI para OAuth Playground
En el OAuth Client, agregar este Authorized redirect URI exacto:
- `https://developers.google.com/oauthplayground`

Si se omite, aparece:
- `400 redirect_uri_mismatch`

### Paso D - Generar refresh token
Usar OAuth 2.0 Playground:
1. Abrir: `https://developers.google.com/oauthplayground`
2. Icono de engrane:
   - Activar `Use your own OAuth credentials`
   - Pegar client id y client secret
3. En Step 1, usar scope:
   - `https://www.googleapis.com/auth/gmail.send`
4. Autorizar con la cuenta remitente
5. Exchange authorization code for tokens
6. Copiar `refresh_token` (empieza por `1//`)
7. Guardar en `GOOGLE_GMAIL_REFRESH_TOKEN`

Notas:
- El checkbox `Auto-refresh the token` en Playground no es necesario para produccion.
- El backend renueva access tokens automaticamente con el refresh token.

## 5) Prerrequisitos de base de datos

Registro usa `id_rol`, y `usuarios` tiene FK contra `roles`.
Si faltan roles, register falla con:
- `SequelizeForeignKeyConstraintError`
- `id_rol ... not present in roles`

Datos minimos requeridos:

```sql
INSERT INTO roles (id_rol, nombre_rol)
VALUES (1, 'admin'), (2, 'usuario')
ON CONFLICT (id_rol) DO NOTHING;
```

Actualmente el registro usa por defecto `id_rol=2` (usuario).

## 6) Resumen de endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/verify-account/:token`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`

## 7) Checklist de pruebas (local y deploy)

### Local
1. Iniciar backend
2. Registrar usuario nuevo
3. Validar que la respuesta indique revisar correo
4. Abrir enlace `verify-account` recibido
5. Validar redireccion a login
6. Validar login exitoso
7. Probar forgot-password y reset-password

### Deploy (Render)
1. Validar todas las variables en Render
2. Deploy de la ultima version en `main`
3. Registrar usuario y verificar via correo
4. Probar forgot-password desde frontend de produccion
5. Revisar logs de Render para confirmar envio por Gmail API

## 8) Troubleshooting rapido

### Error: SMTP timeout / ETIMEDOUT
Causa:
- Envio SMTP desde Render free
Solucion:
- Usar Gmail API HTTPS (esta guia)

### Error: 400 redirect_uri_mismatch
Causa:
- Falta redirect URI de OAuth Playground
Solucion:
- Agregar `https://developers.google.com/oauthplayground` en OAuth client

### Error: 403 access_denied (app no verificada / testing)
Causa:
- App en Testing y usuario no agregado
Solucion:
- Agregar correo en test users del OAuth consent screen

### Error: 403 SERVICE_DISABLED / accessNotConfigured
Causa:
- Gmail API deshabilitada
Solucion:
- Habilitar Gmail API en Google Cloud

### Error: 500 en register por FK de roles
Causa:
- Faltan filas en tabla `roles`
Solucion:
- Insertar roles base (SQL de arriba)

### Enlace de verificacion no funciona desde correo
Causas comunes:
- URL copiada con caracteres extra (`[]`, texto duplicado)
- URL sin protocolo (`https://`)
Solucion:
- Abrir URL exacta, una sola vez, con protocolo completo

## 9) Seguridad (obligatorio)

Rotar secretos expuestos en capturas/chat:
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_GMAIL_REFRESH_TOKEN`
- `JWT_SECRET`
- Credenciales de base de datos

No subir secretos reales al repositorio.

---

Responsable: equipo backend.
Este archivo existe para que la configuracion sea reproducible por todo el equipo sin depender de memoria o contexto previo.
