import { eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { appUserScopes } from "../db/schema/platform.js";

/**
 * Resolves the platform authorization scopes granted to a user from the local
 * `platform.app_user_scopes` table.
 *
 * Authorization is intentionally NOT read from the JWT: Supabase's OAuth 2.1 server only issues
 * standard OIDC scopes and does not place a `scope` claim inside the access token, so per-tool
 * permissions (notes.read, finance.write, …) must be owned by this application, not the IdP.
 */
export async function findUserScopes(db: Database, userId: string): Promise<string[]> {
  const rows = await db
    .select({ scope: appUserScopes.scope })
    .from(appUserScopes)
    .where(eq(appUserScopes.userId, userId));

  return rows.map((row) => row.scope);
}
