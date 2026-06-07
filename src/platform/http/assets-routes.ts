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
    supabaseAnonKey: env.supabaseAnonKey,
  });

  return `<script>window.__PERSONAL_MCP_CONFIG__ = ${config};</script>`;
}

export async function registerAssetsRoutes(app: FastifyInstance, env: AppEnv) {
  app.get("/assets/health.txt", async (_request, reply) => {
    return reply.type("text/plain").send("ok");
  });

  await app.register(fastifyStatic, {
    root: consentDistPath,
    prefix: "/assets/consent/",
    decorateReply: false,
  });

  app.get("/oauth/consent", async (_request, reply) => {
    const html = await readFile(consentIndexPath, "utf8");
    const hydratedHtml = html.replace("</head>", `${createConsentConfigScript(env)}</head>`);

    return reply.type("text/html; charset=utf-8").send(hydratedHtml);
  });
}
