import { useEffect, useState } from "react";
import type { CheckInResult, HabitStats, StripDay, TrackedHabit, TrackerData } from "./openai.js";

const EMPTY: TrackerData = { today: localToday(), habits: [] };

/** Browser-local date as `yyyy-mm-dd` (en-CA formats that way). Authoritative for check-ins. */
function localToday(): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function isDoneToday(habit: TrackedHabit, today: string): boolean {
  return habit.weeklyStrip.find((day) => day.date === today)?.done ?? false;
}

/** A full tracker payload (open_tracker/list output), or null if it isn't one. */
function asTracker(sc: unknown): TrackerData | null {
  if (sc && typeof sc === "object" && Array.isArray((sc as TrackerData).habits)) {
    return sc as TrackerData;
  }
  return null;
}

/** Merge a check-in's partial `{ habit, stats }` payload into the tracker by habit id. */
function mergeCheckIn(prev: TrackerData, sc: unknown): TrackerData {
  if (!sc || typeof sc !== "object") return prev;
  const { habit, stats } = sc as Partial<CheckInResult>;
  if (habit?.id && stats) {
    return {
      ...prev,
      habits: prev.habits.map((h) => (h.id === habit.id ? { ...h, ...stats } : h)),
    };
  }
  return prev;
}

/** Optimistic local flip so the card responds instantly; the server result reconciles it. */
function optimisticToggle(habit: TrackedHabit, today: string, wasDone: boolean): TrackedHabit {
  const stats: HabitStats = {
    currentStreak: wasDone ? Math.max(0, habit.currentStreak - 1) : habit.currentStreak + 1,
    longestStreak: Math.max(habit.longestStreak, wasDone ? 0 : habit.currentStreak + 1),
    completionRate: habit.completionRate,
    weeklyStrip: habit.weeklyStrip.map((d) => (d.date === today ? { ...d, done: !wasDone } : d)),
  };
  return { ...habit, ...stats };
}

export function HabitsWidget() {
  // Seed from the frozen open_tracker snapshot for an instant first paint…
  const [data, setData] = useState<TrackerData>(
    () => asTracker(window.openai?.toolOutput) ?? EMPTY
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const today = localToday();

  // …then re-fetch the *current* state from the server on every mount. open_tracker's toolOutput is
  // a point-in-time snapshot, so a refreshed or older card would otherwise show stale data; calling
  // the read-only habits.list tool makes the widget always reflect the live DB. Also reconcile
  // check-in results the host pushes over ui/notifications/tool-result.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await window.openai?.callTool?.("habits.list", {});
      const tracker = asTracker(result?.structuredContent);
      if (tracker && !cancelled) setData(tracker);
    })();

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (message?.jsonrpc !== "2.0") return;
      if (message.method !== "ui/notifications/tool-result") return;
      setData((prev) => mergeCheckIn(prev, message.params?.structuredContent));
    };
    window.addEventListener("message", onMessage, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
    };
  }, []);

  async function toggle(habit: TrackedHabit) {
    const wasDone = isDoneToday(habit, today);
    // Optimistic: flip immediately so the button + strip respond without waiting on the round-trip.
    setData((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === habit.id ? optimisticToggle(h, today, wasDone) : h)),
    }));
    setPendingId(habit.id);
    try {
      const result = await window.openai?.callTool?.("habits.check_in", {
        client_request_id: newRequestId(),
        habit_id: habit.id,
        date: today,
        count: wasDone ? 0 : habit.targetCount,
      });
      if (result?.structuredContent) {
        setData((prev) => mergeCheckIn(prev, result.structuredContent));
      }
    } finally {
      setPendingId(null);
    }
  }

  if (data.habits.length === 0) {
    return (
      <div style={styles.root}>
        <div style={styles.brand}>personal-mcp · habits</div>
        <div style={styles.empty}>
          No active habits yet. Ask ChatGPT to create one — e.g. “create a daily meditation habit.”
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.brand}>personal-mcp · habits</div>
      <div style={styles.list}>
        {data.habits.map((habit) => {
          const done = isDoneToday(habit, today);
          const pending = pendingId === habit.id;
          return (
            <div key={habit.id} style={styles.card}>
              <div style={styles.cardMain}>
                <span style={{ ...styles.dot, background: habit.color ?? "#6366f1" }} />
                <div style={styles.cardText}>
                  <div style={styles.name}>{habit.name}</div>
                  <div style={styles.meta}>
                    🔥 {habit.currentStreak} day{habit.currentStreak === 1 ? "" : "s"}
                    <span style={styles.metaDim}>
                      {" · "}
                      best {habit.longestStreak}
                      {habit.targetCount > 1
                        ? ` · goal ${habit.targetCount} ${habit.unit ?? ""}`
                        : ""}
                    </span>
                  </div>
                  <Strip days={habit.weeklyStrip} />
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(habit)}
                disabled={pending}
                style={{ ...styles.button, ...(done ? styles.buttonDone : {}) }}
              >
                {pending ? "…" : done ? "✓ Done" : "Check in"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Strip({ days }: { days: StripDay[] }) {
  return (
    <div style={styles.strip}>
      {days.map((day) => {
        const background = day.done ? "#111827" : "transparent";
        const border = day.done ? "#111827" : day.due ? "#cbd5e1" : "#eef2f7";
        return (
          <span
            key={day.date}
            title={day.date}
            style={{ ...styles.stripDot, background, borderColor: border }}
          />
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { fontFamily: "system-ui, sans-serif", padding: 16, color: "#0f172a" },
  brand: { fontSize: 12, opacity: 0.55, marginBottom: 10 },
  empty: { fontSize: 14, lineHeight: 1.5, color: "#475569" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    border: "1px solid #e7ebf0",
    borderRadius: 14,
  },
  cardMain: { display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 },
  cardText: { minWidth: 0 },
  name: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  meta: { fontSize: 13, color: "#334155" },
  metaDim: { color: "#94a3b8" },
  strip: { display: "flex", gap: 4, marginTop: 8 },
  stripDot: { width: 12, height: 12, borderRadius: 4, border: "1.5px solid" },
  button: {
    flexShrink: 0,
    padding: "8px 14px",
    borderRadius: 999,
    border: "none",
    background: "#111827",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonDone: { background: "#16a34a" },
};
