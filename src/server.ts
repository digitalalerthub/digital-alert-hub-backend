import dotenv from "dotenv";                          //  Cargamos las variables de entorno desde el archivo .env
dotenv.config();                    // Inicializamos dotenv (esto permite usar process.env.PORT, process.env.DB_HOST, etc.)

import { connectDB } from "./config/db";               //  Importamos la función de conexión a la base de datos
import { syncLocationCatalog } from "./services/locationCatalogService";

import app from "./app";                            //  Importamos la app principal (donde están las rutas y middlewares)

const PORT = process.env.PORT || 4000;             //  Definimos el puerto en el que correrá el servidor (por defecto 4000)
const parseBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};
const shouldSyncLocationCatalogOnBoot =
  parseBoolean(process.env.SYNC_LOCATION_CATALOG_ON_BOOT) ?? false;

// Iniciar el servidor ahora, sin esperar la BD
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});

// Conectar a BD en background
connectDB()
  .then(async () => {
    console.log("✅ Base de datos conectada exitosamente");

    if (!shouldSyncLocationCatalogOnBoot) {
      console.log("ℹ️ Sincronizacion de catalogo en arranque deshabilitada.");
      return;
    }

    await syncLocationCatalog();
    console.log("✅ Catalogo de comunas y barrios sincronizado");
  })
  .catch((error) => {
    console.error("❌ Error conectando a la base de datos:", error);
  });
