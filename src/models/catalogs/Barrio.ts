import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/db";

interface BarrioAttributes {
  id_barrio: number;
  id_comuna: number;
  nombre: string;
}

type BarrioCreationAttributes = Optional<BarrioAttributes, "id_barrio">;

class Barrio
  extends Model<BarrioAttributes, BarrioCreationAttributes>
  implements BarrioAttributes
{
  public id_barrio!: number;
  public id_comuna!: number;
  public nombre!: string;
}

Barrio.init(
  {
    id_barrio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: "id_barrio",
    },
    id_comuna: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "id_comuna",
      references: {
        model: "comunas",
        key: "id_comuna",
      },
    },
    nombre: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "barrios",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["id_comuna", "nombre"],
      },
    ],
  }
);

export default Barrio;
