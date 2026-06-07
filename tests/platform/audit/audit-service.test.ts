import { describe, expect, it, vi } from "vitest";
import { createAuditService } from "../../../src/platform/audit/audit-service.js";

describe("createAuditService", () => {
  it("writes audit event through database insert", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "event-1" }]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const db = { insert };

    const service = createAuditService(db as never);
    await service.record({
      userId: "user-1",
      app: "platform",
      toolName: "platform.status",
      action: "read",
      entityType: "platform",
      entityId: "status",
      requestId: "request-1",
      beforeJson: null,
      afterJson: { ok: true },
    });

    expect(insert).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledOnce();
  });
});
