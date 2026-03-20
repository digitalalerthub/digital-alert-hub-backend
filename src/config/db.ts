import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const parseBoolean = (value: string | undefined): boolean | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

const databaseUrl = process.env.DATABASE_URL?.trim();
const explicitDbSsl = parseBoolean(process.env.DB_SSL);
const explicitSqlLogging = parseBoolean(process.env.DB_LOG_SQL);
const shouldUseSsl =
  explicitDbSsl ??
  Boolean(
    process.env.NODE_ENV === "production" ||
      databaseUrl ||
      process.env.DB_HOST?.includes("neon.tech")
  );
const shouldLogSql = explicitSqlLogging ?? false;

const baseOptions = {
  dialect: "postgres" as const,
  logging: shouldLogSql ? console.log : false,
  dialectOptions: shouldUseSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
};

export const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, baseOptions)
  : new Sequelize(
      process.env.DB_NAME as string,
      process.env.DB_USER as string,
      process.env.DB_PASSWORD as string,
      {
        ...baseOptions,
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
      }
    );

const ensureAlertLocationSchema = async (): Promise<void> => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS comunas (
      id_comuna INTEGER PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL UNIQUE
    );
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS barrios (
      id_barrio SERIAL PRIMARY KEY,
      id_comuna INTEGER NOT NULL REFERENCES comunas(id_comuna),
      nombre VARCHAR(180) NOT NULL
    );
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS barrios_id_comuna_nombre_key
    ON barrios (id_comuna, nombre);
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'alertas'
      ) THEN
        ALTER TABLE alertas
        ADD COLUMN IF NOT EXISTS id_comuna INTEGER;

        ALTER TABLE alertas
        ADD COLUMN IF NOT EXISTS id_barrio INTEGER;
      END IF;
    END $$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'alertas'
      ) THEN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'alertas_id_comuna_fkey'
        ) THEN
          ALTER TABLE alertas
          ADD CONSTRAINT alertas_id_comuna_fkey
          FOREIGN KEY (id_comuna)
          REFERENCES comunas(id_comuna);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'alertas_id_barrio_fkey'
        ) THEN
          ALTER TABLE alertas
          ADD CONSTRAINT alertas_id_barrio_fkey
          FOREIGN KEY (id_barrio)
          REFERENCES barrios(id_barrio);
        END IF;
      END IF;
    END $$;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_alertas_id_comuna
    ON alertas (id_comuna);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_alertas_id_barrio
    ON alertas (id_barrio);
  `);
};

const ensureAlertCatalogs = async (): Promise<void> => {
  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'estados'
      ) THEN
        INSERT INTO estados (id_estado, nombre_estado, created_at, updated_at)
        VALUES
          (1, 'Nueva', '2025-09-25 16:05:39.569573', NOW()),
          (2, 'En Progreso', '2025-09-25 16:05:39.569573', NOW()),
          (3, 'Resuelta', '2025-09-25 16:05:39.569573', NOW()),
          (4, 'Falsa Alerta', '2025-09-25 16:05:39.569573', NOW())
        ON CONFLICT (id_estado)
        DO UPDATE SET
          nombre_estado = EXCLUDED.nombre_estado,
          updated_at = NOW();
      END IF;
    END $$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'reacciones'
      ) THEN
        INSERT INTO reacciones (
          id_reaccion,
          tipo,
          descrip_tipo_reaccion,
          created_at,
          updated_at
        )
        VALUES
          (1, '👍', 'Me gusta / Confirmo', '2025-09-25 16:05:39.569573', NOW()),
          (2, '😨', 'Preocupación', '2025-09-25 16:05:39.569573', NOW()),
          (3, '✅', 'Solucionado', '2025-09-25 16:05:39.569573', NOW()),
          (4, '⚠️', 'Importante', '2025-09-25 16:05:39.569573', NOW()),
          (5, '❌', 'Falsa Alerta', '2025-09-25 16:05:39.569573', NOW())
        ON CONFLICT (id_reaccion)
        DO UPDATE SET
          tipo = EXCLUDED.tipo,
          descrip_tipo_reaccion = EXCLUDED.descrip_tipo_reaccion,
          updated_at = NOW();
      END IF;
    END $$;
  `);
};

const ensureAlertReactionSchema = async (): Promise<void> => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS alertas_reacciones (
      id_alerta_reaccion SERIAL PRIMARY KEY,
      id_alerta INTEGER NOT NULL REFERENCES alertas(id_alerta) ON DELETE CASCADE,
      id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
      id_reaccion INTEGER NOT NULL REFERENCES reacciones(id_reaccion) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS alertas_reacciones_id_alerta_id_usuario
    ON alertas_reacciones (id_alerta, id_usuario);
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS alertas_reacciones_id_alerta_id_reaccion
    ON alertas_reacciones (id_alerta, id_reaccion);
  `);
};

const ensureAlertCommentSchema = async (): Promise<void> => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id_comentario SERIAL PRIMARY KEY,
      id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
      id_alerta INTEGER NOT NULL REFERENCES alertas(id_alerta) ON DELETE CASCADE,
      texto_comentario TEXT NOT NULL,
      created_by_id INTEGER NULL,
      deleted_by_id INTEGER NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITHOUT TIME ZONE NULL
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_comentarios_id_alerta_created_at
    ON comentarios (id_alerta, created_at);
  `);
};

const ensureUserAuthSchema = async (): Promise<void> => {
  await sequelize.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN;
  `);

  await sequelize.query(`
    UPDATE usuarios
    SET email_verificado = COALESCE(email_verificado, estado, false)
    WHERE email_verificado IS NULL;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN email_verificado SET DEFAULT false;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN email_verificado SET NOT NULL;
  `);
};

export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log("Conexion a PostgreSQL establecida correctamente.");

    await ensureAlertLocationSchema();
    console.log("Esquema de comunas, barrios y alertas validado.");

    await ensureAlertCatalogs();
    console.log("Catalogos de estados y reacciones validados.");

    await ensureAlertReactionSchema();
    console.log("Esquema de reacciones por alerta validado.");

    await ensureAlertCommentSchema();
    console.log("Esquema de comentarios por alerta validado.");

    await ensureUserAuthSchema();
    console.log("Estado de verificacion y activacion de usuarios validado.");

    // Mantener sync global solo bajo bandera explicita.
    const shouldSync = String(process.env.DB_SYNC).toLowerCase() === "true";
    if (shouldSync) {
      try {
        await sequelize.sync({ alter: true });
        console.log("Modelos sincronizados con la base de datos.");
      } catch (syncError) {
        console.warn("No se pudo ejecutar sequelize.sync global; continuando sin sync:", syncError);
      }
    }
  } catch (error) {
    console.error("Error al conectar con PostgreSQL:", error);
    process.exit(1);
  }
};
