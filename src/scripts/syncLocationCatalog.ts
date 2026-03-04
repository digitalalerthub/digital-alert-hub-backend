import dotenv from "dotenv";
import { connectDB, sequelize } from "../config/db";
import { syncLocationCatalog } from "../services/locationCatalogService";

dotenv.config();

const run = async (): Promise<void> => {
  try {
    await connectDB();
    await syncLocationCatalog();
    console.log("Catalogo de comunas y barrios sincronizado manualmente.");
  } catch (error) {
    console.error("No se pudo sincronizar el catalogo de ubicaciones:", error);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch {
      // Ignorar errores al cerrar conexiones al salir.
    }
  }
};

run().then(() => process.exit(0));
