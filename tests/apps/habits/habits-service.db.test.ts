import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { habits as habitsTable } from "../../../src/apps/habits/habits.schema.js";
import { createHabitsService } from "../../../src/apps/habits/habits.service.js";
import type { CurrentUser } from "../../../src/platform/auth/current-user.js";
import { createDatabase } from "../../../src/platform/db/client.js";
import {
  appUsers,
  appUserScopes,
  idempotencyKeys,
} from "../../../src/platform/db/schema/platform.js";

// DB-tier: requires a running local Supabase with the habits migration applied.
// Enabled via `pnpm test:db` (RUN_DB_TESTS=1); skipped during the offline `pnpm test`.
const runDbTests = process.env.RUN_DB_TESTS === "1";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55322/postgres";

const TEST_SUBJECT = "db-test:habits-service";

describe.runIf(runDbTests)("habits service (DB)", () => {
  const db = createDatabase({ databaseUrl });
  let user: CurrentUser;

  function serviceFor(grantedScopes: string[]) {
    return createHabitsService({
      db,
      context: { requestId: "test-req", currentUser: user, grantedScopes },
    });
  }

  async function cleanUser() {
    await db.delete(appUsers).where(eq(appUsers.externalSubject, TEST_SUBJECT));
  }

  beforeAll(async () => {
    await cleanUser();
    const [row] = await db
      .insert(appUsers)
      .values({ externalSubject: TEST_SUBJECT, email: "habits@example.com", timezone: "UTC" })
      .returning();
    if (!row) throw new Error("Failed to seed test user");
    user = {
      id: row.id,
      externalSubject: row.externalSubject,
      email: row.email,
      displayName: row.displayName,
      timezone: row.timezone,
    };
    await db.insert(appUserScopes).values([
      { userId: user.id, scope: "habits.read" },
      { userId: user.id, scope: "habits.write" },
    ]);
  });

  afterAll(async () => {
    await cleanUser();
    await db.$client.end();
  });

  // Each test starts from a clean slate of habits (entries cascade-delete with the habit) and
  // idempotency keys — otherwise reusing a clientRequestId replays a prior (now-deleted) result.
  beforeEach(async () => {
    await db.delete(habitsTable).where(eq(habitsTable.userId, user.id));
    await db.delete(idempotencyKeys).where(eq(idempotencyKeys.userId, user.id));
  });

  it("creates a habit and lists it with a zero streak", async () => {
    const service = serviceFor(["habits.read", "habits.write"]);
    const created = await service.createHabit({
      clientRequestId: "c1",
      name: "Meditate",
      cadence: { kind: "daily" },
    });
    expect(created.habit.name).toBe("Meditate");

    const tracker = await service.listTracker({ today: "2026-06-10" });
    expect(tracker.habits).toHaveLength(1);
    expect(tracker.habits[0]?.name).toBe("Meditate");
    expect(tracker.habits[0]?.currentStreak).toBe(0);
  });

  it("records a check-in that advances the streak", async () => {
    const service = serviceFor(["habits.read", "habits.write"]);
    const { habit } = await service.createHabit({
      clientRequestId: "c1",
      name: "Read",
      cadence: { kind: "daily" },
    });

    await service.checkIn({
      clientRequestId: "k1",
      habitId: habit.id,
      date: "2026-06-10",
      count: 1,
    });

    const tracker = await service.listTracker({ today: "2026-06-10" });
    expect(tracker.habits[0]?.currentStreak).toBe(1);
  });

  it("upserts the same day rather than duplicating, and reflects the latest count", async () => {
    const service = serviceFor(["habits.read", "habits.write"]);
    const { habit } = await service.createHabit({
      clientRequestId: "c1",
      name: "Water",
      cadence: { kind: "daily" },
      targetCount: 8,
      unit: "glasses",
    });

    await service.checkIn({
      clientRequestId: "k1",
      habitId: habit.id,
      date: "2026-06-10",
      count: 5,
    });
    // Below target -> not done yet.
    let tracker = await service.listTracker({ today: "2026-06-10" });
    expect(tracker.habits[0]?.currentStreak).toBe(0);

    await service.checkIn({
      clientRequestId: "k2",
      habitId: habit.id,
      date: "2026-06-10",
      count: 8,
    });
    tracker = await service.listTracker({ today: "2026-06-10" });
    expect(tracker.habits[0]?.currentStreak).toBe(1);
  });

  it("clears the day's entry when checking in with count 0", async () => {
    const service = serviceFor(["habits.read", "habits.write"]);
    const { habit } = await service.createHabit({
      clientRequestId: "c1",
      name: "Stretch",
      cadence: { kind: "daily" },
    });
    await service.checkIn({
      clientRequestId: "k1",
      habitId: habit.id,
      date: "2026-06-10",
      count: 1,
    });
    await service.checkIn({
      clientRequestId: "k2",
      habitId: habit.id,
      date: "2026-06-10",
      count: 0,
    });

    const tracker = await service.listTracker({ today: "2026-06-10" });
    expect(tracker.habits[0]?.currentStreak).toBe(0);
  });

  it("hides archived habits from the tracker", async () => {
    const service = serviceFor(["habits.read", "habits.write"]);
    const { habit } = await service.createHabit({
      clientRequestId: "c1",
      name: "Journal",
      cadence: { kind: "daily" },
    });
    await service.archive({ clientRequestId: "a1", habitId: habit.id });

    const tracker = await service.listTracker({ today: "2026-06-10" });
    expect(tracker.habits).toHaveLength(0);
  });

  it("rejects writes when the caller lacks habits.write", async () => {
    const service = serviceFor(["habits.read"]);
    await expect(
      service.createHabit({ clientRequestId: "c1", name: "Nope", cadence: { kind: "daily" } })
    ).rejects.toThrow();
  });
});
