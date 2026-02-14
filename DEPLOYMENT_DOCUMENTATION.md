# 📋 Digital Alert Hub - Documentación Completa de Despliegue

## 📌 Resumen Ejecutivo

**Digital Alert Hub** es una aplicación full-stack desplegada en:
- **Frontend**: React 19 + Vite → **Vercel**
- **Backend**: Node.js + Express + TypeScript → **Render**
- **Base de Datos**: PostgreSQL → **Neon** (serverless)
- **Autenticación**: Passport.js con Google OAuth 2.0

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Navegador)                      │
├─────────────────────────────────────────────────────────────┤
│                  Vercel (Frontend)                          │
│  digital-alert-hub-frontend.vercel.app                      │
│  - React 19 + Vite                                          │
│  - Autenticación con Google OAuth                           │
│  - Llamadas API a Render                                    │
├─────────────────────────────────────────────────────────────┤
│                   INTERNET / HTTPS                          │
├─────────────────────────────────────────────────────────────┤
│                 Render (Backend API)                        │
│  digital-alert-hub-backend-rh08.onrender.com:4000           │
│  - Express.js + TypeScript                                  │
│  - Rutas REST API                                           │
│  - Autenticación JWT                                        │
│  - Conexión a Neon                                          │
├─────────────────────────────────────────────────────────────┤
│                 Neon (Base de Datos)                        │
│  PostgreSQL Serverless                                      │
│  - Usuarios, Alertas, Roles                                 │
│  - SSL Encryption                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 PARTE 1: DESPLEGAR BASE DE DATOS EN NEON

### 1.1 Crear Proyecto en Neon

1. Ve a **https://neon.tech**
2. Sign up con GitHub
3. Crea un nuevo proyecto
4. Obtén la **connection string**:
   ```
   postgresql://neondb_owner:PASSWORD@ep-purple-fog-aiw6i0zl-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### 1.2 Configurar Conexión en Backend

En `src/config/db.ts`:

```typescript
import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize({
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  dialect: "postgres",
  // ⚠️ IMPORTANTE: SSL para Neon
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Para desarrollo/staging
    },
  },
  logQueryParameters: true,
  logging: console.log,
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Base de datos conectada exitosamente");
    await sequelize.sync({ alter: false });
  } catch (error) {
    console.error("❌ Error conectando a la BD:", error);
    throw error;
  }
};
```

### 1.3 Variables de Entorno Locales

Crea `.env` en la raíz del backend:

```bash
# Base de datos Neon
DB_HOST=ep-purple-fog-aiw6i0zl-pooler.c-4.us-east-1.aws.neon.tech
DB_USER=neondb_owner
DB_PASSWORD=npg_wHL1EWQrzlS2...
DB_NAME=neondb
DB_PORT=5432

# JWT
JWT_SECRET=tu_secret_muy_largo_sin_espacios

# Google OAuth
GOOGLE_CLIENT_ID=2396105994-...
GOOGLE_CLIENT_SECRET=GOCSPX-HtVi3f...
GOOGLE_CALLBACK_URL=https://digital-alert-hub-backend-rh08.onrender.com/api/auth/google/callback

# Email
EMAIL_USER=digitalalerthub@gmail.com
EMAIL_PASSWORD=abcg zaaw vrfy gbov

# Environment
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://digital-alert-hub-frontend.vercel.app
```

---

## 🔧 PARTE 2: DESPLEGAR BACKEND EN RENDER

### 2.1 Preparar Código

**package.json** debe tener:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts"
  }
}
```

### 2.2 Configuración de TypeScript

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 2.3 Estructura del Servidor

`src/server.ts`:

```typescript
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./config/db";
import app from "./app";

const PORT = process.env.PORT || 4000;

// ⚠️ IMPORTANTE: Iniciar servidor ANTES de conectar a BD
// Esto previene timeouts en Render
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

// Conectar a BD en background
connectDB()
  .then(() => console.log("✅ BD conectada"))
  .catch((error) => console.error("❌ Error BD:", error));
```

### 2.4 Configurar CORS en Express

`src/app.ts`:

```typescript
import express from "express";
import cors from "cors";

const app = express();

const corsOptions = {
  // ⚠️ IMPORTANTE: Usa exactamente el dominio de Vercel
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check (Render lo necesita)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
```

