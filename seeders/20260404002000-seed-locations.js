"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          INSERT INTO comunas (id_comuna, nombre)
          VALUES
            (1, 'Comuna 1 - Centro'),
            (2, 'Comuna 2 - Norte'),
            (3, 'Comuna 3 - Sur')
          ON CONFLICT (id_comuna)
          DO UPDATE SET nombre = EXCLUDED.nombre;
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          INSERT INTO barrios (id_comuna, nombre)
          VALUES
            (1, 'Centro Historico'),
            (1, 'Parque Principal'),
            (2, 'Villa Nueva'),
            (2, 'Los Alpes'),
            (3, 'San Miguel'),
            (3, 'Mirador del Sur')
          ON CONFLICT (id_comuna, nombre) DO NOTHING;
        `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          DELETE FROM barrios
          WHERE (id_comuna, nombre) IN (
            (1, 'Centro Historico'),
            (1, 'Parque Principal'),
            (2, 'Villa Nueva'),
            (2, 'Los Alpes'),
            (3, 'San Miguel'),
            (3, 'Mirador del Sur')
          );
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
          DELETE FROM comunas
          WHERE id_comuna IN (1, 2, 3);
        `,
        { transaction }
      );
    });
  },
};
