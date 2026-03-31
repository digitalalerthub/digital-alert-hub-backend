import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/db";

interface UsuarioAttributes {
  id_usuario: number;
  id_rol: number;
  nombre: string;
  apellido: string;
  email: string;
  contrasena: string;
  telefono?: string | null;
  estado: boolean;
  email_verificado: boolean;
  intentos_fallidos: number;
  bloqueo_hasta?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

type UsuarioCreationAttributes = Optional<
  UsuarioAttributes,
  "id_usuario" | "intentos_fallidos" | "bloqueo_hasta"
>;

class Usuario
  extends Model<UsuarioAttributes, UsuarioCreationAttributes>
  implements UsuarioAttributes
{
  public id_usuario!: number;
  public id_rol!: number;
  public nombre!: string;
  public apellido!: string;
  public email!: string;
  public contrasena!: string;
  public telefono?: string | null;
  public estado!: boolean;
  public email_verificado!: boolean;
  public intentos_fallidos!: number;
  public bloqueo_hasta?: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

Usuario.init(
  {
    id_usuario: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
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
        isEmail: true,
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
      defaultValue: true,
    },
    email_verificado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    intentos_fallidos: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    bloqueo_hasta: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "usuarios",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: false,
  }
);

export default Usuario;
