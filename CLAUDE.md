# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A production personal MCP/App platform where **ChatGPT is the primary interface**. One remote MCP
server (modular monolith) owns the data and exposes tools + embedded React widgets through OpenAI's
MCP Apps pattern. Planned mini-apps: notes, finance (replaces "Kwartrack"), habits. Only the
**platform foundation** + two introspection tools (`platform.status`, `platform.whoami`) exist
today; app modules are not built yet. The end-to-end roadmap lives in
`docs/personal-mcp-production-plan.md`.

## Commands

```bash
pnpm supabase:start          # boot local Supabase (Postgres :55322, Auth/API :55321, Mailpit :55324)
pnpm dev                     # tsx watch src/server.ts (loads .env.local; server on :3000)
pnpm build                   # build:web (Vite → dist-web/) then build:server (tsc → dist/)
pnpm start                   # node dist/server.js (prod entry)

pnpm typecheck               # tsc --noEmit (strict)
pnpm lint                    # biome lint .
pnpm format                  # biome format --write .   (format:check for CI)

pnpm test                    # vitest run (all tests) — NOTE: build:web first, see below
pnpm test:watch              # vitest watch
pnpm test:db                 # RUN_DB_TESTS=1 vitest run tests/platform (needs local Supabase up)
pnpm migrations:check        # supabase db reset --local (applies every migration to a clean DB)

# Single test file / single test:
pnpm exec vitest run tests/platform/auth/token-verifier.integration.test.ts
pnpm exec vitest run -t "rejects a token whose audience does not match"
```

**Gotcha:** several route tests (`tests/platform/http/oauth-routes.test.ts`) read built widget
assets from `dist-web/`. Run `pnpm build:web` before `pnpm test` on a clean checkout or those
tests fail with `ENOENT dist-web/consent/index.html`. CI builds before testing for this reason.

Package manager is **pnpm** (Corepack); Node **>=22**; ESM + TypeScript strict
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Lint/format is **Biome**, not
ESLint/Prettier.

## Architecture (the parts that span files)

**Request path** (`src/server.ts` → `src/platform/app.ts`): Fastify shell with Pino logging,
Helmet/CORS/rate-limit, then routes — `POST /mcp`, `/healthz`, `/readyz`,
`/.well-known/oauth-protected-resource`, the React consent UI at `/oauth/consent`, and
`/assets/*`. `buildApp(env, deps?)` constructs the DB pool + token verifier once and accepts an
injectable `deps` override — **every test builds the app with stubbed `db`/`verifyToken` through
this seam**.

**MCP transport** (`src/platform/mcp/transport.ts`): `POST /mcp` uses the SDK's
`StreamableHTTPServerTransport` (stateless). Each request is authenticated, then a fresh
`McpServer` is created and run under a per-request **`ToolContext`** (`{ requestId, currentUser,
grantedScopes }`). Tools are registered through a deterministic (alphabetically sorted)
`tool-registry.ts`; `registerAll(server, context)` threads the context into each tool.

**Auth model — identity vs. authorization are deliberately split** (this is the most important
non-obvious design point):
- **Identity**: every `/mcp` call requires a Supabase JWT. `token-verifier.ts` verifies it with
  `jose` against the project's **asymmetric ES256 JWKS** (`SUPABASE_JWKS_URL`), checking `iss`
  (`SUPABASE_AUTH_ISSUER`) and `aud` (`SUPABASE_JWT_AUDIENCE`, which is `authenticated`).
  `resolveCurrentUser` (`auth/current-user.ts`) upserts the caller into `platform.app_users` via a
  race-safe `onConflictDoUpdate`.
- **Authorization**: Supabase's OAuth 2.1 server only grants standard OIDC scopes and **puts no
  `scope` claim in the JWT**. So per-tool scopes come from the local **`platform.app_user_scopes`**
  table via `findUserScopes` — never from the token. `ToolContext.grantedScopes` is the carrier;
  domain tools must call `assertScopes(...)` (`auth/scopes.ts`) to enforce. `oauth-metadata.ts`
  therefore advertises only `openid/email/profile` in `scopes_supported`.

**Consent/OAuth flow**: ChatGPT discovers `/.well-known/oauth-protected-resource` → Supabase is the
authorization server → Supabase redirects the user to this app's `/oauth/consent` (a React app in
`web/consent/`, built separately by Vite, configured at runtime via an injected
`window.__PERSONAL_MCP_CONFIG__` script from `assets-routes.ts`).

**Persistence** (`src/platform/db/`): Drizzle ORM over `postgres` (postgres-js). Schema in
`db/schema/platform.ts` lives in a `platform` Postgres schema with RLS; tables: `app_users`,
`app_user_scopes`, `audit_events`, `idempotency_keys`. Migrations are committed SQL under
`supabase/migrations/`. The client sets **`prepare: false`** because production uses Supabase's
PgBouncer **transaction pooler** (port 6543), which rejects prepared statements — TLS is driven by
the connection string (`?sslmode=require` in prod).

**Cross-cutting platform services** to reuse when building app modules: `audit/audit-service.ts`
(write an `audit_events` row for every state change), `idempotency/` (dedupe writes by
`client_request_id`), `errors/` (`AppError` → safe MCP error mapping), `mcp/tool-result.ts`
(`textContent`, `structuredToolResult`). Validation is **Zod** everywhere (env, tool schemas).

## Conventions for new app modules

Each mini-app under `src/apps/<name>/` owns its tools, Zod schemas, service, repository, and a React
widget. Follow the rules in `docs/personal-mcp-production-plan.md`:
- Namespaced tool names (`notes.create`, `finance.add_expense`).
- Read tools set `readOnlyHint`; destructive tools are annotated and **soft-delete** by default.
- Write tools take a `client_request_id` and reuse idempotency results; every write emits an audit
  event and calls `assertScopes`.
- Money is **integer minor units**, never floats. Timestamps in UTC; habit dates are date-only.
- Tools return concise `content` for the model plus typed `structuredContent` for widgets, and
  attach `_meta.ui.resourceUri` when they render a widget.

## Environment

`src/platform/config/env.ts` validates all env vars with Zod and **throws on startup if any are
missing** (so a missing var crash-loops the server — set vars before deploying). Local dev uses
`.env.local`; the ngrok+ChatGPT smoke-test setup uses `.env.tunnel` (`pnpm dev:tunnel`). See
`README.md` for the local-testing and tunnel workflows and the `scripts/` helpers.

## Deployment

Render auto-deploys `main` (`render.yaml`, `node dist/server.js`, healthcheck `/healthz`) — note it
does **not** gate on CI. Supabase is the managed Postgres + Auth backend. Secrets are Render env
vars (`sync: false`); never commit them.
