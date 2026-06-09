import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import type { CurrentUser } from "../../../src/platform/auth/current-user.js";
import type { ToolContext } from "../../../src/platform/mcp/tool-context.js";
import {
  getWhoami,
  registerPlatformWhoamiTool,
} from "../../../src/platform/mcp/tools/platform-whoami.js";

type RegisteredWhoamiTool = {
  name: string;
  config: {
    title?: string;
    annotations?: { readOnlyHint?: boolean };
  };
  callback: () => Promise<unknown> | unknown;
};

const currentUser: CurrentUser = {
  id: "user-1",
  externalSubject: "sub-1",
  email: "user@example.com",
  displayName: "User One",
  timezone: null,
};

function captureRegistration(context: ToolContext) {
  const registeredTools: RegisteredWhoamiTool[] = [];
  const server = {
    registerTool: (
      name: string,
      config: RegisteredWhoamiTool["config"],
      callback: RegisteredWhoamiTool["callback"]
    ) => {
      registeredTools.push({ name, config, callback });
    },
  };

  registerPlatformWhoamiTool(server as unknown as McpServer, context);
  return registeredTools[0];
}

describe("getWhoami", () => {
  it("maps the current user to identity fields", () => {
    expect(getWhoami(currentUser)).toEqual({
      userId: "user-1",
      externalSubject: "sub-1",
      email: "user@example.com",
      displayName: "User One",
    });
  });
});

describe("registerPlatformWhoamiTool", () => {
  it("registers a read-only tool returning the resolved user", async () => {
    const tool = captureRegistration({
      requestId: "req-1",
      currentUser,
      grantedScopes: [],
    });

    expect(tool?.name).toBe("platform.whoami");
    expect(tool?.config.annotations?.readOnlyHint).toBe(true);
    await expect(tool?.callback()).resolves.toEqual({
      content: [{ type: "text", text: "You are user@example.com." }],
      structuredContent: {
        userId: "user-1",
        externalSubject: "sub-1",
        email: "user@example.com",
        displayName: "User One",
      },
    });
  });

  it("throws when no user is present in context", async () => {
    const tool = captureRegistration({
      requestId: "req-1",
      currentUser: null,
      grantedScopes: [],
    });

    await expect(tool?.callback()).rejects.toThrow("No authenticated user in context");
  });
});
