import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Database } from "../db/client.js";

export async function registerHealthRoutes(app: FastifyInstance, db: Database) {
  app.get("/healthz", async () => {
    return { ok: true, service: "personal-mcp" };
  });

  app.get("/readyz", async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { ok: true, dependencies: { database: "ready" } };
    } catch (error) {
      app.log.error({ err: error }, "Readiness check failed: database unreachable");
      return reply.status(503).send({ ok: false, dependencies: { database: "unavailable" } });
    }
  });
}
