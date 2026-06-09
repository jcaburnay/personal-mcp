import { describe, expect, it } from "vitest";
import type { Cadence } from "../../../src/apps/habits/cadence.js";
import { computeStats, isDue } from "../../../src/apps/habits/streak.js";

const daily: Cadence = { kind: "daily" };

describe("isDue", () => {
  it("treats a daily habit as due every day", () => {
    const cadence: Cadence = { kind: "daily" };
    expect(isDue(cadence, "2026-06-09")).toBe(true);
    expect(isDue(cadence, "2026-06-10")).toBe(true);
  });

  it("is due only on the configured weekdays", () => {
    // Mon/Wed/Fri. 2026-06-08 is a Monday (ISO 1); 2026-06-09 is a Tuesday (ISO 2).
    const cadence: Cadence = { kind: "weekdays", days: [1, 3, 5] };
    expect(isDue(cadence, "2026-06-08")).toBe(true);
    expect(isDue(cadence, "2026-06-09")).toBe(false);
  });

  it("is due every N days counting from the anchor", () => {
    const cadence: Cadence = { kind: "interval", everyNDays: 2, anchor: "2026-06-09" };
    expect(isDue(cadence, "2026-06-09")).toBe(true); // anchor
    expect(isDue(cadence, "2026-06-11")).toBe(true); // +2
    expect(isDue(cadence, "2026-06-10")).toBe(false); // +1
  });

  it("is never due before the interval anchor", () => {
    const cadence: Cadence = { kind: "interval", everyNDays: 2, anchor: "2026-06-09" };
    expect(isDue(cadence, "2026-06-07")).toBe(false);
  });

  it("throws for the deferred weekly_count cadence", () => {
    const cadence: Cadence = { kind: "weekly_count", times: 3 };
    expect(() => isDue(cadence, "2026-06-09")).toThrow();
  });
});

describe("computeStats", () => {
  it("returns zeros when there are no entries", () => {
    const stats = computeStats(daily, 1, [], "2026-06-10");
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.completionRate).toBe(0);
  });

  it("counts consecutive done days up to and including today", () => {
    const entries = [
      { date: "2026-06-08", count: 1 },
      { date: "2026-06-09", count: 1 },
      { date: "2026-06-10", count: 1 },
    ];
    const stats = computeStats(daily, 1, entries, "2026-06-10");
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
  });

  it("does not break the streak when today is not yet done (grace)", () => {
    // Today (asOf) has no entry; the two prior days are done.
    const entries = [
      { date: "2026-06-08", count: 1 },
      { date: "2026-06-09", count: 1 },
    ];
    const stats = computeStats(daily, 1, entries, "2026-06-10");
    expect(stats.currentStreak).toBe(2);
  });

  it("breaks the current streak on a missed day but keeps the longest run", () => {
    const entries = [
      { date: "2026-06-06", count: 1 },
      { date: "2026-06-07", count: 1 },
      { date: "2026-06-08", count: 1 },
      // 2026-06-09 missed
      { date: "2026-06-10", count: 1 },
    ];
    const stats = computeStats(daily, 1, entries, "2026-06-10");
    expect(stats.currentStreak).toBe(1);
    expect(stats.longestStreak).toBe(3);
  });

  it("counts a day done only when the count meets the target", () => {
    const met = computeStats(daily, 8, [{ date: "2026-06-08", count: 8 }], "2026-06-08");
    expect(met.currentStreak).toBe(1);
    const short = computeStats(daily, 8, [{ date: "2026-06-08", count: 5 }], "2026-06-08");
    expect(short.currentStreak).toBe(0);
  });

  it("only counts due days for a weekday cadence, skipping off days", () => {
    // Mon/Wed/Fri. Due: 06-08 (Mon), 06-10 (Wed), 06-12 (Fri); 06-09/06-11 are off days.
    const cadence: Cadence = { kind: "weekdays", days: [1, 3, 5] };
    const entries = [
      { date: "2026-06-08", count: 1 },
      { date: "2026-06-10", count: 1 },
      { date: "2026-06-12", count: 1 },
    ];
    const stats = computeStats(cadence, 1, entries, "2026-06-12");
    expect(stats.currentStreak).toBe(3);
    expect(stats.completionRate).toBe(1);
  });

  it("reports completion rate over due days in the active window", () => {
    // Done 06-08 and 06-10, missed 06-09 → 2 of 3 due days.
    const entries = [
      { date: "2026-06-08", count: 1 },
      { date: "2026-06-10", count: 1 },
    ];
    const stats = computeStats(daily, 1, entries, "2026-06-10");
    expect(stats.completionRate).toBeCloseTo(2 / 3, 5);
  });

  it("returns a 7-day strip ending at asOf with due/done flags", () => {
    const entries = [
      { date: "2026-06-09", count: 1 },
      { date: "2026-06-10", count: 1 },
    ];
    const { weeklyStrip } = computeStats(daily, 1, entries, "2026-06-10");
    expect(weeklyStrip).toHaveLength(7);
    expect(weeklyStrip[0]?.date).toBe("2026-06-04");
    expect(weeklyStrip[6]).toMatchObject({ date: "2026-06-10", due: true, done: true });
    expect(weeklyStrip[5]).toMatchObject({ date: "2026-06-09", done: true });
    expect(weeklyStrip[4]).toMatchObject({ date: "2026-06-08", done: false });
  });

  it("throws for the deferred weekly_count cadence", () => {
    const cadence: Cadence = { kind: "weekly_count", times: 3 };
    expect(() => computeStats(cadence, 1, [], "2026-06-10")).toThrow();
  });
});
