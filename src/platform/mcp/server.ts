import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppEnv } from "../config/env.js";
import { createToolRegistry } from "./tool-registry.js";
import { registerPlatformStatusTool } from "./tools/platform-status.js";

export function createPersonalMcpServer(env: Pick<AppEnv, "mcpServerName" | "mcpServerVersion">) {
  const server = new McpServer({
    name: env.mcpServerName,
    version: env.mcpServerVersion,
  });

  const registry = createToolRegistry();
  registry.add({
    name: "platform.status",
    register: (mcpServer) => registerPlatformStatusTool(mcpServer, env.mcpServerVersion),
  });
  registry.registerAll(server);

  return server;
}
