import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../config/db";

interface AlertReactionAttributes {
  id_alerta_reaccion: number;
  id_alerta: number;
  id_usuario: number;
  id_reaccion: number;
  created_at?: Date;
  updated_at?: Date;
}

type AlertReactionCreationAttributes = Optional<
  AlertReactionAttributes,
  "id_alerta_reaccion" | "created_at" | "updated_at"
>;

class AlertReaction
  extends Model<AlertReactionAttributes, AlertReactionCreationAttributes>
  implements AlertReactionAttributes
{
  public id_alerta_reaccion!: number;
  public id_alerta!: number;
  public id_usuario!: number;
  public id_reaccion!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

AlertReaction.init(
  {
    id_alerta_reaccion: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_alerta_reaccion",
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
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "id_usuario",
      references: {
        model: "usuarios",
        key: "id_usuario",
      },
    },
    id_reaccion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "id_reaccion",
      references: {
        model: "reacciones",
        key: "id_reaccion",
      },
    },
  },
  {
    sequelize,
    tableName: "alertas_reacciones",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["id_alerta", "id_usuario"],
      },
      {
        fields: ["id_alerta", "id_reaccion"],
      },
    ],
  }
);

export default AlertReaction;
