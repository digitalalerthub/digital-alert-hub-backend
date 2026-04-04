# DigitalAlertHub Backend

Backend de la aplicacion web **Digital Alert Hub**.

Este proyecto expone la API REST y la logica del servidor para gestionar usuarios, autenticacion, alertas comunitarias, catalogos, comentarios, reacciones y reportes.

## Documentacion clave

- Indice de documentacion canonica: `docs/README.md`
- Informe de seguridad: `docs/SECURITY_REPORT.md`
- Despliegue: `docs/DEPLOYMENT_DOCUMENTATION.md`
- Activacion de cuenta y recuperacion de contrasena: `docs/ACCOUNT_ACTIVATION_AND_PASSWORD_RECOVERY.md`
- Modulo de reportes: `docs/REPORTES_IMPLEMENTACION.md`
- Guia de pruebas: `docs/TESTING_GUIDE.md`

## Documentacion relacionada

- Frontend del proyecto: `../digital-alert-hub-frontend/README.md`
- Indice tecnico del frontend: `../digital-alert-hub-frontend/docs/README.md`

## Stack principal

### Produccion

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Express | ^5.2.1 | API HTTP |
| Sequelize | ^6.37.7 | ORM para PostgreSQL |
| pg | ^8.16.3 | Driver PostgreSQL |
| jsonwebtoken | ^9.0.3 | JWT y enlaces firmados |
| bcrypt / bcryptjs | ^6.0.0 / ^3.0.3 | Hash de contrasenas |
| passport | ^0.7.0 | Autenticacion |
| multer | ^2.0.2 | Carga de archivos |
| cloudinary | ^2.9.0 | Evidencias multimedia |
| nodemailer | ^7.0.11 | Correo transaccional |

### Desarrollo

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| TypeScript | ^5.9.3 | Tipado estatico |
| ts-node-dev | ^2.0.0 | Desarrollo con recarga |
| sequelize-cli | ^6.6.3 | Migrations y seeders |
| vitest | ^4.1.2 | Pruebas |

## Requisitos previos

- Node.js 18+
- PostgreSQL 12+ si usaras una base local
- npm
- Git

## Instalacion

### 1. Clonar el repositorio

```bash
git clone https://github.com/digitalalerthub/DigitalAlertHub_Backend.git
cd DigitalAlertHub_Backend
git checkout dev
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raiz del proyecto tomando como base `.env.example`.

Variables importantes:

```env
# Servidor
PORT=4000
NODE_ENV=development
BACKEND_URL=http://localhost:4000

# Base de datos
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
DB_SSL=true
DB_SYNC=false
DB_LOG_SQL=false

# Alternativa si no usas DATABASE_URL
DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=

# Autenticacion
JWT_SECRET=

# Frontend
FRONTEND_URL=http://localhost:5173
FRONTEND_URLS=
API_DOCS_ENABLED=true

# Correo
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASS=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# reCAPTCHA
RECAPTCHA_SECRET_KEY=
RECAPTCHA_MIN_SCORE=0.3

# Rate limiting y bloqueo
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_LOGIN_RATE_LIMIT_MAX=10
AUTH_REGISTER_RATE_LIMIT_MAX=5
AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX=5
AUTH_RESEND_VERIFICATION_RATE_LIMIT_MAX=5
AUTH_RESET_PASSWORD_RATE_LIMIT_MAX=10
AUTH_MAX_LOGIN_ATTEMPTS=5
AUTH_LOGIN_LOCK_MINUTES=10

# Bootstrap opcional del admin sembrado
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_NAME=Admin
SEED_ADMIN_LASTNAME=Principal
SEED_ADMIN_PHONE=3000000000
```

Generar `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Base de datos

El proyecto usa una estrategia versionada con:

- `migrations/` para el esquema
- `seeders/` para catalogos y bootstrap inicial
- `.sequelizerc` y `sequelize.config.js` para `sequelize-cli`

El flujo recomendado de inicializacion es:

```bash
npm run db:migrate
npm run db:seed:all
```

La app ya no debe depender de una base precargada manualmente para arrancar correctamente.

`DB_SYNC=true` queda solo como apoyo excepcional de desarrollo. No es la via principal para preparar la base.

### Catalogos y datos bootstrap incluidos

Seeders de catalogo:

- `roles`
- `estados`
- `reacciones`
- `categorias`
- `comunas`
- `barrios`

Seeder de bootstrap:

- usuario administrador inicial
- alerta de ejemplo
- evidencia de ejemplo
- historial inicial de la alerta

El admin sembrado queda listo para usar el flujo existente de `set_password`. Si `FRONTEND_URL` y `JWT_SECRET` estan configurados, el seeder imprime en consola el enlace para definir la contrasena en el primer ingreso.

## Arranque del proyecto

### Desarrollo

```bash
npm run dev
```

Servidor por defecto:

```text
http://localhost:4000
```

### Produccion

```bash
npm run build
npm start
```

## OpenAPI

Con el backend iniciado:

- UI: `http://localhost:4000/api/docs`
- JSON: `http://localhost:4000/api/docs/openapi.json`

## Scripts utiles

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Inicia el backend en desarrollo |
| `npm run build` | Compila TypeScript |
| `npm start` | Inicia el backend compilado |
| `npm test` | Ejecuta pruebas |
| `npm run db:migrate` | Ejecuta migrations |
| `npm run db:migrate:undo:all` | Revierte todas las migrations |
| `npm run db:seed:all` | Ejecuta todos los seeders |
| `npm run db:seed:undo:all` | Revierte todos los seeders |
| `npm run smoke:deploy` | Smoke test sobre backend desplegado |
| `npm run benchmark:deploy` | Benchmark simple sobre backend desplegado |

## Makefile

Se agrego un `Makefile` para un flujo de arranque mas simple.

Targets disponibles:

| Comando | Descripcion |
|---------|-------------|
| `make install` | Instala dependencias |
| `make build` | Compila TypeScript |
| `make test` | Ejecuta pruebas |
| `make db-migrate` | Ejecuta migrations |
| `make db-seed` | Ejecuta seeders |
| `make bootstrap` | Ejecuta migrations y seeders |
| `make setup` | Instala dependencias, compila y bootstrapea la base |
| `make dev` | Inicia el backend en desarrollo |
| `make start` | Inicia el backend compilado |
| `make db-reset` | Revierte seeders y migrations |

Ejemplo de arranque limpio:

```bash
make setup
make dev
```

Nota para Windows:

- este entorno no trae `make` instalado por defecto;
- puedes usar Git Bash con `make`, `mingw32-make`, o ejecutar directamente los scripts `npm run ...`.

## Correos

El backend intenta enviar correos con Gmail API y, si ese flujo no esta configurado o falla, usa SMTP con Nodemailer como fallback.

Casos cubiertos:

- verificacion de cuenta
- recuperacion de contrasena
- activacion administrativa con `set_password`
- notificaciones vinculadas a alertas

## Estado del esquema inicial

La migration principal crea el esquema base compatible con el codigo actual:

- `roles`
- `usuarios`
- `estados`
- `reacciones`
- `categorias`
- `comunas`
- `barrios`
- `alertas`
- `evidencias`
- `comentarios`
- `alertas_reacciones`
- `historial_estado`

## Autor

**Digital Alert Hub - Equipo de desarrollo**
