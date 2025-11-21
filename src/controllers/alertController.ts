import { Request, Response } from "express"; // Importamos los tipos Request y Response de Express para tipar correctamente las funciones
import Alerta from "../models/Alert"; // Importamos el modelo Alerta, que representa la tabla de alertas en la base de datos

export const createAlerta = async (req: Request, res: Response) => {
  //  Controlador para crear una nueva alerta
  try {
    const { titulo, descripcion, categoria, ubicacion } = req.body; // Extraemos los datos que vienen del cuerpo (body) de la petición

    // Obtenemos el id del usuario autenticado (que debería estar guardado en req.user)
    // Se hace un "cast" a any porque Express no define la propiedad "user" por defecto
    const id_usuario = (req as any).user.id;

    const newAlerta = await Alerta.create({
      // Creamos una nueva alerta en la base de datos usando Sequelize
      titulo,
      descripcion,
      categoria,
      ubicacion,
      id_usuario,
      id_estado: 1, // Asignamos un estado inicial (por ejemplo, 1 para "nueva")
    });

    res
      .status(201)
      .json({ message: "Alerta creada con éxito", alert: newAlerta }); // Respondemos con código 201 (creado exitosamente) y la alerta creada
  } catch (error) {
    res.status(500).json({ error: "Error al crear alerta" }); // Si ocurre algún error (por ejemplo, falta un campo o falla la BD)
    console.error(error); // Logueamos el error en la consola para depuración
  }
};

export const listAlerta = async (_req: Request, res: Response) => {
  //  Controlador para listar todas las alertas registradas
  try {
    const alertas = await Alerta.findAll(); // Obtenemos todas las alertas de la base de datos
    res.json(alertas); // Enviamos las alertas como respuesta en formato JSON
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las alertas" });
  }
};
