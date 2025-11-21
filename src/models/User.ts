import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

//  Interface que define los atributos del modelo 'Usuario'.
interface UsuarioAttributes {
  // Básicamente describe cómo es la tabla en la base de datos.
  id_usuario: number;
  id_rol: number;
  nombre: string;
  apellido: string;
  email: string;
  contrasena: string;
  telefono?: string | null;
  estado: boolean;
}

//  Define qué campos son opcionales al crear un usuario.
type UsuarioCreationAttributes = Optional<UsuarioAttributes, "id_usuario">; // En este caso, 'id_usuario' porque lo genera automáticamente la BD.

//  Clase que representa el modelo en Sequelize.
class Usuario // Usa los tipos anteriores para asegurar que todo esté bien definido.
  extends Model<UsuarioAttributes, UsuarioCreationAttributes>
  implements UsuarioAttributes
{
  // Campos del modelo (tipados igual que la interface)
  public id_usuario!: number;
  public id_rol!: number;
  public nombre!: string;
  public apellido!: string;
  public email!: string;
  public contrasena!: string;
  public telefono?: string | null;
  public estado!: boolean;
}

//  Definición del modelo Sequelize -> cómo se mapea con la tabla 'usuarios'
Usuario.init(
  {
    id_usuario: {
      type: DataTypes.INTEGER,
      autoIncrement: true, //  id_usuario: clave primaria, autoincremental
      primaryKey: true,
    },
    id_rol: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true, // valida que tenga formato de correo
      },
    },
    contrasena: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // por defecto el usuario está activo
    },
  },
  {
    sequelize, // conexión con la base de datos
    tableName: "usuarios", // nombre de la tabla real
    timestamps: false, // evita columnas automáticas createdAt / updatedAt
  }
);

export default Usuario;
