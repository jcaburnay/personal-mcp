import { AuthError } from "./auth-errors.js";

export const platformScopes = [
  "notes.read",
  "notes.write",
  "finance.read",
  "finance.write",
  "finance.import",
  "habits.read",
  "habits.write",
  "admin.backup",
] as const;

export type PlatformScope = (typeof platformScopes)[number];

export function hasRequiredScopes(
  grantedScopes: readonly string[],
  requiredScopes: readonly string[]
) {
  return requiredScopes.every((scope) => grantedScopes.includes(scope));
}

export function assertScopes(grantedScopes: readonly string[], requiredScopes: readonly string[]) {
  if (!hasRequiredScopes(grantedScopes, requiredScopes)) {
    throw new AuthError("Required scope is missing", "insufficient_scope");
  }
}
