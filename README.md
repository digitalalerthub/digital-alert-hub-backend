#  DigitalAlertHub_Backend
Backend de la aplicacion web **Digital Alert Hub**

## Documentacion clave
- Setup completo de activacion de cuenta y recuperacion de contrasena:
  - `README_ACCOUNT_ACTIVATION_AND_PASSWORD_RECOVERY.md`

Este proyecto provee la API REST y la logica del lado del servidor para **Digital Alert Hub**, un sistema de alertas comunitarias que conecta a los ciudadanos, Juntas de Accion Comunal (JAC) y alcaldias para reportar y gestionar problemas locales como riesgos de deslizamiento, deterioro de vias o fallas en servicios publicos.

---

##  Tecnologias principales

| Tecnologia | Uso |
|-------------|------|
| **Node.js** | Entorno de ejecucion para el backend |
| **Express** | Framework minimalista para crear API REST |
| **TypeScript** | Tipado estatico y mejor mantenimiento del codigo |
| **Sequelize** | ORM para interactuar con PostgreSQL usando modelos |
| **PostgreSQL** | Base de datos relacional |
| **JWT (jsonwebtoken)** | Autenticacion segura mediante tokens |
| **bcrypt** | Encriptacion de contrasenas de usuarios |
| **Passport.js** | Middleware de autenticacion (Google OAuth 2.0) |
| **dotenv** | Manejo de variables de entorno |
| **cors** | Permite peticiones del frontend (React u otros) |
| **nodemailer** | Envio de correos electronicos (confirmacion de cuenta, recuperacion de contrasena, notificaciones) |

---

##  Configuracion del entorno

### 1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Archivo `.env`**
   Crea un archivo `.env` en la raiz del proyecto con el siguiente contenido (ajusta los valores segun tu configuracion):

   ```env
   PORT=4000
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=digital_alert_hub
    DB_USER=postgres
    DB_PASSWORD=tu_password_bd
    JWT_SECRET=tu_jwt_secret
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_SECURE=false
    EMAIL_USER=tu_correo@dominio.com
    EMAIL_PASS=tu_app_password_o_token
    GOOGLE_CLIENT_ID=tu_google_client_id
    GOOGLE_CLIENT_SECRET=tu_google_client_secret
    GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
   ```

   >  Puedes generar tu propio JWT_SECRET ejecutando este comando en Git Bash o terminal:
   >
   > ```bash
   > node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   > ```

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
