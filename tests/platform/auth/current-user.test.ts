import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentUser } from "../../../src/platform/auth/current-user.js";
import type { VerifiedToken } from "../../../src/platform/auth/token-verifier.js";
import { createDatabase } from "../../../src/platform/db/client.js";
import { appUsers } from "../../../src/platform/db/schema/platform.js";

// DB-tier: requires a running local Supabase and the platform migration applied.
// Enabled via `pnpm test:db` (sets RUN_DB_TESTS=1); skipped during the offline `pnpm test`.
const runDbTests = process.env.RUN_DB_TESTS === "1";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55322/postgres";

const TEST_SUBJECT = "db-test:current-user";

describe.runIf(runDbTests)("resolveCurrentUser (DB)", () => {
  const db = createDatabase({ databaseUrl });

  async function clean() {
    await db.delete(appUsers).where(eq(appUsers.externalSubject, TEST_SUBJECT));
  }

  beforeAll(clean);
  afterAll(async () => {
    await clean();
    await db.$client.end();
  });

  it("inserts on first sight and is idempotent on the second", async () => {
    const token: VerifiedToken = {
      sub: TEST_SUBJECT,
      email: "first@example.com",
      name: "First Name",
    };

    const first = await resolveCurrentUser(db, token);
    expect(first.externalSubject).toBe(TEST_SUBJECT);
    expect(first.email).toBe("first@example.com");
    expect(first.displayName).toBe("First Name");

    const second = await resolveCurrentUser(db, token);
    expect(second.id).toBe(first.id);

    const rows = await db.select().from(appUsers).where(eq(appUsers.externalSubject, TEST_SUBJECT));
    expect(rows).toHaveLength(1);
  });

  it("refreshes profile fields the token carries", async () => {
    const first = await resolveCurrentUser(db, {
      sub: TEST_SUBJECT,
      email: "first@example.com",
      name: "First Name",
    });

    const refreshed = await resolveCurrentUser(db, {
      sub: TEST_SUBJECT,
      email: "second@example.com",
      name: "Second Name",
    });

    expect(refreshed.id).toBe(first.id);
    expect(refreshed.email).toBe("second@example.com");
    expect(refreshed.displayName).toBe("Second Name");
  });
});
