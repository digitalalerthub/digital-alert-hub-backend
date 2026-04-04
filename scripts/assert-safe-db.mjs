import dotenv from "dotenv";

dotenv.config();

const ALLOW_REMOTE_DB = process.env.ALLOW_REMOTE_DB === "1";

const parseDatabaseHost = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    try {
      return new URL(databaseUrl).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  const dbHost = process.env.DB_HOST?.trim().toLowerCase();
  return dbHost || null;
};

const isLocalHost = (host) =>
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "::1" ||
  host === "[::1]";

const host = parseDatabaseHost();

if (!host) {
  console.error(
    "No se pudo determinar el host de la base de datos desde DATABASE_URL o DB_HOST."
  );
  process.exit(1);
}

if (ALLOW_REMOTE_DB) {
  console.log(`Validacion de seguridad omitida con ALLOW_REMOTE_DB=1 para host: ${host}`);
  process.exit(0);
}

if (!isLocalHost(host)) {
  console.error(
    [
      "Bloqueado para proteger bases remotas.",
      `Host detectado: ${host}`,
      "Este comando del Makefile solo corre sobre una base local por defecto.",
      "Si realmente quieres operar sobre una base remota, ejecuta con ALLOW_REMOTE_DB=1.",
    ].join("\n")
  );
  process.exit(1);
}

console.log(`Base local detectada: ${host}`);
