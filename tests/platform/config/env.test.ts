import { describe, expect, it } from "vitest";
import { parseEnv } from "../../../src/platform/config/env.js";

describe("parseEnv", () => {
  it("parses a complete environment", () => {
    const env = parseEnv({
      NODE_ENV: "test",
      PORT: "3000",
      LOG_LEVEL: "info",
      PUBLIC_BASE_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
      SUPABASE_URL: "http://127.0.0.1:55321",
      SUPABASE_AUTH_ISSUER: "http://127.0.0.1:55321/auth/v1",
      SUPABASE_JWKS_URL: "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
      SUPABASE_JWT_AUDIENCE: "authenticated",
      SUPABASE_ANON_KEY: "local-anon-key",
      MCP_SERVER_NAME: "personal-mcp",
      MCP_SERVER_VERSION: "0.1.0",
      ALLOWED_ORIGINS: "http://localhost:3000,https://chatgpt.com",
    });

    expect(env.port).toBe(3000);
    expect(env.allowedOrigins).toEqual(["http://localhost:3000", "https://chatgpt.com"]);
  });

  it("rejects invalid URLs", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "test",
        PORT: "3000",
        LOG_LEVEL: "info",
        PUBLIC_BASE_URL: "not-a-url",
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
        SUPABASE_URL: "http://127.0.0.1:55321",
        SUPABASE_AUTH_ISSUER: "http://127.0.0.1:55321/auth/v1",
        SUPABASE_JWKS_URL: "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
        SUPABASE_JWT_AUDIENCE: "authenticated",
        SUPABASE_ANON_KEY: "local-anon-key",
        MCP_SERVER_NAME: "personal-mcp",
        MCP_SERVER_VERSION: "0.1.0",
        ALLOWED_ORIGINS: "http://localhost:3000",
      })
    ).toThrow("Invalid environment");
  });
});
