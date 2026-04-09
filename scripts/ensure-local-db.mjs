import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

const parseBoolean = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

const isLocalHost = (host) =>
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "::1" ||
  host === "[::1]";

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, "\"\"")}"`;

const buildConnectionInfo = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const explicitDbSsl = parseBoolean(process.env.DB_SSL);

  if (databaseUrl) {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: Number(url.port) || 5432,
      database: url.pathname.replace(/^\//, ""),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl:
        explicitDbSsl ??
        Boolean(
          process.env.NODE_ENV === "production" ||
            databaseUrl ||
            url.hostname.includes("neon.tech")
        ),
    };
  }

  return {
    host: process.env.DB_HOST?.trim() || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME?.trim(),
    user: process.env.DB_USER?.trim(),
    password: process.env.DB_PASSWORD ?? "",
    ssl:
      explicitDbSsl ??
      Boolean(
        process.env.NODE_ENV === "production" ||
          process.env.DB_HOST?.includes("neon.tech")
      ),
  };
};

const connectAdminClient = async (baseConfig) => {
  const candidateDatabases = ["postgres", "template1"];
  let lastError = null;

  for (const database of candidateDatabases) {
    const client = new Client({
      host: baseConfig.host,
      port: baseConfig.port,
      user: baseConfig.user,
      password: baseConfig.password,
      database,
      ssl: baseConfig.ssl
        ? {
            require: true,
            rejectUnauthorized: false,
          }
        : false,
    });

    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // noop
      }
    }
  }

  throw lastError;
};

const config = buildConnectionInfo();

if (!config.database) {
  console.error("DB_NAME o DATABASE_URL deben definir el nombre de la base de datos.");
  process.exit(1);
}

if (!config.user) {
  console.error("DB_USER o DATABASE_URL deben definir el usuario de PostgreSQL.");
  process.exit(1);
}

if (!isLocalHost(config.host)) {
  console.log(
    `Host no local detectado (${config.host}). Se omite la creacion automatica de la base y se asume que ya existe.`
  );
  process.exit(0);
}

const client = await connectAdminClient(config);

try {
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    config.database,
  ]);

  if (result.rowCount && result.rowCount > 0) {
    console.log(`La base de datos "${config.database}" ya existe.`);
    process.exit(0);
  }

  await client.query(`CREATE DATABASE ${quoteIdentifier(config.database)}`);
  console.log(`Base de datos "${config.database}" creada correctamente.`);
} catch (error) {
  console.error("No se pudo verificar o crear la base de datos:", error);
  process.exit(1);
} finally {
  await client.end();
}
