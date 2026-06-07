import Fastify from "fastify";
import { createProtectedResourceMetadata } from "./auth/oauth-metadata.js";
import type { AppEnv } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import { registerAssetsRoutes } from "./http/assets-routes.js";
import { registerHealthRoutes } from "./http/health-routes.js";
import { registerSecurity } from "./http/security.js";
import { registerMcpTransport } from "./mcp/transport.js";

export async function buildApp(env: AppEnv) {
  const app = Fastify({
    loggerInstance: createLogger(env),
    bodyLimit: 1024 * 1024,
  });

  await registerSecurity(app, env);
  await registerHealthRoutes(app);
  await registerAssetsRoutes(app, env);
  await registerMcpTransport(app, env);

  app.get("/.well-known/oauth-protected-resource", async () => {
    return createProtectedResourceMetadata(env);
  });

  return app;
}
