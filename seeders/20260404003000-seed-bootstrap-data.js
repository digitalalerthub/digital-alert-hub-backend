"use strict";

require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const DEFAULT_ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Admin";
const DEFAULT_ADMIN_LASTNAME = process.env.SEED_ADMIN_LASTNAME || "Principal";
const DEFAULT_ADMIN_PHONE = process.env.SEED_ADMIN_PHONE || "3000000000";
const SAMPLE_ALERT_TITLE = "Alumbrado publico averiado en el parque principal";
const SAMPLE_ALERT_DESCRIPTION =
  "Varias luminarias del parque principal no estan funcionando desde hace dos noches y la zona queda completamente oscura.";
const SAMPLE_ALERT_LOCATION = "Carrera 10 con Calle 12, frente al parque principal";
const SAMPLE_ALERT_EVIDENCE_URL =
  "https://res.cloudinary.com/demo/image/upload/sample.jpg";

const normalizeBaseUrl = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
};

const buildSetPasswordLink = (user) => {
  const frontendUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!frontendUrl || !jwtSecret) {
    return null;
  }

  const token = jwt.sign(
    {
      id: user.id_usuario,
      email: user.email,
      type: "set_password",
      version: user.password_action_version ?? 0,
    },
    jwtSecret,
    { expiresIn: "24h" }
  );

  return `${frontendUrl}/reset-password/${token}?mode=activation`;
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [adminRoleRows] = await queryInterface.sequelize.query(
        `
          SELECT id_rol, nombre_rol
          FROM roles
          WHERE LOWER(nombre_rol) IN ('administrador', 'admin')
          ORDER BY id_rol ASC
          LIMIT 1;
        `,
        { transaction }
      );
      const adminRole = adminRoleRows[0];

      if (!adminRole) {
        throw new Error("No se encontro un rol administrador. Ejecuta primero los seeders de catalogo.");
      }

      const [pendingStateRows] = await queryInterface.sequelize.query(
        `
          SELECT id_estado, nombre_estado
          FROM estados
          WHERE LOWER(nombre_estado) IN ('pendiente', 'nueva')
          ORDER BY id_estado ASC
          LIMIT 1;
        `,
        { transaction }
      );
      const pendingState = pendingStateRows[0];

      const [infraCategoryRows] = await queryInterface.sequelize.query(
        `
          SELECT id_categoria, nombre_categoria
          FROM categorias
          WHERE nombre_categoria = 'Infraestructura Urbana'
          LIMIT 1;
        `,
        { transaction }
      );
      const infraCategory = infraCategoryRows[0];

      const [sampleBarrioRows] = await queryInterface.sequelize.query(
        `
          SELECT b.id_barrio, b.id_comuna, b.nombre
          FROM barrios b
          INNER JOIN comunas c ON c.id_comuna = b.id_comuna
          WHERE c.id_comuna = 1 AND b.nombre = 'Parque Principal'
          LIMIT 1;
        `,
        { transaction }
      );
      const sampleBarrio = sampleBarrioRows[0];

      if (!pendingState || !infraCategory || !sampleBarrio) {
        throw new Error(
          "Faltan catalogos base para crear el bootstrap. Ejecuta primero los seeders de catalogos y ubicaciones."
        );
      }

      const [existingAdminRows] = await queryInterface.sequelize.query(
        `
          SELECT id_usuario, email, password_action_version, estado, email_verificado
          FROM usuarios
          WHERE email = :email
          LIMIT 1;
        `,
        {
          transaction,
          replacements: { email: DEFAULT_ADMIN_EMAIL },
        }
      );

      let adminUser = existingAdminRows[0];

      if (!adminUser) {
        const placeholderPassword = crypto.randomBytes(32).toString("hex");
        const hashedPassword = await bcrypt.hash(placeholderPassword, 10);

        const [insertedAdminRows] = await queryInterface.sequelize.query(
          `
            INSERT INTO usuarios (
              id_rol,
              nombre,
              apellido,
              email,
              contrasena,
              telefono,
              estado,
              email_verificado,
              password_action_version,
              oauth_login_version,
              session_version,
              intentos_fallidos,
              bloqueo_hasta,
              created_at,
              updated_at,
              deleted_at
            )
            VALUES (
              :id_rol,
              :nombre,
              :apellido,
              :email,
              :contrasena,
              :telefono,
              false,
              false,
              0,
              0,
              0,
              0,
              NULL,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP,
              NULL
            )
            RETURNING id_usuario, email, password_action_version, estado, email_verificado;
          `,
          {
            transaction,
            replacements: {
              id_rol: adminRole.id_rol,
              nombre: DEFAULT_ADMIN_NAME,
              apellido: DEFAULT_ADMIN_LASTNAME,
              email: DEFAULT_ADMIN_EMAIL,
              contrasena: hashedPassword,
              telefono: DEFAULT_ADMIN_PHONE,
            },
          }
        );

        adminUser = insertedAdminRows[0];
      }

      const [existingAlertRows] = await queryInterface.sequelize.query(
        `
          SELECT id_alerta
          FROM alertas
          WHERE titulo = :titulo
          LIMIT 1;
        `,
        {
          transaction,
          replacements: { titulo: SAMPLE_ALERT_TITLE },
        }
      );

      let sampleAlert = existingAlertRows[0];

      if (!sampleAlert) {
        const [insertedAlertRows] = await queryInterface.sequelize.query(
          `
            INSERT INTO alertas (
              id_usuario,
              id_estado,
              id_categoria,
              id_comuna,
              id_barrio,
              titulo,
              descripcion,
              ubicacion,
              prioridad,
              categoria,
              evidencia_url,
              evidencia_tipo,
              created_at,
              updated_at,
              deleted_at
            )
            VALUES (
              :id_usuario,
              :id_estado,
              :id_categoria,
              :id_comuna,
              :id_barrio,
              :titulo,
              :descripcion,
              :ubicacion,
              'Alta',
              :categoria,
              :evidencia_url,
              'image/jpeg',
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP,
              NULL
            )
            RETURNING id_alerta;
          `,
          {
            transaction,
            replacements: {
              id_usuario: adminUser.id_usuario,
              id_estado: pendingState.id_estado,
              id_categoria: infraCategory.id_categoria,
              id_comuna: sampleBarrio.id_comuna,
              id_barrio: sampleBarrio.id_barrio,
              titulo: SAMPLE_ALERT_TITLE,
              descripcion: SAMPLE_ALERT_DESCRIPTION,
              ubicacion: SAMPLE_ALERT_LOCATION,
              categoria: infraCategory.nombre_categoria,
              evidencia_url: SAMPLE_ALERT_EVIDENCE_URL,
            },
          }
        );

        sampleAlert = insertedAlertRows[0];
      }

      const [existingEvidenceRows] = await queryInterface.sequelize.query(
        `
          SELECT id_evidencia
          FROM evidencias
          WHERE id_alerta = :id_alerta AND url_evidencia = :url_evidencia
          LIMIT 1;
        `,
        {
          transaction,
          replacements: {
            id_alerta: sampleAlert.id_alerta,
            url_evidencia: SAMPLE_ALERT_EVIDENCE_URL,
          },
        }
      );

      if (!existingEvidenceRows[0]) {
        await queryInterface.sequelize.query(
          `
            INSERT INTO evidencias (
              id_alerta,
              tipo_evidencia,
              url_evidencia,
              created_by_id,
              deleted_by_id,
              created_at,
              updated_at,
              deleted_at
            )
            VALUES (
              :id_alerta,
              'image/jpeg',
              :url_evidencia,
              :created_by_id,
              NULL,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP,
              NULL
            );
          `,
          {
            transaction,
            replacements: {
              id_alerta: sampleAlert.id_alerta,
              url_evidencia: SAMPLE_ALERT_EVIDENCE_URL,
              created_by_id: adminUser.id_usuario,
            },
          }
        );
      }

      const [existingHistoryRows] = await queryInterface.sequelize.query(
        `
          SELECT id_historial
          FROM historial_estado
          WHERE id_alerta = :id_alerta AND id_estado = :id_estado
          LIMIT 1;
        `,
        {
          transaction,
          replacements: {
            id_alerta: sampleAlert.id_alerta,
            id_estado: pendingState.id_estado,
          },
        }
      );

      if (!existingHistoryRows[0]) {
        await queryInterface.sequelize.query(
          `
            INSERT INTO historial_estado (
              id_alerta,
              id_estado,
              created_by_id,
              deleted_by_id,
              created_at,
              updated_at,
              deleted_at
            )
            VALUES (
              :id_alerta,
              :id_estado,
              :created_by_id,
              NULL,
              CURRENT_TIMESTAMP,
              NULL,
              NULL
            );
          `,
          {
            transaction,
            replacements: {
              id_alerta: sampleAlert.id_alerta,
              id_estado: pendingState.id_estado,
              created_by_id: adminUser.id_usuario,
            },
          }
        );
      }

      const setupLink = buildSetPasswordLink(adminUser);
      if (setupLink && !adminUser.estado && !adminUser.email_verificado) {
        console.log(`Admin bootstrap creado para ${adminUser.email}.`);
        console.log("Enlace de configuracion inicial de contrasena:");
        console.log(setupLink);
      } else if (!setupLink && !adminUser.estado && !adminUser.email_verificado) {
        console.log(
          "Admin bootstrap creado, pero no se pudo generar el enlace de activacion porque faltan FRONTEND_URL o JWT_SECRET."
        );
        console.log(`Cuenta sembrada: ${adminUser.email}`);
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
          DELETE FROM alertas
          WHERE titulo = :titulo;
        `,
        {
          transaction,
          replacements: { titulo: SAMPLE_ALERT_TITLE },
        }
      );

      await queryInterface.sequelize.query(
        `
          DELETE FROM usuarios
          WHERE email = :email;
        `,
        {
          transaction,
          replacements: { email: DEFAULT_ADMIN_EMAIL },
        }
      );
    });
  },
};
