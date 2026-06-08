import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../../../src/platform/app.js";
import type { VerifiedToken } from "../../../src/platform/auth/token-verifier.js";
import type { AppEnv } from "../../../src/platform/config/env.js";
import type { Database } from "../../../src/platform/db/client.js";

// Minimal drizzle stub mirroring resolveCurrentUser's insert -> onConflictDoUpdate -> returning chain.
function stubDbReturning(row: Record<string, unknown>): Database {
  return {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => [row],
        }),
      }),
    }),
  } as unknown as Database;
}

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

  it("accepts a POST with a valid bearer token and runs under the resolved user", async () => {
    const verifyToken = vi.fn(
      async (): Promise<VerifiedToken> => ({
        sub: "sub-1",
        email: "user@example.com",
        name: "User One",
        scope: "notes.read",
      })
    );
    const db = stubDbReturning({
      id: "user-1",
      externalSubject: "sub-1",
      email: "user@example.com",
      displayName: "User One",
    });

    const app = await buildApp(testEnv, { db, verifyToken });

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: "Bearer good-token",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      },
    });

    // The bearer token was verified and the request was NOT rejected by the auth gate.
    expect(verifyToken).toHaveBeenCalledWith("good-token");
    expect(response.statusCode).not.toBe(401);
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("personal-mcp");
  });
});
