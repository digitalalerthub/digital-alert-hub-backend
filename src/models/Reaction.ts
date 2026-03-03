import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface ReactionAttributes {
  id_reaccion: number;
  tipo: string;
  descrip_tipo_reaccion?: string | null;
  created_by_id?: number | null;
  deleted_by_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

type ReactionCreationAttributes = Optional<
  ReactionAttributes,
  "id_reaccion" | "descrip_tipo_reaccion" | "created_by_id" | "deleted_by_id" | "created_at" | "updated_at" | "deleted_at"
>;

class Reaction
  extends Model<ReactionAttributes, ReactionCreationAttributes>
  implements ReactionAttributes
{
  public id_reaccion!: number;
  public tipo!: string;
  public descrip_tipo_reaccion?: string | null;
  public created_by_id?: number | null;
  public deleted_by_id?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

Reaction.init(
  {
    id_reaccion: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_reaccion",
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    descrip_tipo_reaccion: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "descrip_tipo_reaccion",
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
    tableName: "reacciones",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
  }
);

export default Reaction;
