# Phase 1 Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production-shaped foundation for the personal MCP platform without implementing Notes, Finance, or Habits yet.

**Architecture:** Create a TypeScript Node.js MCP server exposed over public HTTPS, backed by Supabase local development and Supabase production services. The foundation includes HTTP health routes, Streamable HTTP MCP transport, Supabase Auth token verification, OAuth resource metadata, a minimal OAuth consent surface, database migrations, audit logging, idempotency primitives, and deterministic tool registration.

**Tech Stack:** TypeScript, Node.js LTS, pnpm, Fastify, official MCP TypeScript SDK, Supabase CLI local stack, Supabase Postgres/Auth, Drizzle ORM, Zod, jose, Pino, Vitest, Vite for the OAuth consent web bundle, CSS Modules.

---

## Scope

This plan implements Phase 1 only. It intentionally does not build the Notes, Finance, Habits, or Kwartrack import modules.

Phase 1 must prove:

- The project can run locally.
- Supabase local services can start and reset cleanly.
- The MCP server exposes `/mcp`, `/healthz`, `/readyz`, `/assets/*`, and OAuth metadata routes.
- A platform status MCP tool can be listed and called.
- Private tool calls can reject missing or invalid Supabase tokens safely.
- Audit and idempotency primitives exist for later app modules.
- The codebase has strict type checking, linting, tests, and production-shaped environment validation.

## Source References

Use these references while implementing:

- OpenAI ChatGPT Developer Mode: https://developers.openai.com/api/docs/guides/developer-mode
- OpenAI MCP Apps architecture: https://developers.openai.com/apps-sdk/build/mcp-server#architecture-flow
- OpenAI Apps auth: https://developers.openai.com/apps-sdk/build/auth#triggering-authentication-ui
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Supabase local development: https://supabase.com/docs/guides/local-development
- Supabase MCP authentication: https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- Supabase OAuth flows: https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
- Supabase JWT validation: https://supabase.com/docs/guides/auth/jwts

## File Structure

Create this structure during Phase 1:

```text
.
  .env.example
  .gitignore
  package.json
  pnpm-lock.yaml
  tsconfig.json
  tsconfig.build.json
  eslint.config.js
  prettier.config.cjs
  vitest.config.ts
  drizzle.config.ts

  docs/
    personal-mcp-production-plan.md
    phase-1-platform-foundation-plan.md
    setup-supabase.md
    deployment-public-https.md

  supabase/
    config.toml
    seed.sql
    migrations/
      202606070001_platform_foundation.sql

  src/
    server.ts
    platform/
      app.ts
      config/
        env.ts
        logger.ts
      db/
        client.ts
        schema/
          platform.ts
      http/
        health-routes.ts
        security.ts
        assets-routes.ts
      auth/
        auth-errors.ts
        oauth-metadata.ts
        token-verifier.ts
        current-user.ts
        scopes.ts
      audit/
        audit-service.ts
      idempotency/
        idempotency-service.ts
      mcp/
        server.ts
        transport.ts
        tool-context.ts
        tool-result.ts
        tool-registry.ts
        tools/
          platform-status.ts
      oauth-consent/
        consent.html
        consent.ts
        consent.css

  tests/
    platform/
      config/
        env.test.ts
      auth/
        token-verifier.test.ts
        scopes.test.ts
      audit/
        audit-service.test.ts
      idempotency/
        idempotency-service.test.ts
      http/
        health-routes.test.ts
      mcp/
        tool-registry.test.ts
        platform-status.test.ts
```

## Task 1: Project Tooling

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `eslint.config.js`
- Create: `prettier.config.cjs`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.prettierignore`
- Create: `.npmrc`
- Create: `pnpm-workspace.yaml`
- Create: `.env.example`

- [ ] **Step 1: Create `package.json`**

Create `package.json` with this content:

```json
{
  "name": "personal-mcp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.5.2",
  "engines": {
    "node": ">=22.0.0 <25.0.0",
    "pnpm": ">=11.5.2 <12.0.0"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:db": "vitest run tests/platform --config vitest.config.ts",
    "migrations:check": "supabase db reset --local",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset"
  },
  "dependencies": {
    "@fastify/cors": "11.2.0",
    "@fastify/helmet": "13.0.2",
    "@fastify/rate-limit": "10.3.0",
    "@modelcontextprotocol/sdk": "1.29.0",
    "@supabase/supabase-js": "2.107.0",
    "drizzle-orm": "0.45.2",
    "fastify": "5.8.5",
    "jose": "6.2.3",
    "pino": "10.3.1",
    "postgres": "3.4.9",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@types/node": "22.19.20",
    "@typescript-eslint/eslint-plugin": "8.60.1",
    "@typescript-eslint/parser": "8.60.1",
    "drizzle-kit": "0.31.10",
    "eslint": "10.4.1",
    "eslint-config-prettier": "10.1.8",
    "prettier": "3.8.3",
    "supabase": "2.105.0",
    "tsx": "4.22.4",
    "typescript": "6.0.3",
    "vite": "8.0.16",
    "vitest": "4.1.8"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
pnpm install
```

Expected:

```text
Done
```

Also expected: `pnpm-lock.yaml` is created.

- [ ] **Step 3: Create TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "rootDir": "."
  },
  "include": [
    "src/**/*.ts",
    "tests/**/*.ts",
    "vitest.config.ts",
    "drizzle.config.ts",
    "eslint.config.js"
  ],
  "exclude": ["dist", "node_modules"]
}
```

Create `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests", "dist", "node_modules"]
}
```

- [ ] **Step 4: Create lint and format configuration**

Create `eslint.config.js`:

```js
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "supabase/.branches/**", "supabase/.temp/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  eslintConfigPrettier,
];
```

Create `prettier.config.cjs`:

```js
module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  printWidth: 100,
};
```

- [ ] **Step 5: Create Vitest configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
    restoreMocks: true,
    clearMocks: true,
  },
});
```

- [ ] **Step 6: Create `.gitignore` and `.env.example`**
- [ ] **Step 6: Create ignore, pnpm, and environment files**

Create `.gitignore`:

```gitignore
node_modules/
.pnpm-store/
dist/
.env
.env.*
!.env.example
.DS_Store
coverage/
supabase/.branches/
supabase/.temp/
```

Create `.prettierignore`:

```gitignore
node_modules/
.pnpm-store/
dist/
coverage/
pnpm-lock.yaml
supabase/.branches/
supabase/.temp/
```

Create `.npmrc`:

```ini
store-dir=.pnpm-store
save-exact=true
```

Create `pnpm-workspace.yaml`:

```yaml
storeDir: .pnpm-store
allowBuilds:
  esbuild: true
