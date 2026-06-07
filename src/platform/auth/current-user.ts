import { eq } from "drizzle-orm";
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
  const existing = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.externalSubject, token.sub))
    .limit(1);

  if (existing[0]) {
    return {
      id: existing[0].id,
      externalSubject: existing[0].externalSubject,
      email: existing[0].email,
      displayName: existing[0].displayName,
    };
  }

  const inserted = await db
    .insert(appUsers)
    .values({
      externalSubject: token.sub,
      email: token.email ?? null,
      displayName: token.name ?? null,
    })
    .returning();

  const user = inserted[0];

  if (!user) {
    throw new Error("Failed to create app user");
  }

  return {
    id: user.id,
    externalSubject: user.externalSubject,
    email: user.email,
    displayName: user.displayName,
  };
}
