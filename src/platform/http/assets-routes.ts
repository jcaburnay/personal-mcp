import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../config/env.js";
import { consentCss, consentHtml, consentScript } from "../oauth-consent/consent.js";

const supabaseUmdPath = resolve(
  process.cwd(),
  "node_modules/@supabase/supabase-js/dist/umd/supabase.js"
);

export async function registerAssetsRoutes(app: FastifyInstance, env: AppEnv) {
  app.get("/assets/health.txt", async (_request, reply) => {
    return reply.type("text/plain").send("ok");
  });

  app.get("/oauth/consent", async (_request, reply) => {
    const html = consentHtml
      .replace("__SUPABASE_URL__", env.supabaseUrl)
      .replace("__SUPABASE_ANON_KEY__", env.supabaseAnonKey);

    return reply.type("text/html; charset=utf-8").send(html);
  });

  app.get("/assets/oauth-consent.css", async (_request, reply) => {
    return reply.type("text/css; charset=utf-8").send(consentCss);
  });

  app.get("/assets/oauth-consent.js", async (_request, reply) => {
    return reply.type("application/javascript; charset=utf-8").send(consentScript);
  });

  app.get("/assets/vendor/supabase.js", async (_request, reply) => {
    const script = await readFile(supabaseUmdPath, "utf8");
    return reply.type("application/javascript; charset=utf-8").send(script);
  });
}