```

Create `.env.example`:

```dotenv
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
PUBLIC_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres
SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_AUTH_ISSUER=http://127.0.0.1:55321/auth/v1
SUPABASE_JWKS_URL=http://127.0.0.1:55321/auth/v1/.well-known/jwks.json
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_ANON_KEY=replace-with-local-supabase-anon-key-from-supabase-status
MCP_SERVER_NAME=personal-mcp
MCP_SERVER_VERSION=0.1.0
ALLOWED_ORIGINS=http://localhost:3000
```

- [ ] **Step 7: Verify tooling**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected:

```text
No TypeScript inputs exist yet
No test files found
```

If `tsc` fails because there are no source files, proceed to Task 3 before treating this as a project failure. Once Task 3 creates source files, these commands must pass.

- [ ] **Step 8: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.build.json eslint.config.js prettier.config.cjs vitest.config.ts .gitignore .prettierignore .npmrc .env.example
git commit -m "chore: add TypeScript project tooling"
```

## Task 2: Supabase Local Foundation

**Files:**

- Create: `supabase/config.toml`
- Create: `supabase/seed.sql`
- Create: `supabase/migrations/202606070001_platform_foundation.sql`
- Create: `drizzle.config.ts`
- Create: `docs/setup-supabase.md`

- [ ] **Step 1: Initialize Supabase local project**

Run:

```bash
pnpm exec supabase init
```

Expected:

```text
Finished supabase init.
```

Expected files:

```text
supabase/config.toml
```

- [ ] **Step 2: Start Supabase local stack**

Run:

```bash
pnpm supabase:start
```

Expected:

```text
Started supabase local development setup.
```

Copy the local `API URL`, `DB URL`, and publishable key from `pnpm exec supabase status` into your local `.env`. Do not commit `.env`.

- [ ] **Step 3: Add platform migration**

Create `supabase/migrations/202606070001_platform_foundation.sql`:

```sql
create extension if not exists pgcrypto;

create schema if not exists platform;

revoke all on schema platform from anon, authenticated;
grant usage on schema platform to service_role;

create table if not exists platform.app_users (
  id uuid primary key default gen_random_uuid(),
  external_subject text not null unique,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table platform.app_users enable row level security;

create table if not exists platform.app_user_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references platform.app_users(id) on delete cascade,
  scope text not null,
  created_at timestamptz not null default now(),
  unique (user_id, scope)
);

alter table platform.app_user_scopes enable row level security;

create table if not exists platform.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references platform.app_users(id) on delete set null,
  app text not null,
  tool_name text not null,
  action text not null,
  entity_type text,
  entity_id text,
  request_id text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

alter table platform.audit_events enable row level security;

create table if not exists platform.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references platform.app_users(id) on delete cascade,
  tool_name text not null,
  client_request_id text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (user_id, tool_name, client_request_id)
);

alter table platform.idempotency_keys enable row level security;

revoke all on all tables in schema platform from anon, authenticated;
grant select, insert, update, delete on all tables in schema platform to service_role;

create index if not exists audit_events_user_id_created_at_idx
  on platform.audit_events (user_id, created_at desc);

create index if not exists audit_events_tool_name_created_at_idx
  on platform.audit_events (tool_name, created_at desc);

create index if not exists idempotency_keys_expires_at_idx
  on platform.idempotency_keys (expires_at);
```

- [ ] **Step 4: Add safe seed file**

Create `supabase/seed.sql`:

```sql
-- Safe local seed data belongs here. Phase 1 keeps this empty because users are
-- created from verified Supabase Auth token claims.
```

- [ ] **Step 5: Apply migrations locally**

Run:

```bash
pnpm supabase:reset
```

Expected:

```text
Finished supabase db reset.
```

- [ ] **Step 6: Create Drizzle configuration**

Create `drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/platform/db/schema/platform.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
  },
  strict: true,
  verbose: true,
});
```

- [ ] **Step 7: Document Supabase setup**

Create `docs/setup-supabase.md`:

````markdown
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

In this sandbox, prefix every Supabase CLI command with:

```bash
HOME=/Users/binong/Projects/personal-mcp/.supabase-home
```
````

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

````

- [ ] **Step 8: Verify migration check**

Run:

```bash
pnpm migrations:check
````

Expected:

```text
Finished supabase db reset.
```

- [ ] **Step 9: Commit**

Run:

```bash
git add supabase drizzle.config.ts docs/setup-supabase.md
git commit -m "chore: add Supabase local foundation"
```

## Task 3: Environment And Logger

**Files:**

- Create: `src/platform/config/env.ts`
- Create: `src/platform/config/logger.ts`
- Test: `tests/platform/config/env.test.ts`

- [ ] **Step 1: Write env tests**

Create `tests/platform/config/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "../../../src/platform/config/env.js";

