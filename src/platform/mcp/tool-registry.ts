import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type RegisteredTool = {
  name: string;
  register: (server: McpServer) => void;
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
    registerAll(server: McpServer) {
      for (const tool of this.list()) {
        tool.register(server);
      }
    },
  };
}
