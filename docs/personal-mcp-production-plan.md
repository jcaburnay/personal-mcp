# Personal MCP Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready personal MCP/App platform where ChatGPT is the main interface for notes, finance tracking, habits, and future personal mini-apps.

**Architecture:** Use one remote MCP/App server as the source-of-truth backend, organized as a modular monolith. Each mini-app owns its tools, UI widgets, domain logic, and persistence, while shared platform services handle auth, storage, audit logging, migrations, and deployment.

**Tech Stack:** TypeScript, Node.js, official MCP TypeScript SDK, React/Vite widgets with CSS Modules, Supabase Postgres, Supabase Auth, Drizzle ORM, Zod, Docker for local development, and a public HTTPS hosted MCP server compatible with ChatGPT Developer Mode.

---

## Product Direction

This project is not a connector around separate personal apps. It is the replacement platform. The MCP server owns the data and exposes clean embedded widgets inside ChatGPT through OpenAI's MCP Apps/UI pattern.

Kwartrack should be treated as a migration source. Existing expenses can be imported into the new finance module, then Kwartrack can be retired once finance workflows are stable.

The first production version should avoid demo apps and throwaway prototypes. Automated tests are still required; "no test apps" means no sample toy surfaces such as a todo demo, not no test suite.

## Detailed Tech Stack

### Language, Runtime, And Package Management

Use TypeScript across the backend, tool schemas, and widget code.

Recommended choices:

- Language: TypeScript with `strict` mode enabled.
- Runtime: Node.js LTS.
- Package manager: `pnpm`.
- Module format: ESM.
- Shared validation: Zod schemas exported from each app module.

Rationale:

- MCP tool inputs and outputs are schema-heavy, so TypeScript plus Zod keeps runtime validation and static types aligned.
- A single language across server and widgets reduces duplication.
- `pnpm` keeps workspace installs fast and deterministic.

### MCP And ChatGPT App Layer

Use the official MCP TypeScript SDK for the MCP server and tool registration.

Recommended choices:

- MCP SDK: `@modelcontextprotocol/sdk`.
- Primary transport: Streamable HTTP.
- Compatibility transport: SSE only if ChatGPT setup or local inspection requires it.
- MCP endpoint: `/mcp`.
- Widget resources: served as `text/html;profile=mcp-app`.
- Widget bridge: MCP Apps bridge over JSON-RPC `postMessage`.
- Local inspection: MCP Inspector as a development tool, not as an app dependency.

Rationale:

- ChatGPT Developer Mode expects a remote MCP server over HTTP-based transports.
- Streamable HTTP should be the default production target.
- Widget resources should follow MCP Apps conventions so the UI is not tied to a private browser-only shell.

### HTTP Server Layer

Use Fastify as the HTTP application shell.

Recommended choices:

- HTTP framework: Fastify.
- Logging integration: Pino through Fastify's logger.
- Request limits: Fastify body limits and route-level limits.
- Security headers: `@fastify/helmet`.
- Rate limiting: `@fastify/rate-limit`.
- CORS: locked down per deployment origin; avoid broad wildcard production CORS.

Rationale:

- Fastify gives a small production-grade HTTP shell for health checks, asset serving, OAuth metadata, and MCP routing.
- MCP transport code should stay isolated under `platform/mcp/transport.ts` so the framework can be swapped if the SDK requires a different adapter later.

### Widget UI Stack

Use React widgets bundled by Vite. Keep widgets focused, responsive, and clean inside ChatGPT's iframe container.

Recommended choices:

- UI framework: React.
- Build tool: Vite.
- Language: TypeScript.
- Styling: CSS Modules plus shared design tokens.
- Icons: `lucide-react`.
- Data and mutations: small MCP bridge hooks first; add TanStack Query only if widget state becomes complex.
- Forms: native forms plus Zod validation; add React Hook Form only for complex forms.
- Charts: Recharts for finance summaries when needed.

Rationale:

- React plus Vite is straightforward for multiple isolated widgets.
- CSS Modules keep widget CSS explicit and CSP-friendly.
- Avoid a heavy app shell; each widget should be a compact task surface launched from tool results.

