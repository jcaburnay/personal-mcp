import { describe, expect, it } from "vitest";
import { createProtectedResourceMetadata } from "../../../src/platform/auth/oauth-metadata.js";

describe("createProtectedResourceMetadata", () => {
  it("returns OAuth protected resource metadata", () => {
    const metadata = createProtectedResourceMetadata({
      publicBaseUrl: "https://mcp.example.com",
      supabaseAuthIssuer: "https://project-ref.supabase.co/auth/v1",
    });

    expect(metadata.resource).toBe("https://mcp.example.com");
    expect(metadata.authorization_servers).toEqual(["https://project-ref.supabase.co/auth/v1"]);
  });

  it("advertises only scopes the authorization server can grant", () => {
    const metadata = createProtectedResourceMetadata({
      publicBaseUrl: "https://mcp.example.com",
      supabaseAuthIssuer: "https://project-ref.supabase.co/auth/v1",
    });

    // Supabase OAuth 2.1 only supports standard OIDC scopes. Advertising internal per-tool
    // scopes (notes.read, …) would make ChatGPT request scopes Supabase rejects at authorize.
    expect(metadata.scopes_supported).toEqual(["openid", "email", "profile"]);
  });
});
