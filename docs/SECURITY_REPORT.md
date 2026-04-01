# Informe de Seguridad

## 1. Resumen Ejecutivo

Este informe consolida el estado actual de seguridad de Digital Alert Hub a nivel de backend y de integracion con el frontend. El objetivo es que el equipo tenga una referencia comun sobre:

- riesgos relevantes ya mitigados,
- controles de seguridad implementados,
- riesgos residuales,
- y acciones operativas necesarias para sostener una gestion de vulnerabilidades madura.

## 2. Alcance del Analisis

El analisis cubre principalmente:

- autenticacion local y con Google,
- manejo de sesiones,
- activacion de cuenta y recuperacion de contrasena,
- autorizacion por roles,
- carga de evidencias,
- CORS, CSRF y cabeceras de seguridad,
- documentacion publica de la API,
- y puntos sensibles del frontend relacionados con navegacion, autenticacion y exposicion de recursos.

Componentes revisados:

- Backend: Node.js, Express, TypeScript, Sequelize, PostgreSQL.
- Frontend: React, Vite, Axios, rutas protegidas y despliegue en Vercel.

## 3. Metodologia Aplicada

La evaluacion se realizo mediante:

- revision estatica del codigo,
- seguimiento de flujos reales de autenticacion y autorizacion,
- verificacion de configuraciones de despliegue,
- identificacion de vectores comunes de ataque en aplicaciones web,
- correccion directa de hallazgos relevantes,
- y validacion con pruebas automatizadas y builds locales.

## 4. Estado General

Estado actual: bueno a nivel de hardening tecnico.

No se identifican vulnerabilidades criticas abiertas en el codigo actualmente revisado. El proyecto ya no esta en una postura basica de seguridad; ahora cuenta con controles defensivos concretos en las capas mas sensibles del sistema.

Esto no significa "seguridad perfecta". Todavia existen riesgos residuales y trabajo operativo pendiente para hablar de una gestion de vulnerabilidades madura en sentido organizacional.

## 5. Hallazgos Historicos Corregidos

### 5.1 Sesion y autenticacion

Se corrigieron los siguientes problemas:

- El login con Google ya no expone el JWT en la URL.
- El frontend ya no guarda la sesion en `localStorage`.
- El callback OAuth usa un codigo temporal de un solo uso.
- La sesion ahora se maneja con cookie `HttpOnly`.
- El logout ya no se limita a borrar la cookie: ahora revoca efectivamente la sesion emitida.

Controles aplicados:

- `src/routes/auth/authGoogle.ts`
- `src/services/auth/authService.ts`
- `src/services/auth/authSessionService.ts`
- `src/controllers/auth/authController.ts`
- `src/middleware/authMiddleware.ts`
- `src/models/users/User.ts`
- `src/config/db.ts`

### 5.2 Recuperacion de cuenta y contrasenas

Se corrigieron los siguientes problemas:

- Los enlaces de recuperacion ya no son reutilizables.
- El cambio de contrasena autenticado exige contrasena actual.
- Se redujo la enumeracion de usuarios por mensajes diferenciados.
- Se eliminaron practicas inseguras como exponer enlaces sensibles en logs.

Controles aplicados:

- versionado de enlaces con `password_action_version`,
- validaciones genericas de login y forgot-password,
- reCAPTCHA en flujos de autenticacion y recuperacion,
- y refuerzo del servicio de perfil.

### 5.3 CSRF y sesion por cookie

Tras migrar a cookie de sesion, se agrego una defensa CSRF basada en `Origin` y `Referer` para solicitudes mutantes autenticadas por cookie.

Controles aplicados:

- `src/middleware/csrfProtectionMiddleware.ts`
- integracion global en `src/app.ts`

### 5.4 Autorizacion y revocacion de privilegios

Antes, un cambio de rol podia no reflejarse de inmediato si la sesion ya estaba emitida. Ahora `verifyToken` rehidrata el usuario vigente desde base de datos y usa el rol actual.

Adicionalmente, la sesion se invalida por `session_version` cuando corresponde.

### 5.5 Carga de archivos y evidencias

Se endurecio la validacion de evidencias:

- ya no se confia solo en el MIME enviado por el cliente,
- se verifica firma binaria de JPEG, PNG y WEBP,
- y el backend usa el tipo detectado en lugar del declarado por el navegador.

### 5.6 Headers, CORS y documentacion publica

Se incorporaron:

- headers de seguridad para API,
- CSP especifica para Swagger,
- allowlist explicita para CORS,
- y cierre de `/api/docs` por defecto en produccion salvo habilitacion explicita.

### 5.7 Frontend

