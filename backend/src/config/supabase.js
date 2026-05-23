import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL?.trim();
const placeholderPattern = /<project-ref>|<password>|<region>|YOUR_|your-/i;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL is required. Configure it with your Supabase Postgres connection string."
  );
}

if (placeholderPattern.test(connectionString)) {
  throw new Error(
    "SUPABASE_DATABASE_URL still contains placeholder text. Replace it with the real Supabase Postgres connection string."
  );
}

let parsedConnectionString;

try {
  parsedConnectionString = new URL(connectionString);
} catch {
  throw new Error("SUPABASE_DATABASE_URL must be a valid postgres/postgresql connection URL.");
}

if (!["postgres:", "postgresql:"].includes(parsedConnectionString.protocol)) {
  throw new Error("SUPABASE_DATABASE_URL must start with postgres:// or postgresql://.");
}

const host = parsedConnectionString.hostname.toLowerCase();
const isSupabaseHost =
  host.endsWith(".supabase.co") ||
  host.endsWith(".supabase.com") ||
  host === "supabase.co" ||
  host === "supabase.com";

if (!isSupabaseHost) {
  throw new Error(
    "SUPABASE_DATABASE_URL must point to a Supabase host. Use the pooled or direct connection string from Supabase."
  );
}

const useSsl =
  process.env.SUPABASE_DB_SSL !== "false" &&
  (connectionString.includes("supabase.co") ||
    connectionString.includes("pooler.supabase.com") ||
    process.env.SUPABASE_DB_SSL === "true");

export const supabasePool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.SUPABASE_DB_POOL_MAX || 10),
  idleTimeoutMillis: Number(process.env.SUPABASE_DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.SUPABASE_DB_CONNECTION_TIMEOUT_MS || 10000)
});

supabasePool.on("error", (error) => {
  console.error("Unexpected Supabase database pool error:", error.message);
});

export const supabaseQuery = (text, params = []) => supabasePool.query(text, params);

export const checkSupabaseConnection = async () => {
  const startedAt = Date.now();
  const { rows } = await supabaseQuery(
    "SELECT current_database() AS database, current_user AS user_name, NOW() AS server_time"
  );

  return {
    ok: true,
    latency_ms: Date.now() - startedAt,
    database: rows[0].database,
    user: rows[0].user_name,
    server_time: rows[0].server_time
  };
};