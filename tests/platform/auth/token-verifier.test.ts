import { describe, expect, it } from "vitest";
import { extractBearerToken } from "../../../src/platform/auth/token-verifier.js";

describe("extractBearerToken", () => {
  it("extracts bearer token from authorization header", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("returns null for missing bearer token", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
  });
});
