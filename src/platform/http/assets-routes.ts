import fastifyStatic from "@fastify/static";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../config/env.js";

const consentDistPath = resolve(process.cwd(), "dist-web/consent");
const consentIndexPath = resolve(consentDistPath, "index.html");

function createConsentConfigScript(env: AppEnv) {
  const config = JSON.stringify({
    supabaseUrl: env.supabaseUrl,
    supabasePublishableKey: env.supabasePublishableKey,
  });

  return `window.__PERSONAL_MCP_CONFIG__ = ${config};`;
}

export async function registerAssetsRoutes(app: FastifyInstance, env: AppEnv) {
  app.get("/assets/health.txt", async (_request, reply) => {
    return reply.type("text/plain").send("ok");
  });

  app.get("/assets/consent/config.js", async (_request, reply) => {
    return reply.type("application/javascript; charset=utf-8").send(createConsentConfigScript(env));
  });

  await app.register(fastifyStatic, {
    root: consentDistPath,
    prefix: "/assets/consent/",
    decorateReply: false,
  });

  app.get("/oauth/consent", async (_request, reply) => {
    const html = await readFile(consentIndexPath, "utf8");
    const hydratedHtml = html.replace(
      "</head>",
      '<script src="/assets/consent/config.js"></script></head>'
    );

    return reply.type("text/html; charset=utf-8").send(hydratedHtml);
  });
}
