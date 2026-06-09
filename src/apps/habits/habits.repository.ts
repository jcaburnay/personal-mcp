import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Database } from "../../platform/db/client.js";
import type { Cadence, CadenceKind } from "./cadence.js";
import { habitEntries, habits } from "./habits.schema.js";

export type NewHabit = {
  userId: string;
  name: string;
  description: string | null;
  cadenceKind: CadenceKind;
  cadenceConfig: Cadence;
  targetCount: number;
  unit: string | null;
  color: string | null;
};

export function createHabitsRepository(db: Database) {
  return {
    async createHabit(values: NewHabit) {
      const [row] = await db.insert(habits).values(values).returning();
      if (!row) throw new Error("Failed to create habit");
      return row;
    },

    async getHabit(habitId: string, userId: string) {
      const [row] = await db
        .select()
        .from(habits)
        .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
        .limit(1);
      return row ?? null;
    },

    async listActiveHabits(userId: string) {
      return db
        .select()
        .from(habits)
        .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
        .orderBy(habits.createdAt);
    },

    async listEntriesByHabitIds(habitIds: string[]) {
      if (habitIds.length === 0) return [];
      return db.select().from(habitEntries).where(inArray(habitEntries.habitId, habitIds));
    },

    async upsertEntry(values: {
      habitId: string;
      userId: string;
      entryDate: string;
      count: number;
    }) {
      await db
        .insert(habitEntries)
        .values(values)
        .onConflictDoUpdate({
          target: [habitEntries.habitId, habitEntries.entryDate],
          set: { count: values.count, updatedAt: new Date() },
        });
    },

    async clearEntry(habitId: string, entryDate: string) {
      await db
        .delete(habitEntries)
        .where(and(eq(habitEntries.habitId, habitId), eq(habitEntries.entryDate, entryDate)));
    },

    async archiveHabit(habitId: string, userId: string) {
      await db
        .update(habits)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(habits.id, habitId), eq(habits.userId, userId)));
    },
  };
}
