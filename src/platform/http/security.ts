import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../config/env.js";

export async function registerSecurity(app: FastifyInstance, env: AppEnv) {
  await app.register(helmet, {
    global: true,
  });

  await app.register(cors, {
    origin: env.allowedOrigins,
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });
}
