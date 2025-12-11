#  DigitalAlertHub_Backend
Backend de la aplicación web **Digital Alert Hub**

Este proyecto provee la API REST y la lógica del lado del servidor para **Digital Alert Hub**, un sistema de alertas comunitarias que conecta a los ciudadanos, Juntas de Acción Comunal (JAC) y alcaldías para reportar y gestionar problemas locales como riesgos de deslizamiento, deterioro de vías o fallas en servicios públicos.

---

##  Tecnologías principales

| Tecnología | Uso |
|-------------|------|
| **Node.js** | Entorno de ejecución para el backend |
| **Express** | Framework minimalista para crear API REST |
| **TypeScript** | Tipado estático y mejor mantenimiento del código |
| **Sequelize** | ORM para interactuar con PostgreSQL usando modelos |
| **PostgreSQL** | Base de datos relacional |
| **JWT (jsonwebtoken)** | Autenticación segura mediante tokens |
| **bcrypt** | Encriptación de contraseñas de usuarios |
| **Passport.js** | Middleware de autenticación (Google OAuth 2.0) |
| **dotenv** | Manejo de variables de entorno |
| **cors** | Permite peticiones del frontend (React u otros) |
| **nodemailer** | Envío de correos electrónicos (confirmación de cuenta, recuperación de contraseña, notificaciones) |

---

##  Configuración del entorno

### 1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Archivo `.env`**
   Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido (ajusta los valores según tu configuración):

   ```env
    PORT=4000
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=digital_alert_hub
    DB_USER=postgres
    DB_PASSWORD=1234
    JWT_SECRET=7a3d5e6b1f9c84c92f9e3e1b5f3b0a19d9c42b8275c2a9f5b7a08d9e3d7c1e2f
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_SECURE=false
    EMAIL_USER=digitalalerthub@gmail.com
    EMAIL_PASS=sbcg zaaw vrpy gbov
    GOOGLE_CLIENT_ID=23961059594-dk5hh3h57404t7tajh66jf76pmr5ds26.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=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
    GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
   ```

   >  Puedes generar tu propio JWT_SECRET ejecutando este comando en Git Bash o terminal:
   >
   > ```bash
   > node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   > ```

---

##  Ejecución del proyecto

Para iniciar el servidor en modo desarrollo con **nodemon**:
```bash
npm run dev
```

El servidor se ejecutará por defecto en:
```
http://localhost:4000
```

---

##  Nodemailer – Configuración de correos

El backend incluye la integración con **Nodemailer**, lo que permite:
- Enviar correos de **verificación de cuenta**.
- Recuperar contraseñas olvidadas.
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

##  Scripts útiles

| Comando | Descripción |
|----------|--------------|
| `npm run dev` | Ejecuta el servidor en modo desarrollo (con Nodemon) |
| `npm run build` | Compila el código TypeScript a JavaScript |
| `npm start` | Ejecuta el servidor en producción |

---

##  Base de datos

El proyecto utiliza **PostgreSQL** y **Sequelize** para la gestión ORM.
Las migraciones y modelos se definen dentro de `/src/models` y pueden sincronizarse automáticamente al iniciar el servidor.

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
**Digital Alert Hub – Equipo de desarrollo**  
Backend mantenido con Node.js, Express y TypeScript.
