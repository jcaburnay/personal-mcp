# AGENTS.md

Guidance for AI coding agents working in this repository. Tool-agnostic; Claude Code users also
have [`CLAUDE.md`](CLAUDE.md) (architecture deep-dive) and humans have [`README.md`](README.md).

## Orientation

A remote **MCP/App server** (modular monolith) that ChatGPT connects to. `src/platform/` holds
cross-cutting concerns; `src/apps/<name>/` will hold mini-apps (notes, finance, habits — **not built
yet**). Only `platform.status` and `platform.whoami` tools exist today. The authoritative roadmap and
module/tool conventions are in [`docs/personal-mcp-production-plan.md`](docs/personal-mcp-production-plan.md).

## Build / test / run

```bash
pnpm install
pnpm supabase:start                 # local Postgres + Auth (Docker)
pnpm dev                            # server on :3000 (.env.local)
pnpm typecheck && pnpm lint         # tsc --noEmit ; biome (NOT eslint/prettier)
pnpm build:web && pnpm test         # build web assets BEFORE tests (route tests read dist-web/)
pnpm test:db                        # DB-tier tests, needs local Supabase running
pnpm exec vitest run <file> | -t "<name>"   # single file / test
TOKEN=$(pnpm dev:token) pnpm smoke  # exercise the running server without ChatGPT
```

## Non-negotiable conventions

- **Identity vs. authorization are split.** Identity = the verified Supabase JWT
  (`iss`/`aud=authenticated`/ES256 JWKS). Authorization = scopes from the local
  `platform.app_user_scopes` table (`findUserScopes`), surfaced as `ToolContext.grantedScopes`.
  **Never read per-tool scopes from the JWT** — Supabase issues no `scope` claim. Enforce with
  `assertScopes(...)` inside tool handlers.
- **Validation is Zod** for env and all tool input/output schemas.
- **Writes**: take a `client_request_id`, dedupe via the idempotency service, and emit an
  `audit_events` row. **Deletes are soft deletes** unless explicitly stated; destructive tools get
  destructive annotations; read tools set `readOnlyHint`.
- **Money is integer minor units**, never floats. Timestamps UTC; habit dates are date-only.
- **Tool names are namespaced** (`finance.add_expense`) and the registry is deterministic
  (alphabetical). Tools return concise `content` + typed `structuredContent`; attach
  `_meta.ui.resourceUri` for widget-backed tools.
- **DB**: Drizzle over `postgres-js` with `prepare: false` (prod uses the PgBouncer transaction
  pooler). New tables go in the `platform` schema (or an app schema) with committed SQL migrations
  under `supabase/migrations/`.
- **Env vars are required and validated at startup** — adding one means updating `env.ts`,
  `.env.example`, `render.yaml`, the CI workflow, and the test fixtures together.

## Gotchas

- `pnpm test` fails on a clean checkout unless `dist-web/` exists — run `pnpm build:web` first.
- Render auto-deploys `main` without a CI gate; make sure GitHub Actions is green before merging.
- Secrets live only in Render env vars and git-ignored `.env*` files — never commit them.

## Workflow

Conventional Commits (`type(scope): subject`), imperative, ≤72 chars, no `Co-Authored-By` trailers.
Branch off `main`; open a PR; keep the gate (`typecheck`, `lint`, `test`, `build`) green.
