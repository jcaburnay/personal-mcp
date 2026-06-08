import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { CurrentUser } from "../../auth/current-user.js";
import type { ToolContext } from "../tool-context.js";
import { structuredToolResult } from "../tool-result.js";

export function getWhoami(currentUser: CurrentUser) {
  return {
    userId: currentUser.id,
    externalSubject: currentUser.externalSubject,
    email: currentUser.email,
    displayName: currentUser.displayName,
  };
}

export function registerPlatformWhoamiTool(server: McpServer, context: ToolContext) {
  server.registerTool(
    "platform.whoami",
    {
      title: "Who Am I",
      description:
        "Use this to see the authenticated user the Personal MCP platform resolved you to.",
      inputSchema: {},
      outputSchema: {
        userId: z.string(),
        externalSubject: z.string(),
        email: z.string().nullable(),
        displayName: z.string().nullable(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      if (!context.currentUser) {
        // Auth is enforced before the server is built, so this is a defensive guard.
        throw new Error("No authenticated user in context");
      }

      const identity = getWhoami(context.currentUser);
      return structuredToolResult(
        `You are ${identity.email ?? identity.externalSubject}.`,
        identity
      );
    }
  );
}