describe("parseEnv", () => {
  it("parses a complete environment", () => {
    const env = parseEnv({
      NODE_ENV: "test",
      PORT: "3000",
      LOG_LEVEL: "info",
      PUBLIC_BASE_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
      SUPABASE_URL: "http://127.0.0.1:55321",
      SUPABASE_AUTH_ISSUER: "http://127.0.0.1:55321/auth/v1",
      SUPABASE_JWKS_URL: "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
      SUPABASE_JWT_AUDIENCE: "authenticated",
      SUPABASE_ANON_KEY: "local-anon-key",
      MCP_SERVER_NAME: "personal-mcp",
      MCP_SERVER_VERSION: "0.1.0",
      ALLOWED_ORIGINS: "http://localhost:3000,https://chatgpt.com",
    });

    expect(env.port).toBe(3000);
    expect(env.allowedOrigins).toEqual(["http://localhost:3000", "https://chatgpt.com"]);
  });

  it("rejects invalid URLs", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "test",
        PORT: "3000",
        LOG_LEVEL: "info",
        PUBLIC_BASE_URL: "not-a-url",
        DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
        SUPABASE_URL: "http://127.0.0.1:55321",
        SUPABASE_AUTH_ISSUER: "http://127.0.0.1:55321/auth/v1",
        SUPABASE_JWKS_URL: "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
        SUPABASE_JWT_AUDIENCE: "authenticated",
        SUPABASE_ANON_KEY: "local-anon-key",
        MCP_SERVER_NAME: "personal-mcp",
        MCP_SERVER_VERSION: "0.1.0",
        ALLOWED_ORIGINS: "http://localhost:3000",
      })
    ).toThrow("Invalid environment");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/platform/config/env.test.ts
```

Expected:

```text
Error: Failed to load url ../../../src/platform/config/env.js
```

- [ ] **Step 3: Implement env parser**

Create `src/platform/config/env.ts`:

```ts
import { z } from "zod";

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  PUBLIC_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_AUTH_ISSUER: z.string().url(),
  SUPABASE_JWKS_URL: z.string().url(),
  SUPABASE_JWT_AUDIENCE: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  MCP_SERVER_NAME: z.string().min(1).default("personal-mcp"),
  MCP_SERVER_VERSION: z.string().min(1).default("0.1.0"),
  ALLOWED_ORIGINS: z.string().min(1),
});

export type AppEnv = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  publicBaseUrl: string;
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAuthIssuer: string;
  supabaseJwksUrl: string;
  supabaseJwtAudience: string;
  supabaseAnonKey: string;
  mcpServerName: string;
  mcpServerVersion: string;
  allowedOrigins: string[];
};

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  const parsed = rawEnvSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    logLevel: parsed.data.LOG_LEVEL,
    publicBaseUrl: parsed.data.PUBLIC_BASE_URL,
    databaseUrl: parsed.data.DATABASE_URL,
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseAuthIssuer: parsed.data.SUPABASE_AUTH_ISSUER,
    supabaseJwksUrl: parsed.data.SUPABASE_JWKS_URL,
    supabaseJwtAudience: parsed.data.SUPABASE_JWT_AUDIENCE,
    supabaseAnonKey: parsed.data.SUPABASE_ANON_KEY,
    mcpServerName: parsed.data.MCP_SERVER_NAME,
    mcpServerVersion: parsed.data.MCP_SERVER_VERSION,
    allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export function getEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return parseEnv(input);
}
```

Create `src/platform/config/logger.ts`:

```ts
import pino from "pino";
import type { LoggerOptions } from "pino";
import type { FastifyBaseLogger } from "fastify";
import type { AppEnv } from "./env.js";

export function createLogger(env: Pick<AppEnv, "logLevel" | "nodeEnv">): FastifyBaseLogger {
  const options: LoggerOptions = {
    level: env.logLevel,
    redact: {
      paths: ["req.headers.authorization", "authorization", "*.password", "*.token", "*.secret"],
      remove: true,
    },
  };

  if (env.nodeEnv === "development") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    };
  }

  return pino(options) as FastifyBaseLogger;
}
```

- [ ] **Step 4: Add pretty logger dev dependency**

Run:

```bash
pnpm add -D pino-pretty
```

Expected:

```text
dependencies:
devDependencies:
```

- [ ] **Step 5: Verify tests pass**

Run:

```bash
pnpm test tests/platform/config/env.test.ts
pnpm typecheck
```

Expected:

```text
2 tests passed
```

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json pnpm-lock.yaml src/platform/config tests/platform/config
git commit -m "feat: add environment validation and logger"
```

## Task 4: Database Client And Platform Schema

**Files:**

- Create: `src/platform/db/client.ts`
- Create: `src/platform/db/schema/platform.ts`
- Test: `tests/platform/db-schema-import.test.ts`

- [ ] **Step 1: Write schema import test**

Create `tests/platform/db-schema-import.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { appUsers, auditEvents, idempotencyKeys } from "../../src/platform/db/schema/platform.js";

describe("platform schema", () => {
  it("exports core tables", () => {
    expect(appUsers).toBeDefined();
    expect(auditEvents).toBeDefined();
    expect(idempotencyKeys).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/platform/db-schema-import.test.ts
```

Expected:

```text
Error: Failed to load url ../../src/platform/db/schema/platform.js
```

- [ ] **Step 3: Implement Drizzle schema**

Create `src/platform/db/schema/platform.ts`:

```ts
import { index, jsonb, pgSchema, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const platformSchema = pgSchema("platform");

export const appUsers = platformSchema.table("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalSubject: text("external_subject").notNull().unique(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appUserScopes = platformSchema.table(
  "app_user_scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.scope)]
);

export const auditEvents = platformSchema.table(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    app: text("app").notNull(),
    toolName: text("tool_name").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    requestId: text("request_id"),
    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_events_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
    index("audit_events_tool_name_created_at_idx").on(table.toolName, table.createdAt.desc()),
  ]
);

export const idempotencyKeys = platformSchema.table(
  "idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    clientRequestId: text("client_request_id").notNull(),
    resultJson: jsonb("result_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique().on(table.userId, table.toolName, table.clientRequestId),
    index("idempotency_keys_expires_at_idx").on(table.expiresAt),
  ]
);
```

Create `src/platform/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { AppEnv } from "../config/env.js";
import * as schema from "./schema/platform.js";

export type Database = ReturnType<typeof createDatabase>;

export function createDatabase(env: Pick<AppEnv, "databaseUrl">) {
  const client = postgres(env.databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}
```

- [ ] **Step 4: Verify schema test passes**

Run:

```bash
pnpm test tests/platform/db-schema-import.test.ts
pnpm typecheck
```

Expected:

