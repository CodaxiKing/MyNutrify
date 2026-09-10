import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * SSL é obrigatório na maioria dos Postgres gerenciados (Neon, Supabase, RDS) e
 * indisponível num Postgres local. Antes o valor era `false` fixo, o que
 * quebrava qualquer deploy em produção — agora liga sozinho fora de
 * desenvolvimento e pode ser forçado por `PGSSL`.
 */
const sslEnabled =
  process.env.PGSSL === "true" ||
  (process.env.PGSSL !== "false" && process.env.NODE_ENV === "production");

export const pool = new Pool({
  connectionTimeoutMillis: 5000,
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
});

export const db = drizzle({ client: pool, schema });
