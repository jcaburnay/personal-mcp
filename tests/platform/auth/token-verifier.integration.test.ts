import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTokenVerifier } from "../../../src/platform/auth/token-verifier.js";

type SigningKey = Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];

// Exercises the REAL verification path (ES256 signature + issuer + audience), which the unit
// tests stub out. Supabase signs OAuth 2.1 access tokens with an ES256 JWKS key (verified live),
// so this mirrors production: a token the server actually has to accept or reject on its own.

const env = {
  supabaseJwksUrl: "https://project-ref.supabase.co/auth/v1/.well-known/jwks.json",
  supabaseAuthIssuer: "https://project-ref.supabase.co/auth/v1",
  supabaseJwtAudience: "authenticated",
};

const KID = "test-signing-key";

async function stubJwks(): Promise<SigningKey> {
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const publicJwk = { ...(await exportJWK(publicKey)), alg: "ES256", kid: KID, use: "sig" };

  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ keys: [publicJwk] }), {
          headers: { "content-type": "application/json" },
        })
    )
  );

  return privateKey;
}

function sign(privateKey: SigningKey, claims: Record<string, unknown>) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: KID })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

describe("createTokenVerifier (real signature path)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a correctly-signed token with the expected issuer and audience", async () => {
    const privateKey = await stubJwks();
    const token = await sign(privateKey, {
      sub: "sub-1",
      aud: env.supabaseJwtAudience,
      iss: env.supabaseAuthIssuer,
      email: "user@example.com",
    });

    const verified = await createTokenVerifier(env)(token);

    expect(verified.sub).toBe("sub-1");
    expect(verified.email).toBe("user@example.com");
  });

  it("rejects a token whose audience does not match", async () => {
    const privateKey = await stubJwks();
    const token = await sign(privateKey, {
      sub: "sub-1",
      aud: "https://some-other-resource.example.com",
      iss: env.supabaseAuthIssuer,
    });

    await expect(createTokenVerifier(env)(token)).rejects.toMatchObject({
      name: "AuthError",
      code: "invalid_token",
    });
  });

  it("rejects a token from an unexpected issuer", async () => {
    const privateKey = await stubJwks();
    const token = await sign(privateKey, {
      sub: "sub-1",
      aud: env.supabaseJwtAudience,
      iss: "https://evil.example.com/auth/v1",
    });

    await expect(createTokenVerifier(env)(token)).rejects.toMatchObject({
      name: "AuthError",
      code: "invalid_token",
    });
  });

  it("rejects a token that is missing the subject claim", async () => {
    const privateKey = await stubJwks();
    const token = await sign(privateKey, {
      aud: env.supabaseJwtAudience,
      iss: env.supabaseAuthIssuer,
    });

    await expect(createTokenVerifier(env)(token)).rejects.toMatchObject({
      name: "AuthError",
      code: "invalid_token",
    });
  });

  it("rejects a token with a tampered signature", async () => {
    const privateKey = await stubJwks();
    const token = await sign(privateKey, {
      sub: "sub-1",
      aud: env.supabaseJwtAudience,
      iss: env.supabaseAuthIssuer,
    });
    const tampered = `${token.slice(0, -3)}aaa`;

    await expect(createTokenVerifier(env)(tampered)).rejects.toMatchObject({
      name: "AuthError",
      code: "invalid_token",
    });
  });
});
