import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it } from "vitest";
import { HABITS_WIDGET_MIME, HABITS_WIDGET_URI } from "../../../src/apps/habits/habits.widget.js";
import { createPersonalMcpServer } from "../../../src/platform/mcp/server.js";
import type { ToolContext } from "../../../src/platform/mcp/tool-context.js";

const env = { mcpServerName: "personal-mcp", mcpServerVersion: "0.1.0" };

const context: ToolContext = {
  requestId: "test-request",
  currentUser: {
    id: "user-1",
    externalSubject: "sub-1",
    email: "user@example.com",
    displayName: "User One",
    timezone: null,
  },
  grantedScopes: ["habits.read", "habits.write"],
};

async function connectClient() {
  // The contract test only lists tools/resources — it never executes a tool — so a stub db is safe.
  const server = createPersonalMcpServer(env, context, {} as never);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("habits widget MCP contract", () => {
  let client: Client;

  beforeEach(async () => {
    client = await connectClient();
  });

  it("exposes the habits tool set", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name);
    for (const name of [
      "habits.open_tracker",
      "habits.list",
      "habits.create",
      "habits.check_in",
      "habits.archive",
    ]) {
      expect(names).toContain(name);
    }
  });

  it("links habits.open_tracker to the widget resource via _meta", async () => {
    const { tools } = await client.listTools();
    const openTracker = tools.find((tool) => tool.name === "habits.open_tracker");
    expect(openTracker?._meta?.ui).toMatchObject({ resourceUri: HABITS_WIDGET_URI });
    expect(openTracker?._meta?.["openai/outputTemplate"]).toBe(HABITS_WIDGET_URI);
  });

  it("registers the widget as an MCP Apps resource", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((resource) => resource.uri)).toContain(HABITS_WIDGET_URI);
  });

  it("serves the inlined widget bundle with the MCP Apps UI mime type", async () => {
    const result = await client.readResource({ uri: HABITS_WIDGET_URI });
    const [content] = result.contents;
    expect(content?.mimeType).toBe(HABITS_WIDGET_MIME);
    const html = content && "text" in content ? String(content.text) : "";
    // React mounts into this root; the bundle is inlined as a module script.
    expect(html).toContain('<div id="habits-root">');
    expect(html).toContain('<script type="module">');
    // The callTool target the widget invokes survives as a string literal in the bundle.
    expect(html).toContain("habits.check_in");
  });
});
