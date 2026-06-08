import { describe, expect, it } from "vitest";
import { AuthError } from "../../../src/platform/auth/auth-errors.js";
import type { VerifiedToken } from "../../../src/platform/auth/token-verifier.js";
import type { Database } from "../../../src/platform/db/client.js";
import { authenticateRequest } from "../../../src/platform/mcp/transport.js";

type Deps = Parameters<typeof authenticateRequest>[0];

function fakeRequest(authorization?: string) {
  return {
    id: "req-1",
    headers: authorization ? { authorization } : {},
  } as Parameters<typeof authenticateRequest>[1];
}

// Minimal drizzle stub mirroring resolveCurrentUser's insert -> onConflictDoUpdate -> returning
// chain and findUserScopes's select -> from -> where chain.
function stubDb(row: Record<string, unknown>, scopes: string[] = []): Database {
  return {
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => [row],
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: async () => scopes.map((scope) => ({ scope })),
      }),
    }),
  } as unknown as Database;
}

describe("authenticateRequest", () => {
  it("throws a missing_token AuthError when no bearer token is present", async () => {
    const deps: Deps = {
      db: stubDb({}),
      verifyToken: async () => {
        throw new Error("verifyToken should not run");
      },
    };

    await expect(authenticateRequest(deps, fakeRequest())).rejects.toMatchObject({
      name: "AuthError",
      code: "missing_token",
    });
  });

  it("propagates verifier failures", async () => {
    const deps: Deps = {
      db: stubDb({}),
      verifyToken: async () => {
        throw new AuthError("bad token", "invalid_token");
      },
    };

    await expect(authenticateRequest(deps, fakeRequest("Bearer abc"))).rejects.toMatchObject({
      name: "AuthError",
      code: "invalid_token",
    });
  });

  it("resolves the user and loads granted scopes from the database on success", async () => {
    const deps: Deps = {
      db: stubDb(
        {
          id: "user-1",
          externalSubject: "sub-1",
          email: "user@example.com",
          displayName: "User One",
        },
        ["notes.read", "finance.read"]
      ),
      verifyToken: async (): Promise<VerifiedToken> => ({
        sub: "sub-1",
        email: "user@example.com",
        name: "User One",
        // Supabase issues no scope claim; authorization must come from app_user_scopes, not here.
      }),
    };

    const context = await authenticateRequest(deps, fakeRequest("Bearer abc"));

    expect(context).toEqual({
      requestId: "req-1",
      currentUser: {
        id: "user-1",
        externalSubject: "sub-1",
        email: "user@example.com",
        displayName: "User One",
      },
      grantedScopes: ["notes.read", "finance.read"],
    });
  });
});
