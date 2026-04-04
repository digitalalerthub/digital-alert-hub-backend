"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          INSERT INTO roles (nombre_rol)
          VALUES
            ('Administrador'),
            ('Ciudadano'),
            ('JAC')
          ON CONFLICT (nombre_rol) DO NOTHING;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          INSERT INTO estados (nombre_estado, created_at, updated_at)
          VALUES
            ('Pendiente', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('En Progreso', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('Resuelta', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('Falsa Alerta', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (nombre_estado)
          DO UPDATE SET updated_at = EXCLUDED.updated_at;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          INSERT INTO reacciones (
            tipo,
            descrip_tipo_reaccion,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES
            ('👍', 'Me gusta / Confirmo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('😟', 'Preocupacion', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('✅', 'Solucionado', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('⚠️', 'Importante', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('❌', 'Falsa alerta', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
          ON CONFLICT (tipo)
          DO UPDATE SET
            descrip_tipo_reaccion = EXCLUDED.descrip_tipo_reaccion,
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          INSERT INTO categorias (
            nombre_categoria,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES
            ('Infraestructura Urbana', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('Riesgos y Emergencias', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('Seguridad y Convivencia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('Casos Sociales y Vulnerabilidad', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('Salud y Ambiente', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
            ('Alertas Comunitarias', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
          ON CONFLICT (nombre_categoria)
          DO UPDATE SET
            updated_at = EXCLUDED.updated_at,
            deleted_at = NULL;
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          DELETE FROM categorias
          WHERE nombre_categoria IN (
            'Infraestructura Urbana',
            'Riesgos y Emergencias',
            'Seguridad y Convivencia',
            'Casos Sociales y Vulnerabilidad',
            'Salud y Ambiente',
            'Alertas Comunitarias'
          );
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          DELETE FROM reacciones
          WHERE tipo IN ('👍', '😟', '✅', '⚠️', '❌');
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          DELETE FROM estados
          WHERE nombre_estado IN (
            'Pendiente',
            'En Progreso',
            'Resuelta',
            'Falsa Alerta'
          );
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          DELETE FROM roles
          WHERE nombre_rol IN ('Administrador', 'Ciudadano', 'JAC');
        `,
        { transaction }
      );
    });
  },
};
