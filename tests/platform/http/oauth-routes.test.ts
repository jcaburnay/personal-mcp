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

describe("OAuth routes", () => {
  it("serves protected resource metadata", async () => {
    const app = await buildApp(testEnv);
    const response = await app.inject({
      method: "GET",
      url: "/.well-known/oauth-protected-resource",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      resource: "http://localhost:3000",
      authorization_servers: ["http://127.0.0.1:55321/auth/v1"],
    });
  });

  it("serves the OAuth consent page with Supabase config", async () => {
    const app = await buildApp(testEnv);
    const response = await app.inject({ method: "GET", url: "/oauth/consent" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Authorize Personal MCP");
    expect(response.body).toContain('data-supabase-url="http://127.0.0.1:55321"');
    expect(response.body).toContain('data-supabase-anon-key="local-anon-key"');
  });

  it("serves OAuth consent assets", async () => {
    const app = await buildApp(testEnv);

    const css = await app.inject({ method: "GET", url: "/assets/oauth-consent.css" });
    const js = await app.inject({ method: "GET", url: "/assets/oauth-consent.js" });

    expect(css.statusCode).toBe(200);
    expect(css.body).toContain(".shell");
    expect(js.statusCode).toBe(200);
    expect(js.body).toContain("getAuthorizationDetails");
  });
});
