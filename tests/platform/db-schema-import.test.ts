import { describe, expect, it } from "vitest";
import { appUsers, auditEvents, idempotencyKeys } from "../../src/platform/db/schema/platform.js";

describe("platform schema", () => {
  it("exports core tables", () => {
    expect(appUsers).toBeDefined();
    expect(auditEvents).toBeDefined();
    expect(idempotencyKeys).toBeDefined();
  });
});
