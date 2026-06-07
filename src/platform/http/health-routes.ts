import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => {
    return { ok: true, service: "personal-mcp" };
  });

  app.get("/readyz", async () => {
    return { ok: true, dependencies: { http: "ready" } };
  });
}
