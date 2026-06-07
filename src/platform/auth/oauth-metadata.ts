import type { AppEnv } from "../config/env.js";
import { platformScopes } from "./scopes.js";

export function createProtectedResourceMetadata(
  env: Pick<AppEnv, "publicBaseUrl" | "supabaseAuthIssuer">
) {
  return {
    resource: env.publicBaseUrl,
    resource_name: "Personal MCP",
    authorization_servers: [env.supabaseAuthIssuer],
    bearer_methods_supported: ["header"],
    scopes_supported: platformScopes,
  };
}
