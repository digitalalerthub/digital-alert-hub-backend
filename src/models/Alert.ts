import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface AlertaAttributes {
  id_alerta: number;
  id_usuario: number;
  id_estado: number;
  titulo: string;
  descripcion: string;
  ubicacion?: string;
  prioridad?: string;
  categoria: string;
  evidencia_url?: string;
  evidencia_tipo?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date;
}

type AlertaCreationAttributes = Optional<
  AlertaAttributes,
  | "id_alerta"
  | "prioridad"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "ubicacion"
  | "evidencia_url"
  | "evidencia_tipo"
>;

class Alerta
  extends Model<AlertaAttributes, AlertaCreationAttributes>
  implements AlertaAttributes
{
  public id_alerta!: number;
  public id_usuario!: number;
  public id_estado!: number;
  public titulo!: string;
  public descripcion!: string;
  public ubicacion?: string;
  public prioridad?: string;
  public categoria!: string;
  public evidencia_url?: string;
  public evidencia_tipo?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date;
}

Alerta.init(
  {
    id_alerta: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_alerta",
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "id_usuario",
    },
    id_estado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "id_estado",
      references: {
        model: "estados",
        key: "id_estado",
      },
    },
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ubicacion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    prioridad: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    categoria: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    evidencia_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    evidencia_tipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "alertas",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
  }
);

export default Alerta;
