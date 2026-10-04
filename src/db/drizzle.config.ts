import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Resolve connection string following priority: NON_POOLING -> POOLING -> DATABASE_URL
const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

const host = process.env.POSTGRES_HOST || process.env.SQL_HOST || "localhost";
const user = process.env.POSTGRES_USER || process.env.SQL_ADMIN_USER || process.env.SQL_USER || "postgres";
const password = process.env.POSTGRES_PASSWORD || process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || "";
const database = process.env.POSTGRES_DATABASE || process.env.SQL_DB_NAME || "postgres";

const isRemote = Boolean(
  connectionString ||
  (host && host !== "localhost" && host !== "127.0.0.1" && !host.startsWith("/"))
);

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: connectionString
    ? {
        url: connectionString,
        ssl: isRemote,
      }
    : {
        host,
        user,
        password,
        database,
        ssl: isRemote,
      },
  verbose: true,
});

