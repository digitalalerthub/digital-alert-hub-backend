import { connectDB } from "./config/db"; //  Función de conexión a la base de datos
import dotenv from "dotenv"; //  Carga las variables de entorno desde el archivo .env

import app from "./app"; //  Importamos la app principal (donde están las rutas y middlewares)

dotenv.config(); // Inicializamos dotenv (esto permite usar process.env.PORT, process.env.DB_HOST, etc.)

const PORT = process.env.PORT || 4000; //  Definimos el puerto en el que correrá el servidor (por defecto 4000)

connectDB().then(() => {
  //  Conectamos a la base de datos y, si todo sale bien, levantamos el servidor
  app.listen(PORT, () => {
    //  Una vez la conexión a la BD está establecida, iniciamos el servidor Express
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
});
