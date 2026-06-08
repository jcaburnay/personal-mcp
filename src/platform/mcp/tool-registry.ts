import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./tool-context.js";

export type RegisteredTool = {
  name: string;
  register: (server: McpServer, context: ToolContext) => void;
};

export function createToolRegistry() {
  const tools: RegisteredTool[] = [];

  return {
    add(tool: RegisteredTool) {
      tools.push(tool);
    },
    list() {
      return [...tools].sort((left, right) => left.name.localeCompare(right.name));
    },
    registerAll(server: McpServer, context: ToolContext) {
      for (const tool of this.list()) {
        tool.register(server, context);
      }
    },
  };
}
