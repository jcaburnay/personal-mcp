import { getEnv } from "./platform/config/env.js";
import { buildApp } from "./platform/app.js";

const env = getEnv();
const app = await buildApp(env);

await app.listen({ host: "0.0.0.0", port: env.port });
