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

const ensureAlertCategorySchema = async (): Promise<void> => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS categorias (
      id_categoria SERIAL PRIMARY KEY,
      nombre_categoria VARCHAR(150) NOT NULL,
      created_by_id INTEGER NULL,
      deleted_by_id INTEGER NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITHOUT TIME ZONE NULL
    );
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS categorias_nombre_categoria_key
    ON categorias (nombre_categoria);
  `);

  await sequelize.query(`
    INSERT INTO categorias (nombre_categoria, created_at, updated_at)
    VALUES
      ('Infraestructura Urbana', NOW(), NOW()),
      ('Riesgos y Emergencias', NOW(), NOW()),
      ('Seguridad y Convivencia', NOW(), NOW()),
      ('Casos Sociales y Vulnerabilidad', NOW(), NOW()),
      ('Salud y Ambiente', NOW(), NOW()),
      ('Alertas Comunitarias', NOW(), NOW())
    ON CONFLICT (nombre_categoria)
    DO UPDATE SET updated_at = EXCLUDED.updated_at;
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
        ADD COLUMN IF NOT EXISTS id_categoria INTEGER;
      END IF;
    END $$;
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_alertas_id_categoria
    ON alertas (id_categoria);
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'alertas'
      ) THEN
        UPDATE alertas
        SET id_categoria = categorias.id_categoria
        FROM categorias
        WHERE alertas.id_categoria IS NULL
          AND categorias.nombre_categoria = CASE
            WHEN LOWER(BTRIM(alertas.categoria)) IN (
              'agua',
              'energia',
              'gas',
              'movilidad',
              'espacio publico',
              'infraestructura',
              'alcantarillado',
              'alumbrado publico',
              'malla vial',
              'servicios publicos'
            ) THEN 'Infraestructura Urbana'
            WHEN LOWER(BTRIM(alertas.categoria)) IN ('riesgo', 'riesgos', 'emergencia', 'emergencias')
              THEN 'Riesgos y Emergencias'
            WHEN LOWER(BTRIM(alertas.categoria)) IN ('seguridad', 'convivencia')
              THEN 'Seguridad y Convivencia'
            WHEN LOWER(BTRIM(alertas.categoria)) IN ('aseo', 'residuos', 'salud', 'ambiente')
              THEN 'Salud y Ambiente'
            WHEN LOWER(BTRIM(alertas.categoria)) IN (
              'casos sociales',
              'vulnerabilidad',
              'casos sociales y vulnerabilidad'
            ) THEN 'Casos Sociales y Vulnerabilidad'
            ELSE 'Alertas Comunitarias'
          END;
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
      )
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'alertas'
          AND column_name = 'categoria'
      ) THEN
        UPDATE alertas
        SET categoria = categorias.nombre_categoria
        FROM categorias
        WHERE alertas.id_categoria = categorias.id_categoria
          AND alertas.categoria IS DISTINCT FROM categorias.nombre_categoria;
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
        IF EXISTS (
          SELECT 1
          FROM alertas
          WHERE id_categoria IS NULL
        ) THEN
          RAISE EXCEPTION 'No fue posible migrar todas las alertas a la tabla categorias';
        END IF;

        ALTER TABLE alertas
        ALTER COLUMN id_categoria SET NOT NULL;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'alertas_id_categoria_fkey'
        ) THEN
          ALTER TABLE alertas
          ADD CONSTRAINT alertas_id_categoria_fkey
          FOREIGN KEY (id_categoria)
          REFERENCES categorias(id_categoria);
        END IF;
      END IF;
    END $$;
  `);
};

/*
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
          (1, 'Pendiente', '2025-09-25 16:05:39.569573', NOW()),
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
*/

const ensureAlertAuthorDeletionSchema = async (): Promise<void> => {
  await sequelize.query(`
    DO $$
    DECLARE
      constraint_name text;
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'alertas'
      ) THEN
        ALTER TABLE alertas
        ALTER COLUMN id_usuario DROP NOT NULL;

        FOR constraint_name IN
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = 'alertas'
            AND kcu.column_name = 'id_usuario'
            AND ccu.table_name = 'usuarios'
            AND ccu.column_name = 'id_usuario'
        LOOP
          EXECUTE format('ALTER TABLE alertas DROP CONSTRAINT IF EXISTS %I', constraint_name);
        END LOOP;

        ALTER TABLE alertas
        ADD CONSTRAINT alertas_id_usuario_fkey
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL;
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
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

