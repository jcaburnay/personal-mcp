import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createHabitsService } from "../../apps/habits/habits.service.js";
import {
  registerHabitsArchiveTool,
  registerHabitsCheckInTool,
  registerHabitsCreateTool,
  registerHabitsListTool,
  registerHabitsOpenTrackerTool,
  todayInTimezone,
} from "../../apps/habits/habits.tools.js";
import { registerHabitsWidgetResource } from "../../apps/habits/habits.widget.js";
import type { AppEnv } from "../config/env.js";
import type { Database } from "../db/client.js";
import { createToolRegistry } from "./tool-registry.js";
import type { ToolContext } from "./tool-context.js";
import { registerPlatformStatusTool } from "./tools/platform-status.js";
import { registerPlatformWhoamiTool } from "./tools/platform-whoami.js";

const DEFAULT_TIMEZONE = "UTC";

export function createPersonalMcpServer(
  env: Pick<AppEnv, "mcpServerName" | "mcpServerVersion">,
  context: ToolContext,
  db: Database
) {
  const server = new McpServer({
    name: env.mcpServerName,
    version: env.mcpServerVersion,
  });

  const habitsService = createHabitsService({ db, context });
  // "Today" for date-sensitive streak math, resolved in the user's timezone (UTC until they set
  // one). The widget passes its browser-local date on check-in, which is authoritative there.
  const resolveToday = () => todayInTimezone(context.currentUser?.timezone ?? DEFAULT_TIMEZONE);

  const registry = createToolRegistry();
  registry.add({
    name: "platform.status",
    register: (mcpServer) => registerPlatformStatusTool(mcpServer, env.mcpServerVersion),
  });
  registry.add({
    name: "platform.whoami",
    register: (mcpServer, toolContext) => registerPlatformWhoamiTool(mcpServer, toolContext),
  });
  registry.add({
    name: "habits.archive",
    register: (mcpServer) => registerHabitsArchiveTool(mcpServer, habitsService),
  });
  registry.add({
    name: "habits.check_in",
    register: (mcpServer) => registerHabitsCheckInTool(mcpServer, habitsService, resolveToday),
  });
  registry.add({
    name: "habits.create",
    register: (mcpServer) => registerHabitsCreateTool(mcpServer, habitsService),
  });
  registry.add({
    name: "habits.list",
    register: (mcpServer) => registerHabitsListTool(mcpServer, habitsService, resolveToday),
  });
  registry.add({
    name: "habits.open_tracker",
    register: (mcpServer) => registerHabitsOpenTrackerTool(mcpServer, habitsService, resolveToday),
  });
  registry.registerAll(server, context);

  // MCP Apps widget resources register alongside tools on the per-request server.
  registerHabitsWidgetResource(server);

  return server;
}
