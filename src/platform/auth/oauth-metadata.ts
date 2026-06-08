import type { AppEnv } from "../config/env.js";

// Scopes the authorization server (Supabase OAuth 2.1) can actually grant. Supabase only
// supports the standard OIDC scopes; advertising our internal per-tool scopes (notes.read, …)
// here makes ChatGPT request them at /oauth/authorize, which Supabase rejects. Internal
// authorization is enforced separately from platform.app_user_scopes — see scopes.ts.
export const advertisedScopes = ["openid", "email", "profile"] as const;

export function createProtectedResourceMetadata(
  env: Pick<AppEnv, "publicBaseUrl" | "supabaseAuthIssuer">
) {
  return {
    resource: env.publicBaseUrl,
    resource_name: "Personal MCP",
    authorization_servers: [env.supabaseAuthIssuer],
    bearer_methods_supported: ["header"],
    scopes_supported: advertisedScopes,
  };
}