### Database And Persistence

Use Supabase Postgres as the production source-of-truth database.

Recommended choices:

- Production database: Supabase Postgres.
- Local database: Supabase CLI local stack.
- Test database: Supabase CLI local stack for integration testing, with Testcontainers as an optional isolated test runner later.
- ORM/query builder: Drizzle ORM.
- Database driver: `postgres` or `pg`, selected based on Drizzle adapter fit.
- Migrations: SQL migrations committed under `supabase/migrations`, generated or maintained from Drizzle schema.
- Local reset/seed: Supabase CLI `db reset` with committed seed data.
- IDs: UUID or ULID generated by the application.
- Money: integer minor units, never floating point.
- Dates: store timestamps in UTC; store habit entry dates as date-only values.
- Search: PostgreSQL full-text search first; add `pg_trgm` later if fuzzy search is needed.

Rationale:

- Supabase gives managed PostgreSQL, built-in auth, dashboard inspection, managed backups depending on plan, and optional object storage under one operational surface.
- PostgreSQL is reliable for personal production data and supports transactions, full-text search, JSON fields, and future reporting.
- Drizzle keeps schema definitions close to TypeScript without hiding SQL too aggressively.
- Finance data needs exact integer storage for amounts.
- Supabase local development runs the same core services locally, including Postgres and Auth, while still preserving standard PostgreSQL access for the application.

### Storage And Attachments

Do not make attachments part of the first production slice unless they are explicitly approved during review.

Recommended choices when attachments are added:

- Local development: filesystem-backed storage under a configured data directory.
- Production: Supabase Storage by default; S3-compatible object storage remains an exit option.
- Metadata: `attachments` table in PostgreSQL.
- Upload validation: MIME allowlist, size limit, and checksum.
- Access: signed URLs or proxied downloads after auth checks.

Rationale:

- Notes and finance should ship first without the operational risk of files.
- When files are added, Supabase Storage keeps the database from becoming a binary blob store while staying inside the same backend platform.

### Authentication And Authorization

Use Supabase Auth as the default identity provider, and verify tokens in the MCP server on every tool call.

Recommended choices:

- Default provider: Supabase Auth.
- Supported login methods: email magic link first; add Google OAuth only if useful.
- Token verification: `jose`.
- Local user mapping: Supabase user `sub` to `users.external_subject`.
- Tool authorization: per-tool scopes checked in every handler.
- Scope source: local database role/scope tables, because Supabase Auth handles identity but MCP tool scopes are application-level permissions.

Rationale:

- The platform stores private notes and financial data, so production should not rely on no-auth tools.
- Supabase Auth keeps login, token signing, rotation, and user management out of the custom codebase.
- Per-tool scopes make it easier to reason about future mini-app permissions.
- Auth0, Clerk, and Authentik remain viable exit options because the MCP server only depends on verified JWT claims and local user mapping.

### Validation, Errors, And Observability

Use explicit validation and safe error mapping around every tool.

Recommended choices:

- Schema validation: Zod.
- Logging: Pino structured JSON logs.
- Error model: custom `AppError` with safe public messages.
- Audit logging: PostgreSQL `audit_events` table for all writes.
- Metrics: start with health/readiness and structured logs; add OpenTelemetry only when there is a concrete deployment target.
- Error reporting: Sentry or a self-hosted equivalent after the first production deployment.

Rationale:

- MCP tool failures should not leak stack traces, tokens, SQL, or internal paths.
- Audit logs matter because ChatGPT can initiate state changes through natural language.
- Keep observability useful but not overbuilt before deployment details are known.

### Testing Stack

Use a real automated test suite. Avoid demo apps, but do not skip production tests.

Recommended choices:

- Unit tests: Vitest.
- Database integration tests: Vitest against Supabase CLI local stack; add Testcontainers later only if isolated per-test database instances are needed.
- Widget tests: React Testing Library.
- Browser verification: Playwright for widget rendering and key flows.
- MCP integration tests: official MCP SDK client against the local server.
- Import fixtures: redacted Kwartrack exports under `tests/fixtures/kwartrack/`.