```text
1 test passed
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/platform/db tests/platform/db-schema-import.test.ts
git commit -m "feat: add platform database schema"
```

## Task 5: Supabase Auth Verification And User Resolution

**Files:**

- Create: `src/platform/auth/auth-errors.ts`
- Create: `src/platform/auth/token-verifier.ts`
- Create: `src/platform/auth/current-user.ts`
- Create: `src/platform/auth/scopes.ts`
- Test: `tests/platform/auth/token-verifier.test.ts`
- Test: `tests/platform/auth/scopes.test.ts`

- [ ] **Step 1: Write token verifier tests**

Create `tests/platform/auth/token-verifier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractBearerToken } from "../../../src/platform/auth/token-verifier.js";

describe("extractBearerToken", () => {
  it("extracts bearer token from authorization header", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("returns null for missing bearer token", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("Basic abc")).toBeNull();
  });
});
```

Create `tests/platform/auth/scopes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hasRequiredScopes } from "../../../src/platform/auth/scopes.js";

describe("hasRequiredScopes", () => {
  it("returns true when all required scopes exist", () => {
    expect(hasRequiredScopes(["notes.read", "notes.write"], ["notes.read"])).toBe(true);
  });

  it("returns false when a required scope is missing", () => {
    expect(hasRequiredScopes(["notes.read"], ["notes.write"])).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test tests/platform/auth
```

Expected:

```text
Failed to load url
```

- [ ] **Step 3: Implement auth utilities**

Create `src/platform/auth/auth-errors.ts`:

```ts
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "missing_token" | "invalid_token" | "insufficient_scope"
  ) {
    super(message);
    this.name = "AuthError";
  }
}
```

Create `src/platform/auth/token-verifier.ts`:

```ts
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AppEnv } from "../config/env.js";
import { AuthError } from "./auth-errors.js";

export type VerifiedToken = JWTPayload & {
  sub: string;
  email?: string;
  name?: string;
  scope?: string;
};

export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim() || null;
}

export function createTokenVerifier(
  env: Pick<AppEnv, "supabaseJwksUrl" | "supabaseAuthIssuer" | "supabaseJwtAudience">
) {
  const jwks = createRemoteJWKSet(new URL(env.supabaseJwksUrl));

  return async function verifyToken(token: string): Promise<VerifiedToken> {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: env.supabaseAuthIssuer,
        audience: env.supabaseJwtAudience,
      });

      if (!payload.sub) {
        throw new AuthError("Token is missing subject", "invalid_token");
      }

      return payload as VerifiedToken;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      throw new AuthError("Token verification failed", "invalid_token");
    }
  };
}
```

Create `src/platform/auth/scopes.ts`:

```ts
import { AuthError } from "./auth-errors.js";

export const platformScopes = [
  "notes.read",
  "notes.write",
  "finance.read",
  "finance.write",
  "finance.import",
  "habits.read",
  "habits.write",
  "admin.backup",
] as const;

export type PlatformScope = (typeof platformScopes)[number];

export function hasRequiredScopes(
  grantedScopes: readonly string[],
  requiredScopes: readonly string[]
) {
  return requiredScopes.every((scope) => grantedScopes.includes(scope));
}

export function assertScopes(grantedScopes: readonly string[], requiredScopes: readonly string[]) {
  if (!hasRequiredScopes(grantedScopes, requiredScopes)) {
    throw new AuthError("Required scope is missing", "insufficient_scope");
  }
}

export function parseScopeClaim(scopeClaim: string | undefined): string[] {
  return (
    scopeClaim
      ?.split(" ")
      .map((scope) => scope.trim())
      .filter(Boolean) ?? []
  );
}
```

Create `src/platform/auth/current-user.ts`:

```ts
import { eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { appUsers } from "../db/schema/platform.js";
import type { VerifiedToken } from "./token-verifier.js";

export type CurrentUser = {
  id: string;
  externalSubject: string;
  email: string | null;
  displayName: string | null;
};

export async function resolveCurrentUser(db: Database, token: VerifiedToken): Promise<CurrentUser> {
  const existing = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.externalSubject, token.sub))
    .limit(1);

  if (existing[0]) {
    return {
      id: existing[0].id,
      externalSubject: existing[0].externalSubject,
      email: existing[0].email,
      displayName: existing[0].displayName,
    };
  }

  const inserted = await db
    .insert(appUsers)
    .values({
      externalSubject: token.sub,
      email: token.email ?? null,
      displayName: token.name ?? null,
    })
    .returning();

  const user = inserted[0];

  if (!user) {
    throw new Error("Failed to create app user");
  }

  return {
    id: user.id,
    externalSubject: user.externalSubject,
    email: user.email,
    displayName: user.displayName,
  };
}
```

- [ ] **Step 4: Verify auth tests pass**

Run:

```bash
pnpm test tests/platform/auth
pnpm typecheck
```

Expected:

```text
4 tests passed
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/platform/auth tests/platform/auth
git commit -m "feat: add Supabase auth verification primitives"
```

## Task 6: Audit And Idempotency Services

**Files:**

- Create: `src/platform/audit/audit-service.ts`
- Create: `src/platform/idempotency/idempotency-service.ts`
- Test: `tests/platform/audit/audit-service.test.ts`
- Test: `tests/platform/idempotency/idempotency-service.test.ts`

- [ ] **Step 1: Write unit tests**

Create `tests/platform/audit/audit-service.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { createAuditService } from "../../../src/platform/audit/audit-service.js";

describe("createAuditService", () => {
  it("writes audit event through database insert", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "event-1" }]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const db = { insert };

    const service = createAuditService(db as never);
    await service.record({
      userId: "user-1",
      app: "platform",
      toolName: "platform.status",
      action: "read",
      entityType: "platform",
      entityId: "status",
      requestId: "request-1",
      beforeJson: null,
      afterJson: { ok: true },
    });

    expect(insert).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledOnce();
  });
});
```

Create `tests/platform/idempotency/idempotency-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createIdempotencyKey } from "../../../src/platform/idempotency/idempotency-service.js";

describe("createIdempotencyKey", () => {
  it("creates a stable key", () => {
    expect(createIdempotencyKey("user-1", "notes.create", "request-1")).toBe(
      "user-1:notes.create:request-1"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test tests/platform/audit tests/platform/idempotency
```

