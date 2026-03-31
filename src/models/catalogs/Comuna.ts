import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../config/db";

class Comuna extends Model {
  public id_comuna!: number;
  public nombre!: string;
}

Comuna.init(
  {
    id_comuna: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    tableName: "comunas",
    timestamps: false,
  }
);

export default Comuna;
