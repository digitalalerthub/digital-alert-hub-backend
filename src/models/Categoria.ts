import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface CategoriaAttributes {
  id_categoria: number;
  nombre_categoria: string;
  created_by_id?: number | null;
  deleted_by_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

type CategoriaCreationAttributes = Optional<
  CategoriaAttributes,
  | "id_categoria"
  | "created_by_id"
  | "deleted_by_id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
>;

class Categoria
  extends Model<CategoriaAttributes, CategoriaCreationAttributes>
  implements CategoriaAttributes
{
  public id_categoria!: number;
  public nombre_categoria!: string;
  public created_by_id?: number | null;
  public deleted_by_id?: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;
}

Categoria.init(
  {
    id_categoria: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_categoria",
    },
    nombre_categoria: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "nombre_categoria",
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
    tableName: "categorias",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    paranoid: true,
  }
);

export default Categoria;
