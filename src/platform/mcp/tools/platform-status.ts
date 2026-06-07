import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { structuredToolResult } from "../tool-result.js";

export function getPlatformStatus(version: string) {
  return {
    service: "personal-mcp",
    version,
    status: "ok",
  };
}

export function registerPlatformStatusTool(server: McpServer, version: string) {
  server.registerTool(
    "platform.status",
    {
      title: "Platform Status",
      description: "Use this when checking whether the Personal MCP platform is online.",
      inputSchema: {},
      outputSchema: {
        service: z.string(),
        version: z.string(),
        status: z.literal("ok"),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const status = getPlatformStatus(version);
      return structuredToolResult("Personal MCP is online.", status);
    }
  );
}