### 2.5 Desplegar en Render

1. Ve a **https://render.com**
2. Conecta tu repositorio GitHub
3. Crea nuevo **Web Service**
4. Configura:
   - **Name**: digital-alert-hub-backend
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Free (o Starter)

### 2.6 Variables de Entorno en Render

En Render Dashboard → **Environment**, agrega:

```
DB_HOST=ep-purple-fog-aiw6i0zl-pooler.c-4.us-east-1.aws.neon.tech
DB_USER=neondb_owner
DB_PASSWORD=npg_wHL1EWQrzlS2...
DB_NAME=neondb
DB_PORT=5432
JWT_SECRET=tu_secret_muy_largo
GOOGLE_CLIENT_ID=2396105994-...
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://digital-alert-hub-backend-rh08.onrender.com/api/auth/google/callback
EMAIL_USER=digitalalerthub@gmail.com
EMAIL_PASSWORD=abcg zaaw vrfy gbov
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://digital-alert-hub-frontend.vercel.app
```

### 2.7 Configurar Google OAuth en Backend

`src/config/googleStrategy.ts`:

```typescript
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

export default passport;
```

### 2.8 Rutas de Google OAuth

`src/routes/authGoogle.ts`:

```typescript
import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = Router();

router.get(
  "/google",
  (req, res, next) => {
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "consent",
      accessType: "offline",
    })(req, res, next);
  }
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req: any, res) => {
    const token = jwt.sign(
      {
        email: req.user.emails[0].value,
        name: req.user.displayName,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

export default router;
```

---

## 🎨 PARTE 3: DESPLEGAR FRONTEND EN VERCEL

### 3.1 Configuración de Vite

`vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
```

### 3.2 Configuración de Vercel

`vercel.json`:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

⚠️ **IMPORTANTE**: Este rewrite es esencial para que todas las rutas de la SPA se mapeen a `index.html`.

### 3.3 Variables de Entorno

`.env.production` (para Vercel):

```
VITE_API_URL=https://digital-alert-hub-backend-rh08.onrender.com/api
VITE_GOOGLE_CLIENT_ID=2396105994-dk5hh3h5740dt7taih66j1f76pmr5ds26.apps.googleusercontent.com
```

`.env.local` (para desarrollo local):

```
VITE_API_URL=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=2396105994-...
```

### 3.4 Servicio de API

`src/services/api.ts`:

```typescript
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Agregar token JWT si existe
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
```

### 3.5 Componente de Callback OAuth

`src/pages/Callback.tsx`:

```typescript
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("token", token);
      navigate("/dashboard", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <p>Autenticando...</p>
    </div>
  );
}

export default Callback;
```

### 3.6 Desplegar en Vercel

1. Ve a **https://vercel.com**
2. Conecta tu repositorio GitHub
3. Importa proyecto `digital-alert-hub-frontend`
4. Las variables de entorno se configuran automáticamente
5. Click en **Deploy**

### 3.7 Obtener URL Exacta

Después de desplegar, Vercel te asigna una URL. **Úsala siempre sin sufijo**:
```
https://digital-alert-hub-frontend.vercel.app
```

---

## 🔑 PARTE 4: CONFIGURAR GOOGLE OAUTH

### 4.1 En Google Cloud Console

1. Ve a **https://console.cloud.google.com**
2. Crea nuevo proyecto: "Digital Alert Hub"
3. Ve a **APIs & Services → Credentials**
4. Crea credencial: **OAuth 2.0 Client ID** → **Web application**

### 4.2 Orígenes Autorizados de JavaScript

Agrega en Google Cloud:
```
http://localhost:5173
https://digital-alert-hub-backend-rh08.onrender.com
https://digital-alert-hub-frontend.vercel.app
```

### 4.3 URIs de Redirección Autorizados

Agrega en Google Cloud:
```
http://localhost:4000/api/auth/google/callback
https://digital-alert-hub-backend-rh08.onrender.com/api/auth/google/callback
https://digital-alert-hub-frontend.vercel.app/auth/callback
```

### 4.4 Copiar Credenciales

Copia:
- **Client ID** → `GOOGLE_CLIENT_ID` en `.env`
- **Client Secret** → `GOOGLE_CLIENT_SECRET` en `.env`

---