Se corrigieron y endurecieron los siguientes puntos:

- CSP y headers de seguridad para la SPA desplegada en Vercel,
- saneamiento de `redirect` en login y registro,
- eliminacion de dependencia de `localStorage`,
- y ajuste del flujo de hidratacion de sesion.

## 6. Controles de Seguridad Actuales

### 6.1 Autenticacion

- Login por credenciales con validacion de CAPTCHA.
- Google OAuth 2.0 con intercambio de codigo temporal.
- Validacion de bloqueo temporal por intentos fallidos.
- Verificacion obligatoria de correo para cuentas locales.

### 6.2 Sesion

- Cookie `HttpOnly`.
- `SameSite` adaptado por entorno.
- Revocacion por `session_version`.
- Consulta de sesion actual via `/api/auth/session`.

### 6.3 Autorizacion

- `verifyToken` para rutas protegidas.
- validacion del rol vigente desde base de datos,
- middleware de rol para rutas administrativas,
- y validaciones de negocio adicionales en servicios sensibles.

### 6.4 Protecciones Web

- CORS con allowlist por `FRONTEND_URL` o `FRONTEND_URLS`.
- CSRF para requests mutantes con cookie.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`.
- CSP en API y frontend.

### 6.5 Recuperacion y activacion

- Enlaces de un solo uso con versionado.
- Verificacion del email asociado al token.
- Reenvio de verificacion controlado.

### 6.6 Evidencias

- validacion de magic bytes,
- rechazo de archivos falsamente etiquetados,
- restricciones funcionales de formato y tamano.

### 6.7 Eliminacion de cuenta

- anonimiza alertas del usuario,
- elimina dependencias relevantes como comentarios y reacciones,
- y luego borra fisicamente el registro del usuario.

## 7. Riesgos Residuales

### 7.1 Riesgos tecnicos residuales

- La validacion binaria de imagenes es mejor que confiar en MIME, pero no equivale a una sanitizacion completa ni a re-encoding server-side.
- La proteccion CSRF depende de una politica correcta de origenes permitidos y del despliegue real.
- Las cookies protegen mejor que `localStorage`, pero exigen una configuracion estable de dominios, CORS y headers en produccion.

### 7.2 Riesgos operativos

Estos riesgos no se resuelven solo con cambios de codigo:

- dependencia de que Render, Vercel y Neon tengan variables y despliegues alineados,
- posibilidad de drift entre el codigo local y el entorno de produccion,
- ausencia de un pipeline formal de SAST y SCA,
- y ausencia de una politica explicita de rotacion, monitoreo y respuesta.

## 8. Estado de la Documentacion Revisada

Se revisaron los documentos historicos del repositorio y se encontro lo siguiente:

- `DEPLOYMENT_DOCUMENTATION.md`: tenia valor historico, pero estaba desactualizado en autenticacion, CORS, sesion y despliegue.
- `README_ACCOUNT_ACTIVATION_AND_PASSWORD_RECOVERY.md`: seguia siendo util como base conceptual, pero no reflejaba el flujo actual ni las medidas de seguridad aplicadas.
- `REPORTES_IMPLEMENTACION.md`: conservaba contexto funcional, pero tenia rutas, permisos y detalles tecnicos desalineados con el codigo actual.

Por eso, la documentacion vigente se normalizo dentro de `docs/`.

## 9. Recomendaciones para el Equipo

### Prioridad alta

- Confirmar que el backend desplegado en Render este ejecutando el ultimo codigo.
- Validar en produccion los flujos: login local, login Google, logout, forgot-password, reset-password y eliminacion de cuenta.
- Verificar que las variables de entorno de produccion esten alineadas con `.env.example`.

### Prioridad media

- Incorporar `npm audit` o herramienta equivalente en CI.
- Incorporar escaneo de secretos.
- Registrar una checklist de despliegue seguro.
- Formalizar revision post-deploy de logs y endpoints criticos.

### Prioridad baja

- Evaluar re-encoding de imagenes antes de persistirlas.
- Considerar almacenamiento de sesiones por dispositivo si en el futuro se necesita logout selectivo en lugar de revocacion global por usuario.

## 10. Conclusion

El proyecto cuenta hoy con una base de seguridad tecnicamente robusta para su alcance actual. Los hallazgos de mayor impacto que existian en autenticacion, manejo de sesion, recuperacion de cuenta, CSRF, autorizacion y superficie de frontend ya fueron corregidos.

La conclusion practica es esta:

- el codigo actual esta bien endurecido,
- la postura tecnica de seguridad es buena,
- y el trabajo pendiente principal ya no es tanto de desarrollo defensivo como de operacion y disciplina de despliegue.
