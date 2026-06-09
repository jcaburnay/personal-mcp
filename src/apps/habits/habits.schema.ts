import {
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { appUsers } from "../../platform/db/schema/platform.js";
import type { Cadence, CadenceKind } from "./cadence.js";

export const habitsSchema = pgSchema("habits");

export const habits = habitsSchema.table(
  "habits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    // `cadence_kind` is the discriminant (denormalized for filtering); `cadence_config` holds the
    // full validated Cadence object (including `kind`) as jsonb. See cadence.ts.
    cadenceKind: text("cadence_kind").$type<CadenceKind>().notNull(),
    cadenceConfig: jsonb("cadence_config").$type<Cadence>().notNull(),
    // Amount that counts a day as "done" (binary = 1; quantified = the goal).
    targetCount: integer("target_count").notNull().default(1),
    unit: text("unit"),
    color: text("color"),
    // Soft-delete marker (archive instead of hard delete).
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("habits_user_id_idx").on(table.userId)]
);

export const habitEntries = habitsSchema.table(
  "habit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    // Date-only (`yyyy-mm-dd`); the caller supplies its local date (see plan's timezone decision).
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    count: integer("count").notNull().default(1),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // One logical check-in per habit per day → check_in is an idempotent upsert on this key.
  (table) => [unique("habit_entries_habit_id_entry_date_key").on(table.habitId, table.entryDate)]
);
