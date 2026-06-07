import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/platform/app.js";

describe("health routes", () => {
  it("returns healthy status", async () => {
    const app = await buildApp({
      nodeEnv: "test",
      port: 3000,
      logLevel: "info",
      publicBaseUrl: "http://localhost:3000",
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
      supabaseUrl: "http://127.0.0.1:55321",
      supabaseAuthIssuer: "http://127.0.0.1:55321/auth/v1",
      supabaseJwksUrl: "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
      supabaseJwtAudience: "authenticated",
      supabaseAnonKey: "local-anon-key",
      mcpServerName: "personal-mcp",
      mcpServerVersion: "0.1.0",
      allowedOrigins: ["http://localhost:3000"],
    });

    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: "personal-mcp" });
  });
});
