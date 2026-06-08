import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/platform/app.js";
import type { AppEnv } from "../../../src/platform/config/env.js";

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

describe("MCP route", () => {
  it("exists at /mcp", async () => {
    const app = await buildApp(testEnv);

    const response = await app.inject({
      method: "OPTIONS",
      url: "/mcp",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "POST",
      },
    });

    expect(response.statusCode).toBe(204);
  });

  it.each([
    "GET",
    "DELETE",
  ] as const)("returns method not allowed for %s requests", async (method) => {
    const app = await buildApp(testEnv);

    const response = await app.inject({
      method,
      url: "/mcp",
    });

    expect(response.statusCode).toBe(405);
    expect(response.json()).toEqual({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  it("rejects POST requests without a bearer token", async () => {
    const app = await buildApp(testEnv, {
      db: {} as never,
      verifyToken: async () => {
        throw new Error("verifyToken should not run when no token is present");
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      payload: { jsonrpc: "2.0", method: "initialize", id: 1 },
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["www-authenticate"]).toContain(
      'resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"'
    );
    expect(response.json()).toMatchObject({
      jsonrpc: "2.0",
      error: { code: -32001 },
      id: null,
    });
  });
});
