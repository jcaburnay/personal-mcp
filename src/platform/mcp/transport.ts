import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../config/env.js";
import { createPersonalMcpServer } from "./server.js";

type McpConnectTransport = Parameters<ReturnType<typeof createPersonalMcpServer>["connect"]>[0];

function methodNotAllowedResponse() {
  return {
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  };
}

export async function registerMcpTransport(app: FastifyInstance, env: AppEnv) {
  app.options("/mcp", async (_request, reply) => {
    return reply.status(204).send();
  });

  app.get("/mcp", async (_request, reply) => {
    return reply.status(405).send(methodNotAllowedResponse());
  });

  app.delete("/mcp", async (_request, reply) => {
    return reply.status(405).send(methodNotAllowedResponse());
  });

  app.post("/mcp", async (request, reply) => {
    const mcpServer = createPersonalMcpServer(env);
    const transport = new StreamableHTTPServerTransport();
    const cleanup = () => {
      void transport.close();
      void mcpServer.close();
    };

    reply.raw.once("close", cleanup);

    try {
      await mcpServer.connect(transport as unknown as McpConnectTransport);
      reply.hijack();
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      app.log.error({ err: error }, "Failed to handle MCP request");
      reply.hijack();

      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "content-type": "application/json" });
      }

      reply.raw.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        })
      );
    }
  });
}
