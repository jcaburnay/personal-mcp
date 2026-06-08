import { z } from "zod";

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  PUBLIC_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_AUTH_ISSUER: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_JWT_AUDIENCE: z.string().min(1),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  MCP_SERVER_NAME: z.string().min(1).default("personal-mcp"),
  MCP_SERVER_VERSION: z.string().min(1).default("0.1.0"),
  ALLOWED_ORIGINS: z.string().min(1),
});

export type AppEnv = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  publicBaseUrl: string;
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAuthIssuer: string;
  supabaseJwksUrl: string;
  supabaseJwtAudience: string;
  supabasePublishableKey: string;
  mcpServerName: string;
  mcpServerVersion: string;
  allowedOrigins: string[];
};

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  const parsed = rawEnvSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    logLevel: parsed.data.LOG_LEVEL,
    publicBaseUrl: parsed.data.PUBLIC_BASE_URL,
    databaseUrl: parsed.data.DATABASE_URL,
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseAuthIssuer: parsed.data.SUPABASE_AUTH_ISSUER,
    supabaseJwksUrl: parsed.data.SUPABASE_JWKS_URL,
    supabaseJwtAudience: parsed.data.SUPABASE_JWT_AUDIENCE,
    supabasePublishableKey: parsed.data.SUPABASE_PUBLISHABLE_KEY,
    mcpServerName: parsed.data.MCP_SERVER_NAME,
    mcpServerVersion: parsed.data.MCP_SERVER_VERSION,
    allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export function getEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return parseEnv(input);
}
