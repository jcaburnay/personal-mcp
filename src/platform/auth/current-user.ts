import { sql } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { appUsers } from "../db/schema/platform.js";
import type { VerifiedToken } from "./token-verifier.js";

export type CurrentUser = {
  id: string;
  externalSubject: string;
  email: string | null;
  displayName: string | null;
};

export async function resolveCurrentUser(db: Database, token: VerifiedToken): Promise<CurrentUser> {
  // Upsert on first sight: a single statement avoids the select-then-insert race where two
  // concurrent first-time requests for the same subject collide on the external_subject
  // unique constraint. Only overwrite profile fields the token actually carries, so a token
  // missing the email/name claim never wipes a value we already stored.
  const updateSet: Partial<Pick<typeof appUsers.$inferInsert, "email" | "displayName">> & {
    updatedAt: ReturnType<typeof sql>;
  } = { updatedAt: sql`now()` };

  if (token.email) {
    updateSet.email = token.email;
  }
  if (token.name) {
    updateSet.displayName = token.name;
  }

  const rows = await db
    .insert(appUsers)
    .values({
      externalSubject: token.sub,
      email: token.email ?? null,
      displayName: token.name ?? null,
    })
    .onConflictDoUpdate({
      target: appUsers.externalSubject,
      set: updateSet,
    })
    .returning();

  const user = rows[0];

  if (!user) {
    throw new Error("Failed to resolve app user");
  }

  return {
    id: user.id,
    externalSubject: user.externalSubject,
    email: user.email,
    displayName: user.displayName,
  };
}
