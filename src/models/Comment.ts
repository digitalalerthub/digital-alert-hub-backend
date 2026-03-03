import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface CommentAttributes {
  id_comentario: number;
  id_usuario: number;
  id_alerta: number;
  texto_comentario: string;
  created_by_id?: number | null;
  deleted_by_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

type CommentCreationAttributes = Optional<
  CommentAttributes,
  "id_comentario" | "created_by_id" | "deleted_by_id" | "created_at" | "updated_at" | "deleted_at"
>;

class Comment
  extends Model<CommentAttributes, CommentCreationAttributes>
  implements CommentAttributes
{
  public id_comentario!: number;
  public id_usuario!: number;
  public id_alerta!: number;
  public texto_comentario!: string;
  public created_by_id?: number | null;
  public deleted_by_id?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

Comment.init(
  {
    id_comentario: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_comentario",
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "id_usuario",
      references: {
        model: "usuarios",
        key: "id_usuario",
      },
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
    texto_comentario: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "texto_comentario",
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
    tableName: "comentarios",
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

export default Comment;