Rationale:

- The platform will own private and financial data, so regressions need to be caught before manual ChatGPT testing.
- A real Supabase local Postgres database catches migration, auth configuration, and query issues that mocks miss.
- Widget tests should prove clean empty, loading, loaded, error, and mutation states.

### Build, CI, And Quality Gates

Use simple, strict quality gates from the first implementation phase.

Recommended choices:

- Build: `tsup` or Vite library build for server-side packages, Vite for widgets.
- Linting: ESLint.
- Formatting: Prettier.
- Type checking: `tsc --noEmit`.
- CI: GitHub Actions or the chosen Git host's equivalent.
- Dependency checks: lockfile committed; review dependency updates manually.

Required commands:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm test:e2e
pnpm build
pnpm migrations:check
```

### Deployment And Operations

Use Supabase for production backend management and Supabase CLI for local backend parity.

Recommended choices:

- Containerization: Docker.
- Local backend runtime: Supabase CLI local stack.
- Local MCP runtime: Node.js dev server, optionally wrapped in Docker Compose later.
- Production database: Supabase Postgres.
- Production auth: Supabase Auth.
- Future production file storage: Supabase Storage.
- Production MCP hosting: public HTTPS service on Render, Fly.io, Railway, Koyeb, a VPS, or an equivalent Node-capable host.
- TLS for public hosting: Caddy, Traefik, or platform-managed HTTPS.
- Private exposure: OpenAI Secure MCP Tunnel is a future option only if an always-on private server is added later.
- Backups: Supabase managed backups plus scheduled `pg_dump` export to encrypted off-host storage.
- Restore: scripted restore into a disposable database before first real import.
- Secrets: environment variables in deployment, `.env` only for local development, no secrets in Git.

Rationale:

- Supabase reduces backend operations while preserving standard PostgreSQL access for Drizzle, migrations, SQL inspection, and backups.
- Supabase CLI local development keeps development and tests independent from production data while matching the production backend shape more closely than plain Postgres.
- Public HTTPS hosting is the primary production target because there is no current private always-on server to run the MCP server and `tunnel-client`.
- Backups and restore verification are non-negotiable because the platform replaces existing apps.
- Secure MCP Tunnel remains a later migration path if the MCP server moves to a private machine or private network.

### Supabase Local Development

Use the Supabase CLI for local backend development.

Recommended workflow:

```text
supabase init
supabase start
supabase status
supabase db reset
```

Local responsibilities:

- `supabase/config.toml` defines local Supabase services and Auth settings.
- `supabase/migrations/` stores committed SQL migrations.
- `supabase/seed.sql` stores safe seed data for development and integration tests.
- The MCP server reads local Supabase database and auth settings from environment variables.
- Local tests must never point at the production Supabase project.

Production responsibilities:

- Link to the production Supabase project only from explicit deployment or migration commands.
- Apply migrations intentionally through CI or an operator command.
- Run independent `pg_dump` backups even when Supabase-managed backups are enabled.

Rationale:

- Supabase local development better matches production than plain Docker Postgres because Auth and service configuration are part of the local stack.
- The local stack still uses Docker underneath, so Docker remains a prerequisite without becoming the primary database workflow.

## Core Architecture

```text
ChatGPT Developer Mode
  |
  | HTTPS / Streamable HTTP or SSE
  v
Personal MCP/App Server
  |
  |-- platform/
  |     |-- auth and scopes
  |     |-- MCP transport and tool registry
  |     |-- UI resource registry
  |     |-- database and migrations
  |     |-- audit log
  |     |-- backups
  |     |-- config and secrets
  |
  |-- apps/
        |-- notes/
        |-- finance/
        |-- habits/
        |-- shared search and tags
  |
  v
