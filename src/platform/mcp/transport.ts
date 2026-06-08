import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthError } from "../auth/auth-errors.js";
import { resolveCurrentUser } from "../auth/current-user.js";
import { parseScopeClaim } from "../auth/scopes.js";
import { extractBearerToken, type VerifiedToken } from "../auth/token-verifier.js";
import type { AppEnv } from "../config/env.js";
import type { Database } from "../db/client.js";
import { createPersonalMcpServer } from "./server.js";
import type { ToolContext } from "./tool-context.js";

type McpConnectTransport = Parameters<ReturnType<typeof createPersonalMcpServer>["connect"]>[0];

export type McpTransportDeps = {
  db: Database;
  verifyToken: (token: string) => Promise<VerifiedToken>;
};

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

/**
 * Verifies the bearer token, resolves the caller to an app user, and builds the per-request
 * ToolContext that the MCP server and its tools run under. Throws AuthError on any auth failure.
 */
export async function authenticateRequest(
  deps: McpTransportDeps,
  request: Pick<FastifyRequest, "headers" | "id">
): Promise<ToolContext> {
  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    throw new AuthError("Missing bearer token", "missing_token");
  }

  const verified = await deps.verifyToken(token);
  const currentUser = await resolveCurrentUser(deps.db, verified);

  return {
    requestId: request.id,
    currentUser,
    grantedScopes: parseScopeClaim(verified.scope),
  };
}

function sendUnauthorized(
  reply: FastifyReply,
  env: Pick<AppEnv, "publicBaseUrl">,
  error: AuthError
) {
  const metadataUrl = `${env.publicBaseUrl}/.well-known/oauth-protected-resource`;
  // RFC 9728: point the client at the protected-resource metadata so it can discover the
  // authorization server. Standard error= params only apply once a token was actually presented.
  const challenge =
    error.code === "missing_token"
      ? `Bearer resource_metadata="${metadataUrl}"`
      : `Bearer error="${error.code}", resource_metadata="${metadataUrl}"`;

  return reply
    .status(401)
    .header("WWW-Authenticate", challenge)
    .send({
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message: error.message,
      },
      id: null,
    });
}

export async function registerMcpTransport(
  app: FastifyInstance,
  env: AppEnv,
  deps: McpTransportDeps
) {
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
    let context: ToolContext;

    try {
      context = await authenticateRequest(deps, request);
    } catch (error) {
      if (error instanceof AuthError) {
        return sendUnauthorized(reply, env, error);
      }

      app.log.error({ err: error }, "Failed to authenticate MCP request");
      return reply.status(500).send({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }

    const mcpServer = createPersonalMcpServer(env, context);
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
