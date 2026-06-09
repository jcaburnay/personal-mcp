import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { structuredToolResult } from "../../platform/mcp/tool-result.js";
import { cadenceSchema } from "./cadence.js";
import type { createHabitsService } from "./habits.service.js";
import { HABITS_WIDGET_URI } from "./habits.widget.js";

type HabitsService = ReturnType<typeof createHabitsService>;

/**
 * Habit tools. `habits.open_tracker` owns the widget template (links it via `_meta.ui.resourceUri`
 * + the `openai/outputTemplate` ChatGPT alias) and returns the tracker data the widget reads as
 * `window.openai.toolOutput`. The write tools are decoupled data tools the widget/model invoke
 * directly. Every write takes a `client_request_id` for idempotency; scope checks, audit, and
 * streak computation live in the service.
 */

const clientRequestId = z.string().min(1);

export function registerHabitsOpenTrackerTool(
  server: McpServer,
  service: HabitsService,
  resolveToday: () => string
) {
  server.registerTool(
    "habits.open_tracker",
    {
      title: "Open Habit Tracker",
      description: "Show the user's active habits with current streaks and the last 7 days.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
      _meta: {
        ui: { resourceUri: HABITS_WIDGET_URI },
        "openai/outputTemplate": HABITS_WIDGET_URI,
      },
    },
    async () => {
      const tracker = await service.listTracker({ today: resolveToday() });
      const summary =
        tracker.habits.length === 0
          ? "You have no active habits yet. Create one to get started."
          : `You have ${tracker.habits.length} active habit(s).`;
      return structuredToolResult(summary, tracker);
    }
  );
}

export function registerHabitsListTool(
  server: McpServer,
  service: HabitsService,
  resolveToday: () => string
) {
  server.registerTool(
    "habits.list",
    {
      title: "List Habits",
      description:
        "Return the user's active habits with current streaks and the last 7 days, as data " +
        "(no widget). The habit tracker widget calls this on load to show the current state.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const tracker = await service.listTracker({ today: resolveToday() });
      const summary =
        tracker.habits.length === 0
          ? "No active habits."
          : `${tracker.habits.length} active habit(s).`;
      return structuredToolResult(summary, tracker);
    }
  );
}

export function registerHabitsCreateTool(server: McpServer, service: HabitsService) {
  server.registerTool(
    "habits.create",
    {
      title: "Create Habit",
      description: "Create a habit with a cadence (daily, specific weekdays, or every N days).",
      inputSchema: {
        client_request_id: clientRequestId,
        name: z.string().min(1),
        description: z.string().optional(),
        cadence: cadenceSchema,
        target_count: z.number().int().min(1).optional(),
        unit: z.string().optional(),
        color: z.string().optional(),
      },
    },
    async (input) => {
      const { habit } = await service.createHabit({
        clientRequestId: input.client_request_id,
        name: input.name,
        description: input.description,
        cadence: input.cadence,
        targetCount: input.target_count,
        unit: input.unit,
        color: input.color,
      });
      return structuredToolResult(`Created habit "${habit.name}".`, { habit });
    }
  );
}

export function registerHabitsCheckInTool(
  server: McpServer,
  service: HabitsService,
  resolveToday: () => string
) {
  server.registerTool(
    "habits.check_in",
    {
      title: "Check In",
      description: "Record (or, with count 0, clear) a habit's completion for a date.",
      inputSchema: {
        client_request_id: clientRequestId,
        habit_id: z.string().min(1),
        // Date-only `yyyy-mm-dd`; defaults to today. The widget passes the browser-local date.
        date: z.iso.date().optional(),
        count: z.number().int().min(0).optional(),
      },
    },
    async (input) => {
      const today = resolveToday();
      const date = input.date ?? today;
      const { habit, stats } = await service.checkIn({
        clientRequestId: input.client_request_id,
        habitId: input.habit_id,
        date,
        count: input.count ?? 1,
        today,
      });
      const verb = (input.count ?? 1) <= 0 ? "Cleared" : "Checked in";
      return structuredToolResult(
        `${verb} "${habit.name}" for ${date} (streak: ${stats.currentStreak}).`,
        { habit, stats }
      );
    }
  );
}

export function registerHabitsArchiveTool(server: McpServer, service: HabitsService) {
  server.registerTool(
    "habits.archive",
    {
      title: "Archive Habit",
      description: "Archive a habit (soft delete; it stops showing in the tracker).",
      inputSchema: {
        client_request_id: clientRequestId,
        habit_id: z.string().min(1),
      },
    },
    async (input) => {
      const { habitId } = await service.archive({
        clientRequestId: input.client_request_id,
        habitId: input.habit_id,
      });
      return structuredToolResult("Archived the habit.", { habitId });
    }
  );
}

/** Resolve "today" as a date-only string in the given IANA timezone (en-CA formats as yyyy-mm-dd). */
export function todayInTimezone(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
