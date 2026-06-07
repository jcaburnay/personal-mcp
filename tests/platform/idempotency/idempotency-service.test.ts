import { describe, expect, it } from "vitest";
import { createIdempotencyKey } from "../../../src/platform/idempotency/idempotency-service.js";

describe("createIdempotencyKey", () => {
  it("creates a stable key", () => {
    expect(createIdempotencyKey("user-1", "notes.create", "request-1")).toBe(
      "user-1:notes.create:request-1"
    );
  });
});
