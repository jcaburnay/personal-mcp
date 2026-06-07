import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { getPlatformStatus } from "../../../src/platform/mcp/tools/platform-status.js";
import { registerPlatformStatusTool } from "../../../src/platform/mcp/tools/platform-status.js";

type RegisteredStatusTool = {
  name: string;
  config: {
    title?: string;
    annotations?: {
      readOnlyHint?: boolean;
    };
  };
  callback: () => Promise<unknown> | unknown;
};

describe("getPlatformStatus", () => {
  it("returns platform status structured content", () => {
    expect(getPlatformStatus("0.1.0")).toEqual({
      service: "personal-mcp",
      version: "0.1.0",
      status: "ok",
    });
  });

  it("registers a read-only MCP tool with structured output", async () => {
    const registeredTools: RegisteredStatusTool[] = [];
    const server = {
      registerTool: (
        name: string,
        config: RegisteredStatusTool["config"],
        callback: RegisteredStatusTool["callback"]
      ) => {
        registeredTools.push({ name, config, callback });
      },
    };

    registerPlatformStatusTool(server as unknown as McpServer, "0.1.0");
    const registeredTool = registeredTools[0];

    expect(registeredTool?.name).toBe("platform.status");
    expect(registeredTool?.config.title).toBe("Platform Status");
    expect(registeredTool?.config.annotations?.readOnlyHint).toBe(true);
    await expect(registeredTool?.callback()).resolves.toEqual({
      content: [{ type: "text", text: "Personal MCP is online." }],
      structuredContent: {
        service: "personal-mcp",
        version: "0.1.0",
        status: "ok",
      },
    });
  });
});
