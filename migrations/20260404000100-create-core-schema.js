"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("roles", ["nombre_rol"], {
        name: "roles_nombre_rol_key",
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("usuarios", ["email"], {
        name: "usuarios_email_key",
        unique: true,
        transaction,
      });

      await queryInterface.addIndex("usuarios", ["id_rol"], {
        name: "idx_usuarios_id_rol",
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("estados", ["nombre_estado"], {
        name: "estados_nombre_estado_key",
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("reacciones", ["tipo"], {
        name: "reacciones_tipo_key",
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("categorias", ["nombre_categoria"], {
        name: "categorias_nombre_categoria_key",
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("comunas", ["nombre"], {
        name: "comunas_nombre_key",
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("barrios", ["id_comuna", "nombre"], {
        name: "barrios_id_comuna_nombre_key",
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("alertas", ["id_estado"], {
        name: "idx_alertas_id_estado",
        transaction,
      });

      await queryInterface.addIndex("alertas", ["id_categoria"], {
        name: "idx_alertas_id_categoria",
        transaction,
      });

      await queryInterface.addIndex("alertas", ["id_comuna"], {
        name: "idx_alertas_id_comuna",
        transaction,
      });

      await queryInterface.addIndex("alertas", ["id_barrio"], {
        name: "idx_alertas_id_barrio",
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("evidencias", ["id_alerta", "created_at"], {
        name: "idx_evidencias_id_alerta_created_at",
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("comentarios", ["id_alerta", "created_at"], {
        name: "idx_comentarios_id_alerta_created_at",
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("alertas_reacciones", ["id_alerta", "id_usuario"], {
        name: "alertas_reacciones_id_alerta_id_usuario",
        unique: true,
        transaction,
      });

      await queryInterface.addIndex("alertas_reacciones", ["id_alerta", "id_reaccion"], {
        name: "alertas_reacciones_id_alerta_id_reaccion",
        transaction,
      });

      await queryInterface.createTable(
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
        { transaction }
      );

      await queryInterface.addIndex("historial_estado", ["id_alerta", "created_at"], {
        name: "idx_historial_estado_id_alerta_created_at",
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable("historial_estado", { transaction });
      await queryInterface.dropTable("alertas_reacciones", { transaction });
      await queryInterface.dropTable("comentarios", { transaction });
      await queryInterface.dropTable("evidencias", { transaction });
      await queryInterface.dropTable("alertas", { transaction });
      await queryInterface.dropTable("barrios", { transaction });
      await queryInterface.dropTable("comunas", { transaction });
      await queryInterface.dropTable("categorias", { transaction });
      await queryInterface.dropTable("reacciones", { transaction });
      await queryInterface.dropTable("estados", { transaction });
      await queryInterface.dropTable("usuarios", { transaction });
      await queryInterface.dropTable("roles", { transaction });
    });
  },
};
