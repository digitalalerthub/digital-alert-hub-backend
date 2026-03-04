import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface EvidenceAttributes {
  id_evidencia: number;
  id_alerta: number;
  tipo_evidencia?: string | null;
  url_evidencia: string;
  created_by_id?: number | null;
  deleted_by_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

type EvidenceCreationAttributes = Optional<
  EvidenceAttributes,
  "id_evidencia" | "tipo_evidencia" | "created_by_id" | "deleted_by_id" | "created_at" | "updated_at" | "deleted_at"
>;

class Evidence
  extends Model<EvidenceAttributes, EvidenceCreationAttributes>
  implements EvidenceAttributes
{
  public id_evidencia!: number;
  public id_alerta!: number;
  public tipo_evidencia?: string | null;
  public url_evidencia!: string;
  public created_by_id?: number | null;
  public deleted_by_id?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

Evidence.init(
  {
    id_evidencia: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_evidencia",
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
    tipo_evidencia: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "tipo_evidencia",
    },
    url_evidencia: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "url_evidencia",
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
    tableName: "evidencias",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
    indexes: [
      {
        fields: ["id_alerta", "created_at"],
      },
    ],
  }
);

export default Evidence;
