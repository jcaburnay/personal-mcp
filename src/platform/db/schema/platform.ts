import { index, jsonb, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const platformSchema = pgSchema("platform");

export const appUsers = platformSchema.table("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalSubject: text("external_subject").notNull().unique(),
  email: text("email"),
  displayName: text("display_name"),
  // IANA timezone used to compute date boundaries for date-sensitive apps (e.g. habit streaks).
  // Nullable; callers fall back to DEFAULT_TIMEZONE when unset.
  timezone: text("timezone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appUserScopes = platformSchema.table(
  "app_user_scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.scope)]
);

export const auditEvents = platformSchema.table(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    app: text("app").notNull(),
    toolName: text("tool_name").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    requestId: text("request_id"),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_events_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
    index("audit_events_tool_name_created_at_idx").on(table.toolName, table.createdAt.desc()),
  ]
);

export const idempotencyKeys = platformSchema.table(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    clientRequestId: text("client_request_id").notNull(),
    resultJson: jsonb("result_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique().on(table.userId, table.toolName, table.clientRequestId),
    index("idempotency_keys_expires_at_idx").on(table.expiresAt),
  ]
);