## 📝 RESUMEN DE URLs Y CREDENCIALES

### URLs Activas

| Componente | URL |
|-----------|-----|
| Frontend | https://digital-alert-hub-frontend.vercel.app |
| Backend | https://digital-alert-hub-backend-rh08.onrender.com |
| Health Check | https://digital-alert-hub-backend-rh08.onrender.com/health |

### Credenciales (Guardadas en plataformas)

| Credencial | Lugar |
|-----------|-------|
| Google Client ID | Render Environment + Vercel Environment |
| Google Client Secret | Solo Render Environment (nunca en Frontend) |
| JWT Secret | Solo Render Environment |
| DB Credentials | Solo Render Environment |

---

## 🐛 TROUBLESHOOTING

### Problema 1: CORS Error

**Error**: `Access-Control-Allow-Origin header has a value that is not equal`

**Solución**:
1. Verifica que `FRONTEND_URL` en Render sea **exactamente** la URL que usas
2. No incluyas barras al final: `https://digital-alert-hub-frontend.vercel.app` (correcto)
3. Haz **Manual Deploy** en Render después de cambiar variables

### Problema 2: OAuth callback devuelve 404

**Error**: El callback redirige a Vercel pero devuelve 404

**Solución**:
1. Verifica `vercel.json` tiene las rewrites correctas
2. Asegúrate que existe la ruta `/auth/callback` en tu `App.tsx`
3. Force refresh en Vercel (ctrl+shift+r)

### Problema 3: Timeout en Render

**Error**: Deployment falla con `Timed Out`

**Solución**:
1. Inicia el servidor **antes** de conectarte a la BD (ya está configurado)
2. Verifica que Neon esté accesible (test connection)
3. Reduce timeout de BD en `src/config/db.ts`

### Problema 4: Base de datos no conecta

**Error**: `connection is insecure (try using sslmode=require)`

**Solución**:
1. Verifica `dialectOptions.ssl` en `src/config/db.ts`
2. Asegúrate que Neon URL incluya `?sslmode=require`

---

## 🚢 Comandos Útiles

### Desarrollo Local

```bash
# Backend
cd digital-alert-hub-backend
npm install
npm run dev

# Frontend (en otra terminal)
cd digital-alert-hub-frontend
npm install
npm run dev
```

### Desplegar cambios

```bash
# Backend a Render
cd digital-alert-hub-backend
git add .
git commit -m "Description"
git push origin main
# Render auto-deploya

# Frontend a Vercel
cd digital-alert-hub-frontend
git add .
git commit -m "Description"
git push origin main
# Vercel auto-deploya
```

### Ver logs

```bash
# Render logs
vercel logs [project-name] --follow

# Build logs en Render Dashboard
# → Deployments tab → Build Logs
```

---

## 📊 Estado Actual del Despliegue

✅ **Backend**: Render (digital-alert-hub-backend-rh08.onrender.com)
✅ **Frontend**: Vercel (digital-alert-hub-frontend.vercel.app)
✅ **Database**: Neon PostgreSQL (serverless)
✅ **OAuth**: Google (configurado en ambos servidores)
✅ **CORS**: Configurado correctamente
✅ **SSL**: Habilitado en Neon

---

## 🔄 Flujo de Autenticación

```
1. Usuario en Frontend hace click en "Iniciar sesión con Google"
   ↓
2. Frontend redirige a: Render/api/auth/google
   ↓
3. Google redirige a: Render/api/auth/google/callback
   ↓
4. Render valida y genera JWT
   ↓
5. Render redirige a: Vercel/auth/callback?token=JWT
   ↓
6. Frontend guarda token en localStorage
   ↓
7. Frontend redirije a /dashboard
   ↓
8. Todas las llamadas API incluyen Authorization: Bearer JWT
```

---

## 📚 Recursos Útiles

- [Documentación Render](https://render.com/docs)
- [Documentación Vercel](https://vercel.com/docs)
- [Documentación Neon](https://neon.tech/docs)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## 📞 Contacto y Soporte

Para problemas de despliegue:
1. Revisa los logs en cada plataforma
2. Verifica variables de entorno
3. Prueba health checks (`/health` en backend)
4. Revisa la consola del navegador para errores CORS

---

**Última actualización**: Febrero 2026
**Versión**: 1.0
