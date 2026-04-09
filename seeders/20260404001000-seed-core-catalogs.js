"use strict";

const REACTIONS = [
  { tipo: "\u{1F44D}", descripcion: "Me gusta / Confirmo" },
  { tipo: "\u{1F61F}", descripcion: "Preocupacion" },
  { tipo: "\u{2705}", descripcion: "Solucionado" },
  { tipo: "\u{26A0}\u{FE0F}", descripcion: "Importante" },
  { tipo: "\u{274C}", descripcion: "Falsa alerta" },
];

const syncSequence = async (queryInterface, tableName, columnName, transaction) => {
  await queryInterface.sequelize.query(
    `
      SELECT setval(
        pg_get_serial_sequence('${tableName}', '${columnName}'),
        COALESCE((SELECT MAX(${columnName}) FROM ${tableName}), 0) + 1,
        false
      )
      WHERE pg_get_serial_sequence('${tableName}', '${columnName}') IS NOT NULL;
    `,
    { transaction }
  );
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await syncSequence(queryInterface, "roles", "id_rol", transaction);
      await syncSequence(queryInterface, "estados", "id_estado", transaction);
      await syncSequence(queryInterface, "reacciones", "id_reaccion", transaction);
      await syncSequence(queryInterface, "categorias", "id_categoria", transaction);

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
          ON CONFLICT (nombre_estado) DO NOTHING;
        `,
        { transaction }
      );

      const reactionReplacements = REACTIONS.reduce((accumulator, reaction, index) => {
        accumulator[`tipo${index}`] = reaction.tipo;
        accumulator[`descripcion${index}`] = reaction.descripcion;
        return accumulator;
      }, {});

      const reactionValuesSql = REACTIONS.map(
        (_, index) =>
          `(:tipo${index}, :descripcion${index}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)`
      ).join(",\n            ");

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
            ${reactionValuesSql}
          ON CONFLICT (tipo) DO NOTHING;
        `,
        {
          transaction,
          replacements: reactionReplacements,
        }
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
          ON CONFLICT (nombre_categoria) DO NOTHING;
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
          WHERE tipo IN (:tipos);
        `,
        {
          transaction,
          replacements: {
            tipos: REACTIONS.map((reaction) => reaction.tipo),
          },
        }
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
