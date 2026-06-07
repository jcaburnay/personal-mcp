# Supabase Setup

## Local

1. Install Docker.
2. Run `pnpm install` to install the pinned local Supabase CLI.
3. Run `pnpm supabase:start`.
4. Run `pnpm exec supabase status`.
5. Copy the local API URL, DB URL, and anon key into `.env`.
6. Run `pnpm supabase:reset` to apply migrations and seed data.

This project uses local Supabase runtime ports `55321-55329` plus shadow DB port
`55320` so it can run beside other local Supabase projects such as Kwartrack
without colliding with the default `54321-54329` range.

The CLI stores local telemetry/config outside the repository by default. In this
sandbox, prefix every Supabase CLI command with:

```bash
HOME=/Users/binong/Projects/personal-mcp/.supabase-home
```

Examples:

```bash
HOME=/Users/binong/Projects/personal-mcp/.supabase-home pnpm exec supabase start
HOME=/Users/binong/Projects/personal-mcp/.supabase-home pnpm exec supabase status
HOME=/Users/binong/Projects/personal-mcp/.supabase-home pnpm migrations:check
```

The `.supabase-home/` directory is ignored and must not be committed.

## OAuth In Phase 1

Local Supabase `[auth.oauth_server]` stays disabled in Phase 1. The MCP server
will expose the ChatGPT-facing OAuth metadata and consent routes from Fastify,
while Supabase Auth remains the identity and token authority. Enable Supabase's
local OAuth server only when testing Supabase-managed dynamic client
registration directly.

## Production

1. Create a dedicated Supabase project for this MCP.
2. Enable Supabase Auth OAuth 2.1 server.
3. Configure asymmetric JWT signing keys for OAuth/OIDC token verification.
4. Configure email magic link as the first sign-in method.
5. Configure dynamic client registration only if ChatGPT connector setup requires it.
6. Keep production database credentials in the host provider's secret manager.
7. Do not use production credentials in local tests.

## Required Environment Variables

See `.env.example` for the complete list.
