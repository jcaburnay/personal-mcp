# personal-mcp

A production personal **MCP / App platform** where **ChatGPT is the primary interface**. A single
remote MCP server (a modular monolith) owns the data and exposes tools plus embedded React widgets
through OpenAI's MCP Apps pattern — for notes, finance, habits, and future personal mini-apps.

> **Status:** the platform **foundation** is built and running in production (auth, MCP transport,
> persistence, audit/idempotency, health checks). The only tools today are `platform.status` and
> `platform.whoami`; the notes/finance/habits app modules are not built yet. The full roadmap is in
> [`docs/personal-mcp-production-plan.md`](docs/personal-mcp-production-plan.md).

## Architecture at a glance

```
ChatGPT (Developer Mode / connector)
  │  HTTPS, Streamable HTTP, OAuth 2.1
  ▼
Personal MCP server (Fastify)         POST /mcp · /healthz · /readyz · /oauth/consent · /assets/*
  ├─ platform/   auth · MCP transport+registry · db · audit · idempotency · errors · config
  └─ apps/       notes · finance · habits        (each owns tools, schema, service, repo, widget)
  ▼
Supabase  ·  Postgres (Drizzle)  +  Auth (OAuth 2.1, JWT)
```

- **Identity** comes from a Supabase JWT, verified with `jose` against the project's asymmetric
  **ES256 JWKS** (`iss` / `aud=authenticated`).
- **Authorization** (per-tool scopes) comes from the local `platform.app_user_scopes` table — **not**
  the JWT, because Supabase's OAuth server only grants standard OIDC scopes and puts no `scope` claim
  in the token.

See [`CLAUDE.md`](CLAUDE.md) for the architecture deep-dive and conventions.

## Tech stack

TypeScript (strict, ESM) · Node ≥22 · pnpm · Fastify · `@modelcontextprotocol/sdk` (Streamable
HTTP) · Supabase Postgres + Auth · Drizzle ORM (`postgres-js`) · Zod · Pino · React + Vite (consent
UI / widgets) · Vitest · Biome · Docker (via Supabase CLI) · deployed on Render.

## Prerequisites

- Node ≥ 22 and pnpm (`corepack enable`)
- Docker (the Supabase CLI local stack runs on it)

## Quick start

```bash
pnpm install
pnpm supabase:start          # local Postgres :55322, Auth/API :55321, Mailpit :55324, Studio :55323
cp .env.example .env.local   # then fill from `pnpm exec supabase status` (see Environment below)
pnpm dev                     # http://localhost:3000  (loads .env.local)
```

## Testing the MCP server locally (no ChatGPT)

OAuth is just how ChatGPT *obtains* a token. For local testing you mint a local Supabase token and
hand it to any MCP client. With the server running on a **pure-local** `.env.local`:

```bash
# one-shot smoke test: lists tools + calls platform.whoami
TOKEN=$(pnpm dev:token) pnpm smoke
```

Or drive it interactively with the **MCP Inspector**:

```bash
npx -y @modelcontextprotocol/inspector
# UI → Transport: Streamable HTTP · URL: http://localhost:3000/mcp
# Authentication → paste the token from `pnpm dev:token` as the Bearer token
```

`pnpm dev:token` signs up/logs in `dev@local.test` against the local Auth API (email confirmations
are disabled locally) and prints a JWT. Magic-link emails (for the consent UI) land in **Mailpit**
at http://127.0.0.1:55324.

## Testing the real ChatGPT OAuth flow (ngrok tunnel)

ChatGPT can't reach a `127.0.0.1` auth server, so this mode runs **real OAuth against prod
Supabase** while the MCP server + DB stay local. Config lives in `.env.tunnel`.

```bash
pnpm supabase:start
pnpm dev:tunnel              # loads .env.tunnel
ngrok http 3000             # copy the https URL
```

Then:
1. Set `PUBLIC_BASE_URL` in `.env.tunnel` to the ngrok URL and restart `pnpm dev:tunnel`.
2. In ChatGPT, create a connector → `https://<ngrok>/mcp` (OAuth, your Supabase OAuth client id,
   token endpoint auth `none`, scopes `openid/email/profile`).
3. In Supabase → Auth → OAuth Apps, add the connector's callback URL to the app's redirect URIs.

Note: the login/consent page is served from **prod** (prod Supabase controls the consent host), so
local consent-UI changes won't appear in this flow — it's for testing tools end-to-end. ngrok free
URLs change per session, so you re-set `PUBLIC_BASE_URL` and re-add the callback each time.

## Environment

`src/platform/config/env.ts` validates everything with Zod and **throws on startup if any var is
missing**. Local values come from `pnpm exec supabase status`.

| Var | Local | Notes |
| --- | --- | --- |
| `PORT` | `3000` | |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | the MCP server's own URL (ngrok URL in tunnel mode) |
| `DATABASE_URL` | `postgresql://postgres:postgres@127.0.0.1:55322/postgres` | prod uses the PgBouncer pooler `:6543` + `?sslmode=require` |
| `SUPABASE_URL` / `SUPABASE_AUTH_ISSUER` / `SUPABASE_JWKS_URL` | local `:55321` | point at **prod** in tunnel mode |
| `SUPABASE_JWT_AUDIENCE` | `authenticated` | |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` from `supabase status` | consent UI's Supabase client key |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | add `https://chatgpt.com` in tunnel/prod |

Two ready-made files: **`.env.local`** (pure local) and **`.env.tunnel`** (ngrok + ChatGPT). Both
are git-ignored.

## Commands

```bash
pnpm dev              # run server (.env.local)        pnpm dev:tunnel  # run server (.env.tunnel)
pnpm dev:token        # mint a local Supabase token    pnpm smoke       # tools/list + whoami smoke
pnpm build            # build web + server             pnpm start       # run dist/server.js
pnpm typecheck        # tsc --noEmit                    pnpm lint        # biome lint
pnpm test             # vitest (build:web first!)       pnpm test:db     # DB-tier tests (Supabase up)
pnpm migrations:check # apply all migrations to a clean DB
pnpm exec vitest run <file>             # single file
pnpm exec vitest run -t "<test name>"   # single test
```

**Note:** some route tests read built widget assets from `dist-web/`, so run `pnpm build:web` before
`pnpm test` on a clean checkout (CI builds before testing).

## Project layout

```
src/server.ts            process entry
src/platform/            cross-cutting: config, db (+ schema), mcp (transport, registry, tools),
                         auth (token-verifier, current-user, scopes, oauth-metadata), audit,
                         idempotency, errors, http (security, health, assets)
src/apps/                mini-apps (not built yet) — one folder per app
web/consent/             React OAuth consent UI (built by Vite into dist-web/)
supabase/                config.toml, migrations/, seed.sql
tests/platform/          Vitest suites (some gated behind RUN_DB_TESTS)
scripts/                 dev-token.sh, mcp-smoke.ts
docs/                    production plan + architecture notes
```

## Deployment

Render auto-deploys `main` ([`render.yaml`](render.yaml), start `node dist/server.js`, healthcheck
`/healthz`) — it does **not** gate on CI, so let the GitHub Actions checks pass before merging.
Supabase provides managed Postgres + Auth. All secrets are Render env vars (`sync: false`); never
commit them.
