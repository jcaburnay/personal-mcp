import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppEnv } from "../config/env.js";
import type { ToolContext } from "./tool-context.js";
import { createToolRegistry } from "./tool-registry.js";
import { registerPlatformStatusTool } from "./tools/platform-status.js";
import { registerPlatformWhoamiTool } from "./tools/platform-whoami.js";

export function createPersonalMcpServer(
  env: Pick<AppEnv, "mcpServerName" | "mcpServerVersion">,
  context: ToolContext
) {
  const server = new McpServer({
    name: env.mcpServerName,
    version: env.mcpServerVersion,
  });

  const registry = createToolRegistry();
  registry.add({
    name: "platform.status",
    register: (mcpServer) => registerPlatformStatusTool(mcpServer, env.mcpServerVersion),
  });
  registry.add({
    name: "platform.whoami",
    register: (mcpServer, toolContext) => registerPlatformWhoamiTool(mcpServer, toolContext),
  });
  registry.registerAll(server, context);

  return server;
}
