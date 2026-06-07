import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../config/env.js";

export async function registerSecurity(app: FastifyInstance, env: AppEnv) {
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", env.supabaseUrl],
        imgSrc: ["'self'", "data:"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
  });

  await app.register(cors, {
    origin: env.allowedOrigins,
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });
}