Expected:

```text
Failed to load url
```

- [ ] **Step 3: Implement services**

Create `src/platform/audit/audit-service.ts`:

```ts
import type { Database } from "../db/client.js";
import { auditEvents } from "../db/schema/platform.js";

export type AuditEventInput = {
  userId: string | null;
  app: string;
  toolName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  requestId: string | null;
  beforeJson: unknown;
  afterJson: unknown;
};

export function createAuditService(db: Pick<Database, "insert">) {
  return {
    async record(input: AuditEventInput) {
      await db.insert(auditEvents).values({
        userId: input.userId,
        app: input.app,
        toolName: input.toolName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        requestId: input.requestId,
        beforeJson: input.beforeJson,
        afterJson: input.afterJson,
      });
    },
  };
}
```

Create `src/platform/idempotency/idempotency-service.ts`:

```ts
import { and, eq } from "drizzle-orm";
import type { Database } from "../db/client.js";
import { idempotencyKeys } from "../db/schema/platform.js";

export function createIdempotencyKey(userId: string, toolName: string, clientRequestId: string) {
  return `${userId}:${toolName}:${clientRequestId}`;
}

export function createIdempotencyService(db: Database) {
  return {
    async findResult(userId: string, toolName: string, clientRequestId: string) {
      const rows = await db
        .select()
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.userId, userId),
            eq(idempotencyKeys.toolName, toolName),
            eq(idempotencyKeys.clientRequestId, clientRequestId)
          )
        )
        .limit(1);

      return rows[0]?.resultJson ?? null;
    },

    async storeResult(input: {
      userId: string;
      toolName: string;
      clientRequestId: string;
      resultJson: unknown;
      expiresAt: Date;
    }) {
      await db.insert(idempotencyKeys).values(input).onConflictDoNothing();
    },
  };
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
pnpm test tests/platform/audit tests/platform/idempotency
pnpm typecheck
```

Expected:

```text
2 tests passed
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/platform/audit src/platform/idempotency tests/platform/audit tests/platform/idempotency
git commit -m "feat: add audit and idempotency services"
```

## Task 7: HTTP Server Foundation

**Files:**

- Create: `src/platform/http/security.ts`
- Create: `src/platform/http/health-routes.ts`
- Create: `src/platform/http/assets-routes.ts`
- Create: `src/platform/app.ts`
- Create: `src/server.ts`
- Test: `tests/platform/http/health-routes.test.ts`

- [ ] **Step 1: Write health route test**

Create `tests/platform/http/health-routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/platform/app.js";

describe("health routes", () => {
  it("returns healthy status", async () => {
    const app = await buildApp({
      nodeEnv: "test",
      port: 3000,
      logLevel: "info",
      publicBaseUrl: "http://localhost:3000",
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
      supabaseUrl: "http://127.0.0.1:55321",
      supabaseAuthIssuer: "http://127.0.0.1:55321/auth/v1",
      supabaseJwksUrl: "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
      supabaseJwtAudience: "authenticated",
      supabaseAnonKey: "local-anon-key",
      mcpServerName: "personal-mcp",
      mcpServerVersion: "0.1.0",
      allowedOrigins: ["http://localhost:3000"],
    });

    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: "personal-mcp" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/platform/http/health-routes.test.ts
```

Expected:

```text
Failed to load url ../../../src/platform/app.js
```

- [ ] **Step 3: Implement HTTP app**

Create `src/platform/http/security.ts`:

```ts
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "../config/env.js";

export async function registerSecurity(app: FastifyInstance, env: AppEnv) {
  await app.register(helmet, {
    global: true,
  });

  await app.register(cors, {
    origin: env.allowedOrigins,
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });
}
```

Create `src/platform/http/health-routes.ts`:

```ts
import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => {
    return { ok: true, service: "personal-mcp" };
  });

  app.get("/readyz", async () => {
    return { ok: true, dependencies: { http: "ready" } };
  });
}
```

Create `src/platform/http/assets-routes.ts`:

```ts
import type { FastifyInstance } from "fastify";

export async function registerAssetsRoutes(app: FastifyInstance) {
  app.get("/assets/health.txt", async (_request, reply) => {
    return reply.type("text/plain").send("ok");
  });
}
```

Create `src/platform/app.ts`:

```ts
import Fastify from "fastify";
import type { AppEnv } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import { registerAssetsRoutes } from "./http/assets-routes.js";
import { registerHealthRoutes } from "./http/health-routes.js";
import { registerSecurity } from "./http/security.js";

export async function buildApp(env: AppEnv) {
  const app = Fastify({
    loggerInstance: createLogger(env),
    bodyLimit: 1024 * 1024,
  });

  await registerSecurity(app, env);
  await registerHealthRoutes(app);
  await registerAssetsRoutes(app);

  return app;
}
```

Create `src/server.ts`:

```ts
import { getEnv } from "./platform/config/env.js";
import { buildApp } from "./platform/app.js";

const env = getEnv();
const app = await buildApp(env);

await app.listen({ host: "0.0.0.0", port: env.port });
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
pnpm test tests/platform/http/health-routes.test.ts
pnpm typecheck
```

Expected:

```text
1 test passed
```

- [ ] **Step 5: Commit**

Run:

```bash
git add src/platform/http src/platform/app.ts src/server.ts tests/platform/http
git commit -m "feat: add HTTP server foundation"
```

## Task 8: OAuth Metadata And Consent Surface

**Files:**

- Create: `src/platform/auth/oauth-metadata.ts`
- Create: `src/platform/oauth-consent/consent.html`
- Create: `src/platform/oauth-consent/consent.ts`
- Create: `src/platform/oauth-consent/consent.css`
- Modify: `src/platform/app.ts`
- Test: `tests/platform/auth/oauth-metadata.test.ts`
- Test: `tests/platform/http/oauth-routes.test.ts`

- [ ] **Step 1: Write OAuth metadata test**

