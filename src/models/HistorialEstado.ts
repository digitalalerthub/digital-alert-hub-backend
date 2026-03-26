import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface HistorialEstadoAttributes {
  id_historial: number;
  id_alerta: number;
  id_estado: number;
  created_by_id?: number | null;
  deleted_by_id?: number | null;
  created_at?: Date;
  updated_at?: Date | null;
  deleted_at?: Date | null;
}

type HistorialEstadoCreationAttributes = Optional<
  HistorialEstadoAttributes,
  | "id_historial"
  | "created_by_id"
  | "deleted_by_id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
>;

class HistorialEstado
  extends Model<HistorialEstadoAttributes, HistorialEstadoCreationAttributes>
  implements HistorialEstadoAttributes
{
  public id_historial!: number;
  public id_alerta!: number;
  public id_estado!: number;
  public created_by_id?: number | null;
  public deleted_by_id?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date | null;
  public readonly deleted_at!: Date | null;
}

HistorialEstado.init(
  {
    id_historial: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_historial",
    },
    id_alerta: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "id_alerta",
      references: {
        model: "alertas",
        key: "id_alerta",
      },
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
    created_by_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by_id",
    },
    deleted_by_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "deleted_by_id",
    },
  },
  {
    sequelize,
    tableName: "historial_estado",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
  }
);

export default HistorialEstado;
