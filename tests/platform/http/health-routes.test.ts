import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/platform/app.js";
import type { AppEnv } from "../../../src/platform/config/env.js";
import type { Database } from "../../../src/platform/db/client.js";

const testEnv: AppEnv = {
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
};

function stubDb(execute: () => Promise<unknown>): Database {
  return { execute } as unknown as Database;
}

const verifyToken = async () => {
  throw new Error("verifyToken should not run in health checks");
};

describe("health routes", () => {
  it("returns healthy status", async () => {
    const app = await buildApp(testEnv, {
      db: stubDb(async () => undefined),
      verifyToken,
    });

    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: "personal-mcp" });
  });

  it("reports ready when the database responds", async () => {
    const app = await buildApp(testEnv, {
      db: stubDb(async () => [{ "?column?": 1 }]),
      verifyToken,
    });

    const response = await app.inject({ method: "GET", url: "/readyz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, dependencies: { database: "ready" } });
  });

  it("reports 503 when the database is unreachable", async () => {
    const app = await buildApp(testEnv, {
      db: stubDb(async () => {
        throw new Error("connection refused");
      }),
      verifyToken,
    });

    const response = await app.inject({ method: "GET", url: "/readyz" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ ok: false, dependencies: { database: "unavailable" } });
  });
});