Create `tests/platform/auth/oauth-metadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createProtectedResourceMetadata } from "../../../src/platform/auth/oauth-metadata.js";

describe("createProtectedResourceMetadata", () => {
  it("returns OAuth protected resource metadata", () => {
    const metadata = createProtectedResourceMetadata({
      publicBaseUrl: "https://mcp.example.com",
      supabaseAuthIssuer: "https://project-ref.supabase.co/auth/v1",
    });

    expect(metadata.resource).toBe("https://mcp.example.com");
    expect(metadata.authorization_servers).toEqual(["https://project-ref.supabase.co/auth/v1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/platform/auth/oauth-metadata.test.ts
```

Expected:

```text
Failed to load url ../../../src/platform/auth/oauth-metadata.js
```

- [ ] **Step 3: Implement OAuth metadata helper**

Create `src/platform/auth/oauth-metadata.ts`:

```ts
import type { AppEnv } from "../config/env.js";
import { platformScopes } from "./scopes.js";

export function createProtectedResourceMetadata(
  env: Pick<AppEnv, "publicBaseUrl" | "supabaseAuthIssuer">
) {
  return {
    resource: env.publicBaseUrl,
    resource_name: "Personal MCP",
    authorization_servers: [env.supabaseAuthIssuer],
    bearer_methods_supported: ["header"],
    scopes_supported: platformScopes,
  };
}
```

- [ ] **Step 4: Add OAuth metadata route**

Modify `src/platform/app.ts` so it includes:

```ts
import { createProtectedResourceMetadata } from "./auth/oauth-metadata.js";
```

Inside `buildApp`, after health and asset routes:

```ts
app.get("/.well-known/oauth-protected-resource", async () => {
  return createProtectedResourceMetadata(env);
});
```

- [ ] **Step 5: Add minimal OAuth consent assets**

Create `src/platform/oauth-consent/consent.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authorize Personal MCP</title>
    <link rel="stylesheet" href="/assets/oauth-consent.css" />
  </head>
  <body>
    <main class="shell">
      <h1>Authorize Personal MCP</h1>
      <p id="status">Loading authorization request...</p>
      <form id="email-form" class="panel">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" required />
        <button type="submit">Send magic link</button>
      </form>
      <section id="consent" class="panel" hidden>
        <p id="client"></p>
        <button id="approve" type="button">Approve</button>
        <button id="deny" type="button">Deny</button>
      </section>
    </main>
    <script type="module" src="/assets/oauth-consent.js"></script>
  </body>
</html>
```

Create `src/platform/oauth-consent/consent.css`:

```css
:root {
  color: #1f2933;
  background: #f7f8fa;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

body {
  margin: 0;
}

.shell {
  box-sizing: border-box;
  width: min(100%, 420px);
  margin: 0 auto;
  padding: 32px 16px;
}

h1 {
  margin: 0 0 12px;
  font-size: 24px;
  line-height: 1.2;
}

.panel {
  display: grid;
  gap: 12px;
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #d7dde5;
  border-radius: 8px;
  background: #ffffff;
}

input,
button {
  min-height: 40px;
  border-radius: 6px;
  font: inherit;
}

input {
  border: 1px solid #b8c1cc;
  padding: 0 10px;
}

button {
  border: 0;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
}
```

Create `src/platform/oauth-consent/consent.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = document.body.dataset.supabaseUrl ?? "";
const supabaseAnonKey = document.body.dataset.supabaseAnonKey ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const params = new URLSearchParams(window.location.search);
const authorizationId = params.get("authorization_id");
const statusEl = document.querySelector<HTMLParagraphElement>("#status");
const formEl = document.querySelector<HTMLFormElement>("#email-form");
const consentEl = document.querySelector<HTMLElement>("#consent");
const clientEl = document.querySelector<HTMLParagraphElement>("#client");

function setStatus(message: string) {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

async function main() {
  if (!authorizationId) {
    setStatus("Missing authorization request.");
    return;
  }

  const session = await supabase.auth.getSession();

  if (!session.data.session) {
    setStatus("Sign in to authorize ChatGPT.");
    formEl?.removeAttribute("hidden");
    return;
  }

  formEl?.setAttribute("hidden", "true");

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error) {
    setStatus("Authorization request could not be loaded.");
    return;
  }

  if (clientEl) {
    clientEl.textContent = `${data.client.name} is requesting access to Personal MCP.`;
  }

  consentEl?.removeAttribute("hidden");
  setStatus("Review and approve access.");
}

formEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(formEl);
  const email = String(formData.get("email") ?? "");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href,
    },
  });

  setStatus(error ? "Could not send magic link." : "Check your email for the sign-in link.");
});

document.querySelector("#approve")?.addEventListener("click", async () => {
  if (!authorizationId) return;
  const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId);
  if (error) {
    setStatus("Could not approve authorization.");
    return;
  }
  window.location.href = data.redirect_url;
});

document.querySelector("#deny")?.addEventListener("click", async () => {
  if (!authorizationId) return;
  const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId);
  if (error) {
    setStatus("Could not deny authorization.");
    return;
  }
  window.location.href = data.redirect_url;
});

void main();
```

During implementation, verify the exact `supabase.auth.oauth.*` method names against the installed `@supabase/supabase-js` version. Supabase's OAuth 2.1 docs name `getAuthorizationDetails`, `approveAuthorization`, and `denyAuthorization`. In `@supabase/supabase-js@2.107.0`, these methods are documented but not exposed in the TypeScript declarations, so `consent.ts` serves a browser JavaScript asset with runtime feature detection and a clear unavailable state if the loaded client does not expose `supabase.auth.oauth`.

- [ ] **Step 6: Serve consent page and assets**

Modify `src/platform/http/assets-routes.ts` to serve:

```text
/oauth/consent
/assets/oauth-consent.js
/assets/oauth-consent.css
```

Implementation can use `reply.type(...).send(...)` with file contents from `src/platform/oauth-consent/*` for Phase 1. A Vite build can replace this in the first widget phase.
The implementation should serve the local UMD bundle at `/assets/vendor/supabase.js` rather than depending on a CDN.

