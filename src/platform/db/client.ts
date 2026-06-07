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
  });

  return drizzle(client, { schema });
}
