import { describe, expect, it } from "vitest";
import { hasRequiredScopes } from "../../../src/platform/auth/scopes.js";

describe("hasRequiredScopes", () => {
  it("returns true when all required scopes exist", () => {
    expect(hasRequiredScopes(["notes.read", "notes.write"], ["notes.read"])).toBe(true);
  });

  it("returns false when a required scope is missing", () => {
    expect(hasRequiredScopes(["notes.read"], ["notes.write"])).toBe(false);
  });
});
