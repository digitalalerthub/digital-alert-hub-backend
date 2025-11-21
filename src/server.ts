import { connectDB } from "./config/db";
import dotenv from "dotenv";
import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
});
