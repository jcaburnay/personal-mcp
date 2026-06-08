import Fastify from "fastify";
import { createProtectedResourceMetadata } from "./auth/oauth-metadata.js";
import { createTokenVerifier } from "./auth/token-verifier.js";
import type { AppEnv } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import { createDatabase } from "./db/client.js";
import { registerAssetsRoutes } from "./http/assets-routes.js";
import { registerHealthRoutes } from "./http/health-routes.js";
import { registerSecurity } from "./http/security.js";
import { type McpTransportDeps, registerMcpTransport } from "./mcp/transport.js";

export type BuildAppDeps = McpTransportDeps;

export async function buildApp(env: AppEnv, deps?: BuildAppDeps) {
  const app = Fastify({
    loggerInstance: createLogger(env),
    bodyLimit: 1024 * 1024,
  });

  const db = deps?.db ?? createDatabase(env);
  const verifyToken = deps?.verifyToken ?? createTokenVerifier(env);

  await registerSecurity(app, env);
  await registerHealthRoutes(app, db);
  await registerAssetsRoutes(app, env);
  await registerMcpTransport(app, env, { db, verifyToken });

  app.get("/.well-known/oauth-protected-resource", async () => {
    return createProtectedResourceMetadata(env);
  });

  // Only own the connection lifecycle when we created it; injected deps belong to the caller.
  if (!deps?.db) {
    app.addHook("onClose", async () => {
      await db.$client.end();
    });
  }

  return app;
}
