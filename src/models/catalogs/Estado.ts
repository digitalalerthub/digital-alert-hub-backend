import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/db";

interface EstadoAttributes {
  id_estado: number;
  nombre_estado: string;
  created_at?: Date;
  updated_at?: Date;
}

type EstadoCreationAttributes = Optional<
  EstadoAttributes,
  "id_estado" | "created_at" | "updated_at"
>;

class Estado
  extends Model<EstadoAttributes, EstadoCreationAttributes>
  implements EstadoAttributes
{
  public id_estado!: number;
  public nombre_estado!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Estado.init(
  {
    id_estado: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_estado",
    },
    nombre_estado: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "nombre_estado",
    },
  },
  {
    sequelize,
    tableName: "estados",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Estado;