- [ ] **Step 7: Verify tests pass**

Run:

```bash
pnpm test tests/platform/auth/oauth-metadata.test.ts
pnpm typecheck
```

Expected:

```text
1 test passed
```

- [ ] **Step 8: Commit**

Run:

```bash
git add src/platform/auth/oauth-metadata.ts src/platform/oauth-consent src/platform/app.ts src/platform/http/assets-routes.ts tests/platform/auth/oauth-metadata.test.ts tests/platform/http/oauth-routes.test.ts
git commit -m "feat: add OAuth metadata and consent surface"
```

## Task 9: MCP Tool Registry And Platform Status Tool

**Files:**

- Create: `src/platform/mcp/tool-result.ts`
- Create: `src/platform/mcp/tool-context.ts`
- Create: `src/platform/mcp/tool-registry.ts`
- Create: `src/platform/mcp/tools/platform-status.ts`
- Create: `src/platform/mcp/server.ts`
- Test: `tests/platform/mcp/tool-registry.test.ts`
- Test: `tests/platform/mcp/platform-status.test.ts`

- [x] **Step 1: Write registry tests**

Create `tests/platform/mcp/tool-registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createToolRegistry } from "../../../src/platform/mcp/tool-registry.js";

describe("createToolRegistry", () => {
  it("sorts tools by name", () => {
    const registry = createToolRegistry();
    registry.add({ name: "z.tool", register: () => undefined });
    registry.add({ name: "a.tool", register: () => undefined });

    expect(registry.list().map((tool) => tool.name)).toEqual(["a.tool", "z.tool"]);
  });
});
```

Create `tests/platform/mcp/platform-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getPlatformStatus } from "../../../src/platform/mcp/tools/platform-status.js";

describe("getPlatformStatus", () => {
  it("returns platform status structured content", () => {
    expect(getPlatformStatus("0.1.0")).toEqual({
      service: "personal-mcp",
      version: "0.1.0",
      status: "ok",
    });
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test tests/platform/mcp
```

Expected:

```text
Failed to load url
```

- [x] **Step 3: Implement tool helpers**

Create `src/platform/mcp/tool-result.ts`:

```ts
export function textContent(text: string) {
  return [{ type: "text" as const, text }];
}

export function structuredToolResult<T extends Record<string, unknown>>(text: string, data: T) {
  return {
    content: textContent(text),
    structuredContent: data,
  };
}
```

Create `src/platform/mcp/tool-context.ts`:

```ts
import type { CurrentUser } from "../auth/current-user.js";

export type ToolContext = {
  requestId: string;
  currentUser: CurrentUser | null;
};
```

Create `src/platform/mcp/tool-registry.ts`:

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type RegisteredTool = {
  name: string;
  register: (server: McpServer) => void;
};

export function createToolRegistry() {
  const tools: RegisteredTool[] = [];

  return {
    add(tool: RegisteredTool) {
      tools.push(tool);
    },
    list() {
      return [...tools].sort((left, right) => left.name.localeCompare(right.name));
    },
    registerAll(server: McpServer) {
      for (const tool of this.list()) {
        tool.register(server);
      }
    },
  };
}
```

- [x] **Step 4: Implement platform status tool**

Create `src/platform/mcp/tools/platform-status.ts`:

```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { structuredToolResult } from "../tool-result.js";

export function getPlatformStatus(version: string) {
  return {
    service: "personal-mcp",
    version,
    status: "ok",
  };
}

export function registerPlatformStatusTool(server: McpServer, version: string) {
  server.registerTool(
    "platform.status",
    {
      title: "Platform Status",
      description: "Use this when checking whether the Personal MCP platform is online.",
      inputSchema: {},
      outputSchema: {
        service: z.string(),
        version: z.string(),
        status: z.literal("ok"),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const status = getPlatformStatus(version);
      return structuredToolResult("Personal MCP is online.", status);
    }
  );
}
```

Create `src/platform/mcp/server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppEnv } from "../config/env.js";
import { createToolRegistry } from "./tool-registry.js";
import { registerPlatformStatusTool } from "./tools/platform-status.js";

export function createPersonalMcpServer(env: Pick<AppEnv, "mcpServerName" | "mcpServerVersion">) {
  const server = new McpServer({
    name: env.mcpServerName,
    version: env.mcpServerVersion,
  });

  const registry = createToolRegistry();
  registry.add({
    name: "platform.status",
    register: (mcpServer) => registerPlatformStatusTool(mcpServer, env.mcpServerVersion),
  });
  registry.registerAll(server);

  return server;
}
```

- [x] **Step 5: Verify MCP unit tests pass**

Run:

```bash
pnpm test tests/platform/mcp
pnpm typecheck
```

Expected:

```text
2 tests passed
```

- [ ] **Step 6: Commit**

Run:

```bash
git add src/platform/mcp tests/platform/mcp
git commit -m "feat: add MCP tool registry and platform status tool"
```

## Task 10: MCP HTTP Transport

**Files:**

- Create: `src/platform/mcp/transport.ts`
- Modify: `src/platform/app.ts`
- Test: `tests/platform/mcp/transport-route.test.ts`

- [x] **Step 1: Write route smoke test**

Create `tests/platform/mcp/transport-route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/platform/app.js";

