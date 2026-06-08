import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { AppEnv } from "../config/env.js";
import * as schema from "./schema/platform.js";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(env: Pick<AppEnv, "databaseUrl">) {
  const client = postgres(env.databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Supabase's production connection string is the PgBouncer transaction-mode pooler, which
    // does not support prepared statements. Without this, the first real query (user upsert /
    // scope lookup) throws in prod while passing locally. Harmless on direct/session connections.
    // TLS is driven by the connection string (append `?sslmode=require` for the prod pooler).
    prepare: false,
  });

  return drizzle(client, { schema });
}
