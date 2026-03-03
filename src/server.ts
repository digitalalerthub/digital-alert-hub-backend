import dotenv from "dotenv";                          //  Cargamos las variables de entorno desde el archivo .env
dotenv.config();                    // Inicializamos dotenv (esto permite usar process.env.PORT, process.env.DB_HOST, etc.)

import { connectDB } from "./config/db";               //  Importamos la función de conexión a la base de datos
import { syncLocationCatalog } from "./services/locationCatalogService";

import app from "./app";                            //  Importamos la app principal (donde están las rutas y middlewares)

const PORT = process.env.PORT || 4000;             //  Definimos el puerto en el que correrá el servidor (por defecto 4000)

// Iniciar el servidor ahora, sin esperar la BD
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

// Conectar a BD en background
connectDB()
  .then(() => {
    console.log("✅ Base de datos conectada exitosamente");
    return syncLocationCatalog();
  })
  .then(() => {
    console.log("✅ Catalogo de comunas y barrios sincronizado");
  })
  .catch((error) => {
    console.error("❌ Error conectando a la base de datos:", error);
  });
