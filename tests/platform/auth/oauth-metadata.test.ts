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
});
