// Types for the data the habits tools return and the ChatGPT Apps SDK host bridge
// (`window.openai`). Kept intentionally small — only what the widget reads/calls.

export type StripDay = { date: string; due: boolean; done: boolean };

export type TrackedHabit = {
  id: string;
  name: string;
  description: string | null;
  targetCount: number;
  unit: string | null;
  color: string | null;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  weeklyStrip: StripDay[];
};

export type TrackerData = { today: string; habits: TrackedHabit[] };

export type HabitStats = Pick<
  TrackedHabit,
  "currentStreak" | "longestStreak" | "completionRate" | "weeklyStrip"
>;

export type CheckInResult = { habit: { id: string }; stats: HabitStats };

export type OpenAiGlobals = {
  toolOutput?: TrackerData | null;
  widgetState?: TrackerData | null;
  callTool?: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ structuredContent?: unknown }>;
  setWidgetState?: (state: unknown) => void;
};

declare global {
  interface Window {
    openai?: OpenAiGlobals;
  }
}