PostgreSQL
```

The server exposes:

- `/mcp` for ChatGPT MCP traffic.
- `/healthz` for liveness checks.
- `/readyz` for database and dependency readiness checks.
- `/assets/*` for built widget HTML, JS, CSS, and icons.
- `/.well-known/oauth-protected-resource` for OAuth resource metadata when OAuth is enabled.

## Reference Constraints

The plan follows these OpenAI/MCP constraints:

- ChatGPT Developer Mode supports remote MCP servers over SSE and streaming HTTP.
- Embedded UI runs as iframe-backed widgets that receive tool results through the MCP Apps bridge.
- Widgets should render from `structuredContent` and may call tools again through `tools/call`.
- Tools that render UI should link a UI template through `_meta.ui.resourceUri`.
- Tool lists should be deterministic and namespaced to reduce ambiguity.
- Write tools should be idempotent because tool calls can be retried.
- Read tools should use `readOnlyHint`; destructive tools should use destructive annotations and require confirmation.

References:

- https://developers.openai.com/api/docs/guides/developer-mode
- https://developers.openai.com/apps-sdk/build/mcp-server#architecture-flow
- https://developers.openai.com/apps-sdk/build/chatgpt-ui
- https://developers.openai.com/apps-sdk/reference#mcp-apps-ui-bridge
- https://developers.openai.com/apps-sdk/plan/tools#model-side-guardrails
- https://modelcontextprotocol.io/specification/draft/architecture
- https://modelcontextprotocol.io/specification/draft/server/tools

## Recommended Repo Structure

```text
docs/
  personal-mcp-production-plan.md
  architecture/
    decisions.md
    data-model.md
    security.md
    operations.md

supabase/
  config.toml
  seed.sql
  migrations/

src/
  server.ts

  platform/
    config/
      env.ts
      logger.ts
    db/
      client.ts
      migrate.ts
      schema/
        auth.ts
        audit.ts
        notes.ts
        finance.ts
        habits.ts
        shared.ts
    mcp/
      server.ts
      transport.ts
      register-apps.ts
      tool-result.ts
      annotations.ts
    auth/
      oauth-metadata.ts
      token-verifier.ts
      scopes.ts
      current-user.ts
    audit/
      audit-service.ts
    backup/
      backup-service.ts
    errors/
      app-error.ts
      mcp-error-mapper.ts

  apps/
    notes/
      index.ts
      notes.tools.ts
      notes.schema.ts
      notes.service.ts
      notes.repository.ts
      notes.widget.ts
      ui/
        NotesWidget.tsx
        notes-widget.html
    finance/
      index.ts
      finance.tools.ts
      finance.schema.ts
      finance.service.ts
      finance.repository.ts
      finance.importer.ts
      finance.widget.ts
      ui/
        FinanceWidget.tsx
        finance-widget.html
    habits/
      index.ts
      habits.tools.ts
      habits.schema.ts
      habits.service.ts
      habits.repository.ts
      habits.widget.ts
      ui/
        HabitsWidget.tsx
        habits-widget.html
    shared/
      tags.service.ts
      search.service.ts
      attachments.service.ts

tests/
  platform/
  apps/
  e2e/

scripts/
  dev-tunnel-check.ts
  import-kwartrack.ts
  backup-db.ts
  restore-db.ts
```

## Bounded Modules

### Platform Module

Owns cross-cutting concerns and must not contain app-specific business rules.

Responsibilities:

- Create and configure the MCP server.
- Register all app tools in deterministic order.
- Serve widget resources.
- Verify OAuth/OIDC tokens.
- Attach `currentUser` and request metadata to every tool call.
- Normalize tool errors into safe MCP responses.
- Write audit events for all state-changing tools.
- Provide database client, migrations, and transaction helpers.
- Provide backup and restore scripts.

### Notes Module

Owns note-taking features and Keep-like embedded UI.

Initial capabilities:

- Create plain text notes.
- Edit note title, body, color, pinned state, archived state, and labels.
- Search notes by text, label, pinned state, archived state, and date.
- Show a clean card grid widget.
- Support quick capture from conversation.
- Keep note deletion recoverable through soft delete.

Initial tool set:

- `notes.open_board`
- `notes.search`
- `notes.create`
- `notes.update`
- `notes.archive`
- `notes.restore`
- `notes.delete`
- `notes.list_labels`
- `notes.upsert_label`

### Finance Module

Owns personal finance and replaces Kwartrack.

Initial capabilities:

- Add expenses.
- Edit expenses.
- Search expenses by date range, category, merchant, account, amount, and text.
- Import Kwartrack exports through a controlled importer.
- Manage categories and accounts.
- Show monthly spending, category breakdowns, recent transactions, and import review in an embedded widget.
- Prevent accidental destructive edits through confirmation-required tools.

Initial tool set:

- `finance.open_dashboard`
- `finance.search_expenses`
- `finance.add_expense`
- `finance.update_expense`
- `finance.delete_expense`
- `finance.list_categories`
- `finance.upsert_category`
- `finance.list_accounts`
- `finance.upsert_account`
- `finance.import_expenses`
- `finance.review_import_batch`
- `finance.commit_import_batch`

### Habits Module

Owns recurring habit definitions and daily completion tracking.

Initial capabilities:

- Create habits with cadence, target count, and optional reminder metadata.
- Mark habit completion for a date.
- Show current streak, completion history, and weekly status.
- Archive habits instead of hard deleting them.

Initial tool set:

- `habits.open_tracker`
- `habits.list`
- `habits.create`
- `habits.update`
- `habits.check_in`
- `habits.archive`
- `habits.stats`

### Shared Search And Tags

Search should begin simple and become richer only after data grows.

Initial behavior:

- Use PostgreSQL full-text search for notes and finance descriptions.
- Store tags/labels in normalized tables.
- Keep module-specific search tools rather than one global search tool at first.
- Add `personal.search` later only when cross-app search has clear workflows.

## Data Model

### Shared Tables

```text
users
  id
  external_subject
  email
  display_name
  created_at
  updated_at

audit_events
  id
  user_id
  app
  tool_name
  action
  entity_type
  entity_id
  request_id
  before_json
  after_json
  created_at

idempotency_keys
  id
  user_id
  tool_name
  client_request_id
  result_json
  created_at
  expires_at

attachments
  id
  user_id
  app
  entity_type
  entity_id
  filename
  mime_type
  storage_key
  size_bytes
  created_at
```

### Notes Tables

```text
notes
  id
  user_id
  title
  body
  color
  is_pinned
  is_archived
  deleted_at
  created_at
  updated_at

note_labels
  id
  user_id
  name
  color
  created_at
  updated_at

note_label_assignments
  note_id
  label_id
```

### Finance Tables

```text
finance_accounts
  id
  user_id
  name
  type
  currency
  is_archived
  created_at
  updated_at

finance_categories
  id
  user_id
  name
  parent_id
  color
  is_archived
  created_at
  updated_at

finance_merchants
  id
  user_id
  name
  normalized_name
  created_at
  updated_at

finance_expenses
  id
  user_id
  account_id
  category_id
  merchant_id
  amount_minor
  currency
  spent_at
  description
  source
  source_ref
  created_at
  updated_at
  deleted_at

finance_import_batches
  id
  user_id
  source
  filename
  status
  row_count
  created_at
  committed_at

finance_import_rows
  id
  batch_id
  row_number
  raw_json
  mapped_json
  validation_status
  validation_errors_json
  created_expense_id
```

### Habits Tables

```text
habits
  id
  user_id
  name
  description
  cadence
  target_count
  color
  is_archived
  created_at
  updated_at

habit_entries
  id
  habit_id
  user_id
  entry_date
  count
  note
  created_at
  updated_at
```

## Tool Design Rules

All tools must follow these rules:

- Use namespaced tool names such as `notes.create`, `finance.add_expense`, and `habits.check_in`.
- Return concise `content` for model narration.
- Return typed `structuredContent` for widgets.
- Declare `outputSchema` for structured responses.
- Attach `_meta.ui.resourceUri` when a tool should render a widget.
- Add `client_request_id` to every write tool input.
- Store and reuse idempotency results for repeated write calls.
- Mark read-only tools with `readOnlyHint`.
- Mark destructive tools with destructive annotations.
- Treat delete operations as soft delete unless hard delete is explicitly added later.
- Use exact currency minor units for finance amounts, never floating point numbers.

Example tool categories:

```text
Read-only:
  notes.search
  finance.search_expenses
  habits.stats

Write:
  notes.create
  finance.add_expense
  habits.check_in

Destructive:
  notes.delete
  finance.delete_expense
```

## Widget Design Rules

Widgets should be clean, compact, and functional inside ChatGPT.

General rules:

- Avoid full standalone app chrome.
- Treat each widget as a focused work surface.
- Keep typography compact and readable.
- Use responsive layouts that fit narrow ChatGPT panels.
- Render directly from `structuredContent`.
- Use `tools/call` for widget actions.
- Show loading, empty, error, and success states.
- Never rely on hidden browser state for source-of-truth data.
- Re-fetch or update from tool results after mutations.

Initial widgets:

- Notes board: grid of cards, pinned section, label filter, search, quick add, archive/delete controls.
- Finance dashboard: month selector, spend summary, category breakdown, recent expenses, add expense form, import review.
- Habit tracker: today list, check-in controls, streaks, weekly strip, archived habits filter.

## Authentication And Authorization

Because this platform stores private notes and financial data, production mode should not use no-auth tools except for `healthz` and public metadata.

Recommended auth approach:

- Use an OAuth/OIDC provider rather than implementing a full auth server from scratch.
- Configure ChatGPT app linking against that provider.
- Expose MCP OAuth protected resource metadata.
- Verify issuer, audience, expiry, and scopes on every MCP request.
- Map provider subject to local `users.external_subject`.
- Use per-tool scopes even for a single-user deployment.

Initial scopes:

```text
notes.read
notes.write
finance.read
finance.write
finance.import
habits.read
habits.write
admin.backup
```

Tool auth policy:

- Notes read tools require `notes.read`.
- Notes write tools require `notes.write`.
- Finance read tools require `finance.read`.
- Finance write tools require `finance.write`.
- Finance import tools require `finance.import`.
- Habit read tools require `habits.read`.
- Habit write tools require `habits.write`.
- Backup and restore scripts require local operator access and `admin.backup` for any HTTP-triggered admin action.

## Deployment Strategy

Recommended first production deployment:

```text
Hosted MCP server
  personal-mcp-server
  public HTTPS endpoint
  /mcp
  /healthz
  /readyz
  /assets/*

Supabase
  Postgres
  Auth
  managed dashboard
  optional Storage later

Local development
  Supabase CLI local stack
  Node.js MCP dev server
```

Network exposure:

1. Primary: Public HTTPS deployment behind Supabase Auth, rate limits, strict request limits, and strict CSP.
2. Future optional: Secure MCP Tunnel if an always-on private server is added later.

For this project, start with Public HTTPS because there is no current private server. The MCP endpoint is public at the network layer but private at the application layer: every private tool must verify Supabase JWTs and tool scopes.

Required production settings:

- HTTPS only.
- Secure cookies only if browser auth flows are hosted.
- No secrets in repo.
- Environment variables validated on startup.
- Supabase backups enabled where available.
- Scheduled `pg_dump` export configured for independent restore coverage.
- Restore script tested before real usage.
- Structured JSON logs.
- Audit logging for all write tools.
- Request size limits.
- Tool call timeout limits.
- Widget CSP that allows only required assets and API origins.

## Kwartrack Migration Plan

Kwartrack is replaced by the finance module. The import path should be safe and reviewable.

Importer behavior:

- Accept CSV and JSON exports.
- Store raw rows in `finance_import_rows`.
- Map each row into normalized expense fields.
- Validate required fields before commit.
- Detect duplicates using source, source reference, spent date, amount, merchant, and description.
- Show an import review widget before committing.
- Commit only validated rows.
- Keep failed rows with validation messages.

Required normalized import fields:

```text
spent_at
amount
currency
category
description
account
merchant
source_ref
```

If a Kwartrack export does not provide one of these fields, the importer should either derive it deterministically or mark the row invalid for review.

## Implementation Roadmap

### Phase 1: Platform Foundation

- [ ] Create TypeScript project with strict compiler settings.
- [ ] Add MCP server entrypoint with Streamable HTTP support and SSE compatibility if needed.
- [ ] Add environment validation.
- [ ] Add structured logger.
- [ ] Add PostgreSQL connection and migrations.
- [ ] Add Supabase production database configuration.
- [ ] Add Supabase CLI local development configuration.
- [ ] Add Supabase Auth JWT verification configuration.
- [ ] Add OAuth token verifier.
- [ ] Add current-user resolver.
- [ ] Add tool registry with deterministic ordering.
- [ ] Add common tool result helpers.
- [ ] Add audit event writer.
- [ ] Add idempotency key service.
- [ ] Add health and readiness endpoints.
- [ ] Add Supabase local setup using `supabase init`, `supabase start`, and `supabase db reset`.
- [ ] Add optional Docker Compose wrapper for the MCP server only if local Node.js execution becomes inconvenient.
- [ ] Add Supabase setup documentation for production environment variables.
- [ ] Add CI checks for typecheck, lint, unit tests, and migration validation.

Exit criteria:

- Server starts locally.
- `/healthz` returns healthy.
- `/readyz` checks Postgres.
- `/mcp` lists at least platform metadata tools.
- Auth failures produce safe MCP errors.
- Write tool helper can dedupe by `client_request_id`.

### Phase 2: Notes As First Full App

- [ ] Add notes database schema and migration.
- [ ] Add notes repository.
- [ ] Add notes domain service.
- [ ] Add `notes.open_board`.
- [ ] Add `notes.search`.
- [ ] Add `notes.create`.
- [ ] Add `notes.update`.
- [ ] Add `notes.archive`.
- [ ] Add `notes.restore`.
- [ ] Add `notes.delete` as soft delete.
- [ ] Add labels and label assignment.
- [ ] Add Notes widget resource.
- [ ] Add widget action calls through MCP Apps bridge.
- [ ] Add unit tests for note service behavior.
- [ ] Add tool tests for schemas, auth, idempotency, and audit logging.
- [ ] Add widget render tests for empty, loaded, loading, and error states.

Exit criteria:

- ChatGPT can open a notes board widget.
- User can create, edit, pin, archive, restore, and soft-delete notes.
- User can search notes from conversation and widget.
- All note writes produce audit events.
- Repeated note create calls with the same `client_request_id` do not create duplicates.

### Phase 3: Finance Replacement Core

- [ ] Add finance database schema and migration.
- [ ] Add finance repositories for accounts, categories, merchants, expenses, and import batches.
- [ ] Add finance domain service using minor currency units.
- [ ] Add account and category management tools.
- [ ] Add `finance.add_expense`.
- [ ] Add `finance.update_expense`.
- [ ] Add `finance.delete_expense` as soft delete.
- [ ] Add `finance.search_expenses`.
- [ ] Add monthly summary and category breakdown service.
- [ ] Add Finance dashboard widget resource.
- [ ] Add finance widget action calls through MCP Apps bridge.
- [ ] Add unit tests for currency handling, date filtering, category assignment, and duplicate detection.
- [ ] Add tool tests for auth scopes, idempotency, audit logs, and destructive annotations.

Exit criteria:

- ChatGPT can add and search expenses.
- Finance widget shows monthly spend, category totals, and recent expenses.
- Expense writes are idempotent and audited.
- Amounts are stored exactly as integer minor units.
- Kwartrack is no longer needed for new expense capture.

### Phase 4: Kwartrack Import

- [ ] Add CSV import parser.
- [ ] Add JSON import parser.
- [ ] Add import mapping service.
- [ ] Add validation service for normalized expense rows.
- [ ] Add duplicate detection service.
- [ ] Add `finance.import_expenses`.
- [ ] Add `finance.review_import_batch`.
- [ ] Add `finance.commit_import_batch`.
- [ ] Add import review UI to Finance widget.
- [ ] Add tests for valid rows, invalid rows, duplicate rows, and partial commits.
- [ ] Run one dry-run import using a redacted Kwartrack export.
- [ ] Run one reviewed production import after backup verification.

Exit criteria:

- Kwartrack data can be imported without direct database editing.
- Invalid rows are visible and explainable.
- Duplicate rows are not committed.
- Import commits are auditable and reversible through soft deletion.

### Phase 5: Habits App

- [ ] Add habits database schema and migration.
- [ ] Add habits repository.
- [ ] Add habits domain service.
- [ ] Add `habits.open_tracker`.
- [ ] Add `habits.list`.
- [ ] Add `habits.create`.
- [ ] Add `habits.update`.
- [ ] Add `habits.check_in`.
- [ ] Add `habits.archive`.
- [ ] Add `habits.stats`.
- [ ] Add Habits widget resource.
- [ ] Add tests for cadence, check-ins, streaks, and archive behavior.

Exit criteria:

- ChatGPT can show and update today's habits.
- Habit stats are accurate for daily cadence.
- Archived habits are hidden by default and recoverable.

### Phase 6: Production Hardening

- [ ] Add backup script.
- [ ] Add restore script.
- [ ] Add backup verification workflow.
- [ ] Add rate limits for MCP and asset routes.
- [ ] Add request body size limits.
- [ ] Add tool timeout enforcement.
- [ ] Add CSP headers for widget assets.
- [ ] Add security headers.
- [ ] Add audit log retention policy.
- [ ] Add deployment runbook.
- [ ] Add operational alerts for failed readiness, failed backups, and repeated auth failures.
- [ ] Add disaster recovery drill using a disposable database.

Exit criteria:

- Backup and restore are verified.
- Server can be redeployed without data loss.
- Widget assets load under CSP.
- Logs are structured and do not include secrets.
- Private data is protected by OAuth and scoped tool access.

## Testing Strategy

Production-readiness requires tests even though no demo apps are needed.

Required test layers:

- Unit tests for domain services.
- Repository tests against a real Postgres test database.
- Tool handler tests for schemas, auth scopes, idempotency, audit logging, and error mapping.
- Widget component tests for UI states.
- MCP integration tests for tool listing and tool calls.
- Migration tests that apply every migration to an empty database.
- Import tests using redacted Kwartrack fixtures.
- Restore tests using a disposable database.

CI command targets:

```text
npm run typecheck
npm run lint
npm run test
npm run test:db
npm run test:e2e
npm run build
npm run migrations:check
```

## Security Checklist

- [ ] All private tools require OAuth.
- [ ] Tool scopes are checked inside every handler.
- [ ] Tokens are verified for issuer, audience, expiry, and scopes.
- [ ] Tool descriptions do not leak secrets or implementation details.
- [ ] Tool outputs do not expose raw tokens, headers, stack traces, or connection strings.
- [ ] Write tools use idempotency keys.
- [ ] Destructive tools are annotated and soft-delete by default.
- [ ] Audit logs capture before and after snapshots for writes.
- [ ] Database backups are encrypted at rest.
- [ ] Widget CSP blocks unapproved network and script origins.
- [ ] Production logs redact secrets and auth headers.

## Open Decisions For Review

1. MCP host provider: Render, Fly.io, Railway, Koyeb, VPS, or equivalent Node-capable HTTPS host.
2. Supabase project setup: new dedicated project, region, backup plan, and allowed auth providers.
3. First production slice: foundation plus Notes first, or foundation plus Notes and Finance in parallel.
4. Kwartrack migration format: CSV export, JSON export, direct database export, or API export.
5. Attachment support timing: launch without attachments, or include Supabase Storage-backed note attachments in the first Notes release.

## Recommended First Slice

Start with Phase 1 and Phase 2 only:

```text
Production platform foundation
  +
Notes as the first complete app
```

Reasoning:

- Notes are lower risk than finance.
- Notes exercise the full MCP/App pattern: tools, widgets, persistence, auth, audit, idempotency, and search.
- The same module template can then be reused for finance and habits.
- Finance can be built on a proven platform instead of carrying platform uncertainty and financial-data risk at the same time.

After Notes is stable inside ChatGPT, build Finance core, then Kwartrack import.
