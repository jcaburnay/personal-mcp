import type { CurrentUser } from "../auth/current-user.js";

export type ToolContext = {
  requestId: string;
  currentUser: CurrentUser | null;
  /**
   * Scopes granted to the caller, parsed from the token's `scope` claim. This is only the
   * carrier — it does NOT enforce anything. Domain tools that read or mutate data must call
   * `assertScopes(context.grantedScopes, [...])` (see auth/scopes.ts) themselves; the
   * presence of this array is not authorization.
   */
  grantedScopes: string[];
};
