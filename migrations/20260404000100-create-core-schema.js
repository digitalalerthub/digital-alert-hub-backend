"use strict";

const tableExists = async (queryInterface, tableName, transaction) => {
  try {
    await queryInterface.describeTable(tableName, { transaction });
    return true;
  } catch (error) {
    const originalCode = error?.original?.code;
    const message = String(error?.message || "");

    if (originalCode === "42P01" || message.includes("No description found for")) {
      return false;
    }

    throw error;
  }
};

const indexExists = async (queryInterface, tableName, indexName, transaction) => {
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return false;
  }

  const indexes = await queryInterface.showIndex(tableName, { transaction });
  return indexes.some((index) => index.name === indexName);
};

const createTableIfMissing = async (
  queryInterface,
  tableName,
  attributes,
  transaction
) => {
  if (await tableExists(queryInterface, tableName, transaction)) {
    return false;
  }

  await queryInterface.createTable(tableName, attributes, { transaction });
  return true;
};

const addIndexIfMissing = async (
  queryInterface,
  tableName,
  fields,
  indexOptions,
  transaction
) => {
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  if (await indexExists(queryInterface, tableName, indexOptions.name, transaction)) {
    return;
  }

  await queryInterface.addIndex(tableName, fields, {
    ...indexOptions,
    transaction,
  });
};

const dropTableIfExists = async (queryInterface, tableName, transaction) => {
  if (!(await tableExists(queryInterface, tableName, transaction))) {
    return;
  }

  await queryInterface.dropTable(tableName, { transaction });
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await createTableIfMissing(
        queryInterface,
        "roles",
        {
          id_rol: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          nombre_rol: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "roles",
        ["nombre_rol"],
        {
          name: "roles_nombre_rol_key",
          unique: true,
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "usuarios",
        {
          id_usuario: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          id_rol: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "roles",
              key: "id_rol",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          nombre: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          apellido: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          email: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          contrasena: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          telefono: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          estado: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          email_verificado: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          password_action_version: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          oauth_login_version: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          session_version: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          intentos_fallidos: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          bloqueo_hasta: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "usuarios",
        ["email"],
        {
          name: "usuarios_email_key",
          unique: true,
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "usuarios",
        ["id_rol"],
        {
          name: "idx_usuarios_id_rol",
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "estados",
        {
          id_estado: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          nombre_estado: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "estados",
        ["nombre_estado"],
        {
          name: "estados_nombre_estado_key",
          unique: true,
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "reacciones",
        {
          id_reaccion: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          tipo: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },
          descrip_tipo_reaccion: {
            type: Sequelize.STRING(150),
            allowNull: true,
          },
          created_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          deleted_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "reacciones",
        ["tipo"],
        {
          name: "reacciones_tipo_key",
          unique: true,
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "categorias",
        {
          id_categoria: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          nombre_categoria: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          created_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          deleted_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "categorias",
        ["nombre_categoria"],
        {
          name: "categorias_nombre_categoria_key",
          unique: true,
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "comunas",
        {
          id_comuna: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
          },
          nombre: {
            type: Sequelize.STRING(120),
            allowNull: false,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "comunas",
        ["nombre"],
        {
          name: "comunas_nombre_key",
          unique: true,
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "barrios",
        {
          id_barrio: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          id_comuna: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "comunas",
              key: "id_comuna",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          nombre: {
            type: Sequelize.STRING(180),
            allowNull: false,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "barrios",
        ["id_comuna", "nombre"],
        {
          name: "barrios_id_comuna_nombre_key",
          unique: true,
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "alertas",
        {
          id_alerta: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          id_usuario: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "usuarios",
              key: "id_usuario",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          id_estado: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "estados",
              key: "id_estado",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          id_categoria: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "categorias",
              key: "id_categoria",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          id_comuna: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "comunas",
              key: "id_comuna",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          id_barrio: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "barrios",
              key: "id_barrio",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          titulo: {
            type: Sequelize.STRING(200),
            allowNull: false,
          },
          descripcion: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          ubicacion: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          prioridad: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          categoria: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          evidencia_url: {
            type: Sequelize.STRING(500),
            allowNull: true,
          },
          evidencia_tipo: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "alertas",
        ["id_estado"],
        {
          name: "idx_alertas_id_estado",
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "alertas",
        ["id_categoria"],
        {
          name: "idx_alertas_id_categoria",
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "alertas",
        ["id_comuna"],
        {
          name: "idx_alertas_id_comuna",
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "alertas",
        ["id_barrio"],
        {
          name: "idx_alertas_id_barrio",
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "evidencias",
        {
          id_evidencia: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          id_alerta: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "alertas",
              key: "id_alerta",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          tipo_evidencia: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          url_evidencia: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          created_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          deleted_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "evidencias",
        ["id_alerta", "created_at"],
        {
          name: "idx_evidencias_id_alerta_created_at",
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "comentarios",
        {
          id_comentario: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          id_usuario: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "usuarios",
              key: "id_usuario",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          id_alerta: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "alertas",
              key: "id_alerta",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          texto_comentario: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          created_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          deleted_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "comentarios",
        ["id_alerta", "created_at"],
        {
          name: "idx_comentarios_id_alerta_created_at",
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "alertas_reacciones",
        {
          id_alerta_reaccion: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          id_alerta: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "alertas",
              key: "id_alerta",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          id_usuario: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "usuarios",
              key: "id_usuario",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          id_reaccion: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "reacciones",
              key: "id_reaccion",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "alertas_reacciones",
        ["id_alerta", "id_usuario"],
        {
          name: "alertas_reacciones_id_alerta_id_usuario",
          unique: true,
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "alertas_reacciones",
        ["id_alerta", "id_reaccion"],
        {
          name: "alertas_reacciones_id_alerta_id_reaccion",
        },
        transaction
      );

      await createTableIfMissing(
        queryInterface,
        "historial_estado",
        {
          id_historial: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          id_alerta: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "alertas",
              key: "id_alerta",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          id_estado: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: "estados",
              key: "id_estado",
            },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          created_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          deleted_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        transaction
      );

      await addIndexIfMissing(
        queryInterface,
        "historial_estado",
        ["id_alerta", "created_at"],
        {
          name: "idx_historial_estado_id_alerta_created_at",
        },
        transaction
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await dropTableIfExists(queryInterface, "historial_estado", transaction);
      await dropTableIfExists(queryInterface, "alertas_reacciones", transaction);
      await dropTableIfExists(queryInterface, "comentarios", transaction);
      await dropTableIfExists(queryInterface, "evidencias", transaction);
      await dropTableIfExists(queryInterface, "alertas", transaction);
      await dropTableIfExists(queryInterface, "barrios", transaction);
      await dropTableIfExists(queryInterface, "comunas", transaction);
      await dropTableIfExists(queryInterface, "categorias", transaction);
      await dropTableIfExists(queryInterface, "reacciones", transaction);
      await dropTableIfExists(queryInterface, "estados", transaction);
      await dropTableIfExists(queryInterface, "usuarios", transaction);
      await dropTableIfExists(queryInterface, "roles", transaction);
    });
  },
};