const ensureAlertStateHistorySchema = async (): Promise<void> => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS historial_estado (
      id_historial SERIAL PRIMARY KEY,
      id_alerta INTEGER NOT NULL REFERENCES alertas(id_alerta),
      id_estado INTEGER NOT NULL REFERENCES estados(id_estado),
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITHOUT TIME ZONE NULL,
      deleted_at TIMESTAMP WITHOUT TIME ZONE NULL,
      created_by_id INTEGER NULL,
      deleted_by_id INTEGER NULL
    );
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_historial_estado_id_alerta_created_at
    ON historial_estado (id_alerta, created_at);
  `);
};

const validateRequiredCatalogTables = async (): Promise<void> => {
  const requiredTables = ["estados", "reacciones", "roles", "categorias"] as const;

  for (const tableName of requiredTables) {
    const [tableRows] = (await sequelize.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '${tableName}'
      ) AS exists;
    `)) as Array<Array<{ exists: boolean }>>;

    if (!tableRows[0]?.exists) {
      throw new Error(
        `La tabla catalogo "${tableName}" no existe en la base de datos. Debes crearla y poblarla desde Neon.`
      );
    }

    const [countRows] = (await sequelize.query(`
      SELECT COUNT(*)::int AS total
      FROM ${tableName};
    `)) as Array<Array<{ total: number }>>;

    if (!countRows[0] || Number(countRows[0].total) <= 0) {
      throw new Error(
        `La tabla catalogo "${tableName}" esta vacia. Debes poblarla desde la base de datos antes de iniciar la API.`
      );
    }
  }
};

const ensureUserAuthSchema = async (): Promise<void> => {
  await sequelize.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS password_action_version INTEGER;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS oauth_login_version INTEGER;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS session_version INTEGER;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS bloqueo_hasta TIMESTAMP WITH TIME ZONE NULL;
  `);

  await sequelize.query(`
    UPDATE usuarios
    SET email_verificado = COALESCE(email_verificado, estado, false)
    WHERE email_verificado IS NULL;
  `);

  await sequelize.query(`
    UPDATE usuarios
    SET password_action_version = COALESCE(password_action_version, 0)
    WHERE password_action_version IS NULL;
  `);

  await sequelize.query(`
    UPDATE usuarios
    SET oauth_login_version = COALESCE(oauth_login_version, 0)
    WHERE oauth_login_version IS NULL;
  `);

  await sequelize.query(`
    UPDATE usuarios
    SET session_version = COALESCE(session_version, 0)
    WHERE session_version IS NULL;
  `);

  await sequelize.query(`
    UPDATE usuarios
    SET intentos_fallidos = COALESCE(intentos_fallidos, 0)
    WHERE intentos_fallidos IS NULL;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN email_verificado SET DEFAULT false;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN password_action_version SET DEFAULT 0;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN oauth_login_version SET DEFAULT 0;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN session_version SET DEFAULT 0;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN intentos_fallidos SET DEFAULT 0;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN email_verificado SET NOT NULL;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN password_action_version SET NOT NULL;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN oauth_login_version SET NOT NULL;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN session_version SET NOT NULL;
  `);

  await sequelize.query(`
    ALTER TABLE usuarios
    ALTER COLUMN intentos_fallidos SET NOT NULL;
  `);
};

export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log("Conexion a PostgreSQL establecida correctamente.");

    await ensureAlertLocationSchema();
    console.log("Esquema de comunas, barrios y alertas validado.");

    await ensureAlertCategorySchema();
    console.log("Esquema de categorias y relacion con alertas validado.");

    await validateRequiredCatalogTables();
    console.log("Catalogos de estados, reacciones, roles y categorias verificados desde la base.");

    await ensureAlertAuthorDeletionSchema();
    console.log("Esquema de autor anonimo para alertas validado.");

    await ensureAlertReactionSchema();
    console.log("Esquema de reacciones por alerta validado.");

    await ensureAlertCommentSchema();
    console.log("Esquema de comentarios por alerta validado.");

    await ensureAlertStateHistorySchema();
    console.log("Esquema de historial de estados validado.");

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
