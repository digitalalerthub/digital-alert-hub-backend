require("dotenv").config();

const parseBoolean = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
};

const databaseUrl = process.env.DATABASE_URL?.trim();
const explicitDbSsl = parseBoolean(process.env.DB_SSL);
const shouldUseSsl =
  explicitDbSsl ??
  Boolean(
    process.env.NODE_ENV === "production" ||
      databaseUrl ||
      process.env.DB_HOST?.includes("neon.tech")
  );

const buildConfig = () => {
  const config = {
    dialect: "postgres",
    logging: false,
  };

  if (shouldUseSsl) {
    config.dialectOptions = {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    };
  }

  if (databaseUrl) {
    return {
      ...config,
      use_env_variable: "DATABASE_URL",
    };
  }

  return {
    ...config,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
};

const sharedConfig = buildConfig();

module.exports = {
  development: sharedConfig,
  test: sharedConfig,
  production: sharedConfig,
};
