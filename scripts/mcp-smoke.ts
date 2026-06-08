// Smoke-test a locally running MCP server without ChatGPT: connects over Streamable HTTP with a
// bearer token, lists tools, and calls platform.whoami. Uses the MCP SDK client already bundled.
//
//   pnpm supabase:start && pnpm dev          # in one terminal (pure-local .env.local)
//   TOKEN=$(scripts/dev-token.sh) pnpm smoke  # in another
//
// Env: MCP_URL (default http://localhost:3000/mcp), TOKEN (required).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.MCP_URL ?? "http://localhost:3000/mcp";
const token = process.env.TOKEN;

if (!token) {
  console.error("Missing TOKEN. Run: TOKEN=$(scripts/dev-token.sh) pnpm smoke");
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(new URL(url), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: "mcp-smoke", version: "0.0.0" });

await client.connect(transport);

const { tools } = await client.listTools();
console.log(`tools (${tools.length}): ${tools.map((tool) => tool.name).join(", ")}`);

const whoami = await client.callTool({ name: "platform.whoami", arguments: {} });
console.log(
  "platform.whoami:",
  JSON.stringify(whoami.structuredContent ?? whoami.content, null, 2)
);

await client.close();
