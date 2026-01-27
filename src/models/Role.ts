import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db";

class Role extends Model {
  public id_rol!: number;
  public nombre_rol!: string;
}

Role.init(
  {
    id_rol: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre_rol: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "roles",
    timestamps: false,
  }
);

export default Role;
