# Activacion de Cuenta y Recuperacion de Contrasena

## 1. Objetivo

Este documento describe el flujo real y vigente de:

- activacion de cuenta,
- reenvio de verificacion,
- recuperacion de contrasena,
- establecimiento de contrasena,
- y autenticacion con Google.

Tambien resume las protecciones de seguridad aplicadas a estos flujos.

## 2. Flujo de Registro y Verificacion

### 2.1 Registro local

Endpoint:

- `POST /api/auth/register`

Comportamiento actual:

- el usuario se crea con rol ciudadano por defecto,
- `email_verificado=false`,
- `estado=true`,
- y el login sigue bloqueado hasta verificar el correo.

Esto significa que la habilitacion funcional del acceso depende de `email_verificado`, no de mantener la cuenta fisicamente inactiva desde base.

### 2.2 Enlace de verificacion

El backend genera un enlace hacia:

- `GET /api/auth/verify-account/:token`

Cuando el usuario abre el enlace:

- el backend valida el JWT,
- verifica el usuario asociado,
- marca `email_verificado=true`,
- y puede redirigir al frontend, normalmente a login con indicador de verificacion exitosa.

### 2.3 Reenvio de verificacion

Endpoint:

- `POST /api/auth/resend-verification`

Solo aplica si:

- el usuario existe,
- y su correo aun no esta verificado.

## 3. Recuperacion de Contrasena

### 3.1 Solicitud de recuperacion

Endpoint:

- `POST /api/auth/forgot-password`

Protecciones aplicadas:

- validacion de email,
- respuesta generica para no enumerar usuarios,
- reCAPTCHA,
- y versionado de enlace.

El backend incrementa `password_action_version` y emite un enlace nuevo. Cualquier enlace anterior queda invalidado.

### 3.2 Restablecimiento

Endpoint:

- `POST /api/auth/reset-password/:token`

El backend valida:

- el JWT,
- el email asociado,
- la version del token contra `password_action_version`,
- y la nueva contrasena.

Si el token ya fue usado o fue reemplazado por uno mas reciente, el flujo se rechaza.

## 4. Establecimiento Inicial de Contrasena

El sistema tambien soporta flujo de `set_password` para activaciones administrativas.

En ese caso:

- el enlace tambien usa `password_action_version`,
- se exige CAPTCHA,
- y al completar la contrasena se activa la cuenta si corresponde.

## 5. Login Local

Endpoint:

- `POST /api/auth/login`

Validaciones:

- reCAPTCHA,
- usuario existente,
- cuenta no bloqueada,
- contrasena correcta,
- `estado=true`,
- `email_verificado=true`.

La respuesta:

- fija cookie de sesion `HttpOnly`,
- no expone JWT en URL,
- y no requiere persistencia en `localStorage`.

## 6. Login con Google

### 6.1 Inicio del flujo

Endpoint:

- `GET /api/auth/google`

### 6.2 Callback

Endpoint:

- `GET /api/auth/google/callback`

Comportamiento actual:

- busca o crea usuario,
- garantiza rol ciudadano por defecto para altas nuevas,
- respeta bloqueos e inactividad,
- genera un codigo temporal de un solo uso,
- y redirige al frontend con `?code=...`, no con `?token=...`.

### 6.3 Canje del codigo

Endpoint:

- `POST /api/auth/google/exchange`

El frontend canjea ese codigo y el backend responde fijando la cookie de sesion.

## 7. Cierre de Sesion

Endpoint:

- `POST /api/auth/logout`

Comportamiento actual:

- limpia la cookie,
- incrementa `session_version`,
- y revoca cualquier sesion emitida con la version anterior.

## 8. Variables de Entorno Relevantes

Backend:

```env
JWT_SECRET=
FRONTEND_URL=
FRONTEND_URLS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
GOOGLE_GMAIL_CLIENT_ID=
GOOGLE_GMAIL_CLIENT_SECRET=
GOOGLE_GMAIL_REFRESH_TOKEN=
GOOGLE_GMAIL_SENDER=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_SECURE=
EMAIL_USER=
EMAIL_PASS=
RECAPTCHA_SECRET_KEY=
```

Frontend:

```env
VITE_API_URL=
VITE_RECAPTCHA_SITE_KEY=
```

## 9. Seguridad Aplicada a Estos Flujos

### Medidas principales

- No hay JWT en query string para login con Google.
- No hay sesion en `localStorage`.
- Los enlaces de recuperacion son de un solo uso.
- Logout revoca la sesion vigente.
- Login y forgot-password reducen enumeracion de usuarios.
- CSRF esta cubierto para requests mutantes autenticadas por cookie.

### Riesgos a vigilar

- Variables de entorno desalineadas entre ambientes.
- Deploys con codigo atrasado frente al repo.
- ReCAPTCHA deshabilitado accidentalmente.

## 10. Checklist de Verificacion

- Registrar cuenta local nueva.
- Confirmar recepcion del correo de activacion.
- Verificar cuenta con el enlace.
- Hacer login local.
- Solicitar forgot-password.
- Probar que el enlace de recuperacion solo funcione una vez.
- Hacer login con Google.
- Cerrar sesion y comprobar revocacion.

## 11. Errores Frecuentes

### Login no permite entrar tras registrar

Revisar:

- si `email_verificado` sigue en `false`,
- si el correo fue realmente confirmado,
- y si el frontend esta consultando `/api/auth/session` contra el backend correcto.

### El enlace de recuperacion no funciona

Revisar:

- si el enlace ya fue usado,
- si se solicito uno mas reciente,
- si el token expiro,
- o si el backend desplegado no corresponde al codigo actual.

### Google OAuth falla

Revisar:

- `GOOGLE_CALLBACK_URL`,
- origenes y redirect URIs registrados en Google Cloud,
- y la URL real del frontend y backend desplegados.
