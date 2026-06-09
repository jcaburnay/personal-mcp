import { z } from "zod";

/**
 * A habit's cadence answers one question the streak engine hangs on: "for date D, is this
 * habit due?" It is stored as `cadence_kind` (the discriminant, denormalized into a column for
 * filtering) plus `cadence_config` (the full object, including `kind`, as jsonb).
 *
 * v1 wires the per-due-day kinds (`daily`, `weekdays`, `interval`) — they share one streak
 * engine. `weekly_count` is schema-allowed (so the model is flexible-ready with no future
 * migration) but deferred: no tool creates it and the streak engine does not yet compute it.
 */

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export const weekdaySchema = z.number().int().min(1).max(7);

export const cadenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("daily") }),
  z.object({ kind: z.literal("weekdays"), days: z.array(weekdaySchema).min(1) }),
  z.object({
    kind: z.literal("interval"),
    everyNDays: z.number().int().min(1),
    // Anchor day the interval counts from (date-only, `yyyy-mm-dd`).
    anchor: z.iso.date(),
  }),
  // Deferred — accepted by the schema but unsupported by tools/engine in v1.
  z.object({ kind: z.literal("weekly_count"), times: z.number().int().min(1) }),
]);

export type Cadence = z.infer<typeof cadenceSchema>;
export type CadenceKind = Cadence["kind"];

/** Kinds the v1 streak engine + tools support (everything except the deferred `weekly_count`). */
export const SUPPORTED_CADENCE_KINDS = ["daily", "weekdays", "interval"] as const;

export function isSupportedCadence(cadence: Cadence): boolean {
  return (SUPPORTED_CADENCE_KINDS as readonly string[]).includes(cadence.kind);
}
