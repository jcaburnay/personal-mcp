import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AppEnv } from "../config/env.js";
import { AuthError } from "./auth-errors.js";

export type VerifiedToken = JWTPayload & {
  sub: string;
  email?: string;
  name?: string;
  scope?: string;
};

export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

export function createTokenVerifier(
  env: Pick<AppEnv, "supabaseJwksUrl" | "supabaseAuthIssuer" | "supabaseJwtAudience">
) {
  const jwks = createRemoteJWKSet(new URL(env.supabaseJwksUrl));

  return async function verifyToken(token: string): Promise<VerifiedToken> {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: env.supabaseAuthIssuer,
        audience: env.supabaseJwtAudience,
      });

      if (!payload.sub) {
        throw new AuthError("Token is missing subject", "invalid_token");
      }

      return payload as VerifiedToken;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError("Token verification failed", "invalid_token");
    }
  };
}
