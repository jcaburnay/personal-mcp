import { createAuditService } from "../../platform/audit/audit-service.js";
import { assertScopes } from "../../platform/auth/scopes.js";
import type { Database } from "../../platform/db/client.js";
import { createIdempotencyService } from "../../platform/idempotency/idempotency-service.js";
import type { ToolContext } from "../../platform/mcp/tool-context.js";
import { type Cadence, cadenceSchema } from "./cadence.js";
import { createHabitsRepository } from "./habits.repository.js";
import { computeStats, type HabitStats } from "./streak.js";

const APP = "habits";
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

type HabitRow = Awaited<ReturnType<ReturnType<typeof createHabitsRepository>["getHabit"]>>;

export type HabitView = {
  id: string;
  name: string;
  description: string | null;
  cadence: Cadence;
  targetCount: number;
  unit: string | null;
  color: string | null;
};

export type TrackedHabit = HabitView & HabitStats;

export type CreateHabitInput = {
  clientRequestId: string;
  name: string;
  description?: string | undefined;
  cadence: Cadence;
  targetCount?: number | undefined;
  unit?: string | undefined;
  color?: string | undefined;
};

export type CheckInInput = {
  clientRequestId: string;
  habitId: string;
  date: string;
  count: number;
  /** "Today" in the user's timezone, used for streak math. Defaults to the entry date. */
  today?: string;
};

export type ArchiveInput = { clientRequestId: string; habitId: string };

function toHabitView(habit: NonNullable<HabitRow>): HabitView {
  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    cadence: habit.cadenceConfig,
    targetCount: habit.targetCount,
    unit: habit.unit,
    color: habit.color,
  };
}

export function createHabitsService(deps: { db: Database; context: ToolContext }) {
  const { db, context } = deps;
  const repository = createHabitsRepository(db);
  const audit = createAuditService(db);
  const idempotency = createIdempotencyService(db);

  function requireUserId(): string {
    if (!context.currentUser) {
      // Auth is enforced before the server is built; this is a defensive guard.
      throw new Error("No authenticated user in context");
    }
    return context.currentUser.id;
  }

  // Replay a stored idempotent result, or run `work` and persist its result under the key.
  async function withIdempotency<T>(
    userId: string,
    toolName: string,
    clientRequestId: string,
    work: () => Promise<T>
  ): Promise<T> {
    const existing = await idempotency.findResult(userId, toolName, clientRequestId);
    if (existing !== null) return existing as T;

    const result = await work();
    await idempotency.storeResult({
      userId,
      toolName,
      clientRequestId,
      resultJson: result,
      expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    });
    return result;
  }

  return {
    async createHabit(input: CreateHabitInput): Promise<{ habit: HabitView }> {
      assertScopes(context.grantedScopes, ["habits.write"]);
      const userId = requireUserId();

      return withIdempotency(userId, "habits.create", input.clientRequestId, async () => {
        const cadence = cadenceSchema.parse(input.cadence);
        const habit = await repository.createHabit({
          userId,
          name: input.name,
          description: input.description ?? null,
          cadenceKind: cadence.kind,
          cadenceConfig: cadence,
          targetCount: input.targetCount ?? 1,
          unit: input.unit ?? null,
          color: input.color ?? null,
        });
        await audit.record({
          userId,
          app: APP,
          toolName: "habits.create",
          action: "create",
          entityType: "habit",
          entityId: habit.id,
          requestId: context.requestId,
          beforeJson: null,
          afterJson: habit,
        });
        return { habit: toHabitView(habit) };
      });
    },

    async checkIn(input: CheckInInput): Promise<{ habit: HabitView; stats: HabitStats }> {
      assertScopes(context.grantedScopes, ["habits.write"]);
      const userId = requireUserId();

      return withIdempotency(userId, "habits.check_in", input.clientRequestId, async () => {
        const habit = await repository.getHabit(input.habitId, userId);
        if (!habit) throw new Error("Habit not found");

        // count 0 un-checks the day (delete the entry); otherwise upsert it.
        if (input.count <= 0) {
          await repository.clearEntry(habit.id, input.date);
        } else {
          await repository.upsertEntry({
            habitId: habit.id,
            userId,
            entryDate: input.date,
            count: input.count,
          });
        }
        await audit.record({
          userId,
          app: APP,
          toolName: "habits.check_in",
          action: input.count <= 0 ? "uncheck" : "check_in",
          entityType: "habit",
          entityId: habit.id,
          requestId: context.requestId,
          beforeJson: null,
          afterJson: { date: input.date, count: input.count },
        });

        const entries = await repository.listEntriesByHabitIds([habit.id]);
        const stats = computeStats(
          habit.cadenceConfig,
          habit.targetCount,
          entries.map((entry) => ({ date: entry.entryDate, count: entry.count })),
          input.today ?? input.date
        );
        return { habit: toHabitView(habit), stats };
      });
    },

    async archive(input: ArchiveInput): Promise<{ habitId: string }> {
      assertScopes(context.grantedScopes, ["habits.write"]);
      const userId = requireUserId();

      return withIdempotency(userId, "habits.archive", input.clientRequestId, async () => {
        const habit = await repository.getHabit(input.habitId, userId);
        if (!habit) throw new Error("Habit not found");
        await repository.archiveHabit(habit.id, userId);
        await audit.record({
          userId,
          app: APP,
          toolName: "habits.archive",
          action: "archive",
          entityType: "habit",
          entityId: habit.id,
          requestId: context.requestId,
          beforeJson: habit,
          afterJson: { ...habit, archivedAt: "now" },
        });
        return { habitId: habit.id };
      });
    },

    async listTracker(input: {
      today: string;
    }): Promise<{ today: string; habits: TrackedHabit[] }> {
      assertScopes(context.grantedScopes, ["habits.read"]);
      const userId = requireUserId();

      const active = await repository.listActiveHabits(userId);
      const entries = await repository.listEntriesByHabitIds(active.map((habit) => habit.id));
      const entriesByHabit = new Map<string, { date: string; count: number }[]>();
      for (const entry of entries) {
        const list = entriesByHabit.get(entry.habitId) ?? [];
        list.push({ date: entry.entryDate, count: entry.count });
        entriesByHabit.set(entry.habitId, list);
      }

      const tracked = active.map((habit) => {
        const stats = computeStats(
          habit.cadenceConfig,
          habit.targetCount,
          entriesByHabit.get(habit.id) ?? [],
          input.today
        );
        return { ...toHabitView(habit), ...stats };
      });

      return { today: input.today, habits: tracked };
    },
  };
}
