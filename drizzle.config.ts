import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/platform/db/schema/platform.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  },
  strict: true,
  verbose: true,
});
