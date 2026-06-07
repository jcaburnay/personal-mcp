import pino from "pino";
import type { LoggerOptions } from "pino";
import type { FastifyBaseLogger } from "fastify";
import type { AppEnv } from "./env.js";

export function createLogger(env: Pick<AppEnv, "logLevel" | "nodeEnv">): FastifyBaseLogger {
  const options: LoggerOptions = {
    level: env.logLevel,
    redact: {
      paths: ["req.headers.authorization", "authorization", "*.password", "*.token", "*.secret"],
      remove: true,
    },
  };

  if (env.nodeEnv === "development") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    };
  }

  return pino(options) as FastifyBaseLogger;
}
