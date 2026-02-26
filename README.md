#  DigitalAlertHub_Backend
Backend de la aplicacion web **Digital Alert Hub**

## Documentacion clave
- Setup completo de activacion de cuenta y recuperacion de contrasena:
  - `README_ACCOUNT_ACTIVATION_AND_PASSWORD_RECOVERY.md`

Este proyecto provee la API REST y la logica del lado del servidor para **Digital Alert Hub**, un sistema de alertas comunitarias que conecta a los ciudadanos, Juntas de Accion Comunal (JAC) y alcaldias para reportar y gestionar problemas locales como riesgos de deslizamiento, deterioro de vias o fallas en servicios publicos.

---

##  Tecnologias principales

### Dependencias de Producción

| Tecnologia | Version | Proposito |
|-------------|---------|-----------|
| **Express** | ^5.2.1 | Framework web para crear API REST |
| **Sequelize** | ^6.37.7 | ORM para PostgreSQL con modelos y migraciones |
| **pg** | ^8.16.3 | Driver PostgreSQL para Node.js |
| **pg-hstore** | ^2.3.4 | Serialización de hstore para Sequelize (REQUERIDO) |
| **jsonwebtoken** | ^9.0.3 | Autenticación con JWT tokens |
| **bcrypt** | ^6.0.0 | Hash seguro de contraseñas |
| **bcryptjs** | ^3.0.3 | Alternativa de bcrypt |
| **passport** | ^0.7.0 | Middleware de autenticación |
| **passport-google-oauth20** | ^2.0.0 | Google OAuth 2.0 strategy |
| **multer** | ^2.0.2 | Middleware para subida de archivos |
| **cloudinary** | ^2.9.0 | Almacenamiento en la nube para imágenes/evidencias |
| **dotenv** | ^17.2.3 | Variables de entorno (.env) |
| **cors** | ^2.8.5 | Control de CORS para peticiones del frontend |
| **nodemailer** | ^7.0.11 | Envío de emails (verificación, recuperación de contraseña) |

### Dependencias de Desarrollo

| Tecnologia | Version | Proposito |
|-------------|---------|-----------|
| **TypeScript** | ^5.9.3 | Lenguaje tipado estático |
| **ts-node-dev** | ^2.0.0 | Ejecutar TypeScript en desarrollo con auto-reload |
| **ts-node** | ^10.9.2 | Compilador TypeScript para Node.js |
| **nodemon** | ^3.1.10 | Monitor de cambios y reinicio automático |
| **sequelize-cli** | ^6.6.3 | CLI para migraciones de BD |
| **@types/bcrypt** | ^6.0.0 | Tipos TypeScript para bcrypt |
| **@types/bcryptjs** | ^2.4.6 | Tipos TypeScript para bcryptjs |
| **@types/cors** | ^2.8.19 | Tipos TypeScript para cors |
| **@types/express** | ^5.0.6 | Tipos TypeScript para Express |
| **@types/jsonwebtoken** | ^9.0.10 | Tipos TypeScript para JWT |
| **@types/multer** | ^2.0.0 | Tipos TypeScript para multer |
| **@types/node** | ^24.10.3 | Tipos TypeScript para Node.js |
| **@types/nodemailer** | ^7.0.3 | Tipos TypeScript para nodemailer |
| **@types/passport** | ^1.0.17 | Tipos TypeScript para Passport |
| **@types/passport-google-oauth20** | ^2.0.17 | Tipos TypeScript para Google OAuth |

---

##  Configuracion del entorno

### Requisitos Previos

- **Node.js** 18+ instalado
- **PostgreSQL** 12+ instalado y ejecutándose
- **npm** o **yarn** como gestor de paquetes
- **Git** instalado

### 1. **Clonar el repositorio**

```bash
git clone https://github.com/digitalalerthub/DigitalAlertHub_Backend.git
cd DigitalAlertHub_Backend
git checkout dev
```

### 2. **Instalar dependencias**

```bash
npm install
```

Esto instala:
- **Dependencias de producción**: Express, Sequelize, JWT, Passport, Nodemailer, etc.
- **Dependencias de desarrollo**: TypeScript, ts-node-dev, Nodemon, sequelize-cli, etc.

### 3. **Configurar variables de entorno (.env)**

Crea archivo `.env` en la raiz del proyecto. **Nota:** Usa valores ficticios en desarrollo; obtén valores reales de cada servicio:

```env
# Servidor
PORT=4000
NODE_ENV=development

# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=digital_alert_hub
DB_USER=postgres
DB_PASSWORD=secure_db_password_local

# JWT para autenticación
JWT_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz56abcdefghij

# Nodemailer (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=myemail@example.com
EMAIL_PASS=app_specific_password

# Google OAuth (https://console.developers.google.com)
GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Cloudinary (https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=my_cloud
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz12345

# Geoapify (https://www.geoapify.com)
GEOAPIFY_API_KEY=abcdefghijklmnopqrstuvwxyz12345678901234

# Frontend
FRONTEND_URL=http://localhost:5173
```

**Generar JWT_SECRET seguro:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. **Configurar PostgreSQL**

Si ejecutas PostgreSQL localmente:

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE digital_alert_hub;

# Crear usuario (opcional)
CREATE USER dahub_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE digital_alert_hub TO dahub_user;

# Salir
\q
```

### 5. **Ejecutar migraciones**

```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

---

##  Ejecucion del proyecto

Para iniciar el servidor en modo desarrollo con **nodemon**:
```bash
npm run dev
```

El servidor se ejecutara por defecto en:
```
http://localhost:4000
```

---

##  Nodemailer - Configuracion de correos

El backend incluye la integracion con **Nodemailer**, lo que permite:
- Enviar correos de **verificacion de cuenta**.
- Recuperar contrasenas olvidadas.
- Notificar a usuarios o administradores sobre **nuevas alertas registradas**.

El transportador de correo puede configurarse para diferentes servicios (Gmail, Outlook, Zoho, etc.):

```ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

---

##  Scripts utiles

| Comando | Descripcion |
|----------|--------------|
| `npm run dev` | Ejecuta el servidor en modo desarrollo (con Nodemon) |
| `npm run build` | Compila el codigo TypeScript a JavaScript |
| `npm start` | Ejecuta el servidor en produccion |

---

##  Base de datos

El proyecto utiliza **PostgreSQL** y **Sequelize** para la gestion ORM.
Las migraciones y modelos se definen dentro de `/src/models` y pueden sincronizarse automaticamente al iniciar el servidor.

Para soporte de evidencia multimedia en alertas (URL y tipo), asegure que la tabla `alertas` tenga estas columnas en Neon/produccion:

```sql
ALTER TABLE alertas
ADD COLUMN IF NOT EXISTS evidencia_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS evidencia_tipo VARCHAR(50);
```

---

##  Dependencias principales

```bash
npm install express sequelize pg pg-hstore jsonwebtoken bcrypt dotenv cors nodemailer passport passport-google-oauth20
```

##  Dependencias de desarrollo

```bash
 npm install -D typescript ts-node-dev @types/express @types/node @types/jsonwebtoken @types/bcrypt @types/cors @types/passport @types/passport-google-oauth20
```

---

##  Autor
**Digital Alert Hub - Equipo de desarrollo**
Backend mantenido con Node.js, Express y TypeScript.