describe("MCP route", () => {
  it("exists at /mcp", async () => {
    const app = await buildApp({
      nodeEnv: "test",
      port: 3000,
      logLevel: "info",
      publicBaseUrl: "http://localhost:3000",
      databaseUrl: "postgresql://postgres:postgres@127.0.0.1:55322/postgres",
      supabaseUrl: "http://127.0.0.1:55321",
      supabaseAuthIssuer: "http://127.0.0.1:55321/auth/v1",
      supabaseJwksUrl: "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
      supabaseJwtAudience: "authenticated",
      supabaseAnonKey: "local-anon-key",
      mcpServerName: "personal-mcp",
      mcpServerVersion: "0.1.0",
      allowedOrigins: ["http://localhost:3000"],
    });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/mcp",
    });

    expect(response.statusCode).toBe(204);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test tests/platform/mcp/transport-route.test.ts
```

Expected:

```text
expected 404 to be 204
```

- [x] **Step 3: Implement transport route**

Create `src/platform/mcp/transport.ts`:

```ts
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance } from "fastify";
import { createPersonalMcpServer } from "./server.js";
import type { AppEnv } from "../config/env.js";

export async function registerMcpTransport(app: FastifyInstance, env: AppEnv) {
  app.options("/mcp", async (_request, reply) => {
    return reply.status(204).send();
  });

  app.post("/mcp", async (request, reply) => {
    const mcpServer = createPersonalMcpServer(env);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(request.raw, reply.raw, request.body);
    return reply.hijack();
  });
}
```

Modify `src/platform/app.ts`:

```ts
import { registerMcpTransport } from "./mcp/transport.js";
```

Inside `buildApp`, after assets routes:

```ts
await registerMcpTransport(app, env);
```

- [x] **Step 4: Verify transport route test passes**

Run:

```bash
pnpm test tests/platform/mcp/transport-route.test.ts
pnpm typecheck
```

Expected:

```text
1 test passed
```

- [x] **Step 5: Manual MCP inspection**

Verified with the installed MCP SDK client against a local ephemeral Fastify
listener instead of the visual Inspector UI: `platform.status` appears in the
tool list and returns `service=personal-mcp`, `version=0.1.0`, and `status=ok`.

Run the server:

```bash
pnpm dev
```

In another terminal, run MCP Inspector against `http://localhost:3000/mcp`.

Expected:

```text
platform.status appears in the tool list.
Calling platform.status returns service=personal-mcp and status=ok.
```

- [ ] **Step 6: Commit**

Run:

```bash
git add src/platform/mcp/transport.ts src/platform/app.ts tests/platform/mcp/transport-route.test.ts
git commit -m "feat: expose MCP streamable HTTP endpoint"
```

## Task 11: Production Deployment Documentation

**Files:**

- Create: `docs/deployment-public-https.md`

- [x] **Step 1: Write deployment runbook**

Create `docs/deployment-public-https.md`:

```markdown
# Public HTTPS Deployment

## Target Shape

Production uses:

- A Node-capable public HTTPS host for the MCP server.
- Supabase Postgres for database persistence.
- Supabase Auth for OAuth/OIDC authentication.
- Supabase Storage later when attachments are approved.

## Required Routes

- `GET /healthz`
- `GET /readyz`
- `POST /mcp`
- `OPTIONS /mcp`
- `GET /.well-known/oauth-protected-resource`
- `GET /oauth/consent`
- `GET /assets/*`

## Required Host Environment Variables

Use the same names as `.env.example`.

## Supabase Production Setup

1. Create a dedicated Supabase project.
2. Enable OAuth 2.1 server.
3. Configure asymmetric JWT signing keys.
4. Configure email magic link sign-in.
5. Configure the OAuth authorization path to `https://<mcp-host>/oauth/consent`.
6. Configure dynamic client registration only after reviewing Supabase's MCP authentication guidance.
7. Apply migrations through a controlled command.

## ChatGPT Connector Setup

1. Open ChatGPT connector settings.
2. Create a custom connector in Developer Mode.
3. Use the public MCP URL: `https://<mcp-host>/mcp`.
4. Confirm OAuth discovery succeeds.
5. Confirm the `platform.status` tool appears.
6. Call `platform.status`.

## Security Requirements

- HTTPS is mandatory.
- Private tools require Supabase tokens.
- Private tools verify issuer, audience, signature, expiry, and required scopes.
- Rate limits stay enabled.
- Request body limit stays at 1 MiB for Phase 1.
- Logs must redact authorization headers.
```

- [ ] **Step 2: Commit**

Run:

```bash
git add docs/deployment-public-https.md
git commit -m "docs: add public HTTPS deployment runbook"
```

## Task 12: Phase 1 Verification

**Files:**

- Modify only files required to fix verification failures.

- [x] **Step 1: Start Supabase local stack**

Run:

```bash
pnpm supabase:start
pnpm migrations:check
```

Expected:

```text
Started supabase local development setup.
Finished supabase db reset.
```

- [x] **Step 2: Run full local checks**

Run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm migrations:check
```

Expected:

```text
All commands complete successfully.
```

- [x] **Step 3: Run server locally**

Run:

```bash
pnpm dev
```

Expected:

```text
Server listening at http://0.0.0.0:3000
```

- [x] **Step 4: Verify health routes**

Run:

```bash
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
curl http://localhost:3000/.well-known/oauth-protected-resource
```

Expected:

```text
healthz returns ok=true.
readyz returns ok=true.
oauth-protected-resource returns resource, authorization_servers, bearer_methods_supported, and scopes_supported.
```

- [x] **Step 5: Verify MCP route**

Use MCP Inspector against:

```text
http://localhost:3000/mcp
```

Expected:

```text
platform.status is listed and callable.
```

- [x] **Step 6: Commit verification fixes**

No verification-only fixes were needed, so no empty verification commit was
created.

If any fixes were needed, run:

```bash
git add .
git commit -m "fix: complete phase 1 verification"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Checklist

Before implementation is marked complete, confirm:

- `docs/personal-mcp-production-plan.md` still matches the implementation direction.
- Supabase is the production backend target.
- Supabase CLI is the local backend workflow.
- Public HTTPS is the production MCP exposure path.
- Secure MCP Tunnel remains optional future work only.
- No Notes, Finance, Habits, or Kwartrack module code exists in Phase 1.
- `platform.status` is the only MCP tool registered in Phase 1.
- All private-tool auth primitives exist even though app tools are not implemented yet.
- OAuth metadata route exists.
- Minimal OAuth consent surface exists.
- Audit and idempotency tables and services exist.
- All verification commands pass.

## Execution Recommendation

Use subagent-driven development for this plan:

1. One subagent implements one task.
2. Main agent reviews each task.
3. Main agent runs verification after each task.
4. Commit after each task passes.

If executing inline, implement no more than two tasks before a verification checkpoint.
