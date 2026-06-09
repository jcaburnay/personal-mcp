import { type Cadence, isSupportedCadence } from "./cadence.js";

/**
 * Pure streak engine for the habits app. Everything is computed from explicit inputs (no clock),
 * so it is fully deterministic and testable. Dates are date-only `yyyy-mm-dd` strings interpreted
 * as calendar days; the caller is responsible for passing dates already resolved to the user's
 * timezone (see the plan's timezone decision).
 */

const MS_PER_DAY = 86_400_000;

/** Calendar day number for a `yyyy-mm-dd` string (days since the Unix epoch, UTC). */
function toEpochDay(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY);
}

/** Inverse of toEpochDay: the `yyyy-mm-dd` string for a calendar day number. */
function fromEpochDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** ISO weekday for a `yyyy-mm-dd` string: 1 = Monday … 7 = Sunday. */
function isoWeekday(date: string): number {
  const sundayZero = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday … 6 = Saturday
  return sundayZero === 0 ? 7 : sundayZero;
}

/** Whether `date` is a day the habit is scheduled for under `cadence`. */
export function isDue(cadence: Cadence, date: string): boolean {
  switch (cadence.kind) {
    case "daily":
      return true;
    case "weekdays":
      return cadence.days.includes(isoWeekday(date));
    case "interval": {
      const delta = toEpochDay(date) - toEpochDay(cadence.anchor);
      return delta >= 0 && delta % cadence.everyNDays === 0;
    }
    default:
      throw new Error(`Unsupported cadence kind: ${cadence.kind}`);
  }
}

/** A single completion record. `date` is date-only; `count` is the amount logged that day. */
export type HabitEntry = { date: string; count: number };

/** One day in the trailing 7-day strip the widget renders. */
export type StripDay = { date: string; due: boolean; done: boolean };

export type HabitStats = {
  currentStreak: number;
  longestStreak: number;
  /** Fraction (0–1) of due days completed across the active window. */
  completionRate: number;
  weeklyStrip: StripDay[];
};

const STRIP_DAYS = 7;

/**
 * Compute streak/completion stats for a habit as of a given day. A day counts as "done" when an
 * entry exists for it with `count >= targetCount`. Streaks count only days the cadence makes due;
 * an off day is skipped rather than treated as a miss. Today (`asOf`) being unfinished does not
 * break the current streak — it is given grace until the day ends.
 */
export function computeStats(
  cadence: Cadence,
  targetCount: number,
  entries: HabitEntry[],
  asOf: string
): HabitStats {
  if (!isSupportedCadence(cadence)) {
    throw new Error(`Unsupported cadence kind: ${cadence.kind}`);
  }

  const asOfDay = toEpochDay(asOf);
  const done = new Set(
    entries
      .filter((entry) => entry.count >= targetCount && toEpochDay(entry.date) <= asOfDay)
      .map((entry) => entry.date)
  );
  const isDone = (date: string) => done.has(date);

  const consideredDays = entries
    .map((entry) => toEpochDay(entry.date))
    .filter((day) => day <= asOfDay);
  const earliestDay = consideredDays.length ? Math.min(...consideredDays) : asOfDay;

  // Current streak: walk back from asOf over due days, stopping at the first missed due day.
  // The most recent due day, if it is asOf and unfinished, is grace-skipped rather than counted.
  let currentStreak = 0;
  let seenDueDay = false;
  for (let day = asOfDay; day >= earliestDay; day -= 1) {
    const date = fromEpochDay(day);
    if (!isDue(cadence, date)) continue;
    if (isDone(date)) {
      currentStreak += 1;
    } else if (!seenDueDay && date === asOf) {
      // grace: today is due but not yet done — neither count nor break.
    } else {
      break;
    }
    seenDueDay = true;
  }

  // Longest streak + completion rate: scan the whole window forward over due days.
  let longestStreak = 0;
  let run = 0;
  let dueCount = 0;
  let doneCount = 0;
  for (let day = earliestDay; day <= asOfDay; day += 1) {
    const date = fromEpochDay(day);
    if (!isDue(cadence, date)) continue;
    dueCount += 1;
    if (isDone(date)) {
      doneCount += 1;
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 0;
    }
  }
  const completionRate = dueCount === 0 ? 0 : doneCount / dueCount;

  const weeklyStrip: StripDay[] = [];
  for (let offset = STRIP_DAYS - 1; offset >= 0; offset -= 1) {
    const date = fromEpochDay(asOfDay - offset);
    weeklyStrip.push({ date, due: isDue(cadence, date), done: isDone(date) });
  }

  return { currentStreak, longestStreak, completionRate, weeklyStrip };
}
