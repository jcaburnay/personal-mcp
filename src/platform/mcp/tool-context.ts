import type { CurrentUser } from "../auth/current-user.js";

export type ToolContext = {
  requestId: string;
  currentUser: CurrentUser | null;
};
