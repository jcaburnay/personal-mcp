import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/platform/app.js";
import type { AppEnv } from "../../../src/platform/config/env.js";

const env: AppEnv = {
  nodeEnv: "test",
  port: 3000,
  logLevel: "info",
  publicBaseUrl: "http://localhost",
  databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  supabaseUrl: "http://127.0.0.1:55321",
  supabaseAuthIssuer: "http://127.0.0.1:55321/auth/v1",
  supabaseJwksUrl: "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
  supabaseJwtAudience: "authenticated",
  supabasePublishableKey: "local-publishable-key",
  mcpServerName: "personal-mcp",
  mcpServerVersion: "0.1.0",
  allowedOrigins: ["http://localhost"],
};

describe("OAuth routes", () => {
  it("serves protected resource metadata", async () => {
    const app = await buildApp(env);

    const response = await app.inject({
      method: "GET",
      url: "/.well-known/oauth-protected-resource",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      resource: "http://localhost",
      resource_name: "Personal MCP",
      authorization_servers: ["http://127.0.0.1:55321/auth/v1"],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email", "profile"],
    });

    await app.close();
  });

  it("serves the React OAuth consent page with Supabase config script", async () => {
    const app = await buildApp(env);

    const response = await app.inject({
      method: "GET",
      url: "/oauth/consent",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Authorize Personal MCP");
    expect(response.body).toContain("/assets/consent/config.js");
    expect(response.body).toContain("/assets/consent/");

    await app.close();
  });

  it("serves React consent assets", async () => {
    const app = await buildApp(env);

    const page = await app.inject({
      method: "GET",
      url: "/oauth/consent",
    });

    const jsPath = page.body.match(/src="(\/assets\/consent\/assets\/[^"]+\.js)"/)?.[1];
    const cssPath = page.body.match(/href="(\/assets\/consent\/assets\/[^"]+\.css)"/)?.[1];

    expect(jsPath).toBeTruthy();
    expect(cssPath).toBeTruthy();

    const config = await app.inject({
      method: "GET",
      url: "/assets/consent/config.js",
    });

    const js = await app.inject({
      method: "GET",
      url: jsPath as string,
    });

    const css = await app.inject({
      method: "GET",
      url: cssPath as string,
    });

    expect(config.statusCode).toBe(200);
    expect(config.body).toContain("window.__PERSONAL_MCP_CONFIG__");
    expect(config.body).toContain('"supabaseUrl":"http://127.0.0.1:55321"');
    expect(config.body).toContain('"supabasePublishableKey":"local-publishable-key"');

    expect(js.statusCode).toBe(200);
    expect(css.statusCode).toBe(200);
    expect(css.body).toContain(".page");

    await app.close();
  });
});
