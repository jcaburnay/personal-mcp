import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import type { ToolContext } from "../../../src/platform/mcp/tool-context.js";
import { createToolRegistry } from "../../../src/platform/mcp/tool-registry.js";

const testContext: ToolContext = {
  requestId: "req-test",
  currentUser: null,
  grantedScopes: [],
};

describe("createToolRegistry", () => {
  it("sorts tools by name", () => {
    const registry = createToolRegistry();
    registry.add({ name: "z.tool", register: () => undefined });
    registry.add({ name: "a.tool", register: () => undefined });

    expect(registry.list().map((tool) => tool.name)).toEqual(["a.tool", "z.tool"]);
  });

  it("registers tools in sorted order", () => {
    const registry = createToolRegistry();
    const calls: string[] = [];

    registry.add({ name: "z.tool", register: () => calls.push("z.tool") });
    registry.add({ name: "a.tool", register: () => calls.push("a.tool") });

    registry.registerAll({} as McpServer, testContext);

    expect(calls).toEqual(["a.tool", "z.tool"]);
  });
});
