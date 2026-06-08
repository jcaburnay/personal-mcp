# Self-hosting your own instance

This guide stands up your **own** personal-mcp instance against **your own Supabase project** and
host. It's for technical users comfortable with environment variables and deploying a Node service.

Nothing about the code is tied to a specific Supabase project — every value is an environment
variable. You bring your own Supabase project; the server verifies JWTs against its JWKS and stores
data in its Postgres.

## What you'll end up with

```
Your MCP client (ChatGPT / Claude / Cursor / Inspector)
        │  HTTPS + OAuth 2.1
        ▼
Your personal-mcp server (Render / Docker / VPS)  ──►  Your Supabase project (Auth + Postgres)
```

## Prerequisites

- Node ≥ 22 and pnpm (`corepack enable`)
- A [Supabase](https://supabase.com) account (free tier is fine to start — see the caveats in the
  main [README](../README.md))
- A place to run a **public HTTPS** Node service: Render, Fly.io, a VPS, or any Docker host
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (for migrations)

## 1. Clone and install

```bash
git clone https://github.com/jcaburnay/personal-mcp.git
cd personal-mcp
pnpm install
```

## 2. Create a Supabase project

Create a new project in the [Supabase dashboard](https://supabase.com/dashboard) and note its
**project ref** (the `xxxx` in `https://xxxx.supabase.co`).

## 3. Configure Auth (the only fiddly part)

All under **Authentication** in the dashboard:

1. **JWT signing keys** → confirm the project uses **asymmetric keys (ES256)**. The server verifies
   tokens via the project's JWKS, so a key must be published at
   `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`. New projects use asymmetric keys by
   default; if yours is on a legacy shared secret, migrate to signing keys.
2. **OAuth Apps** → enable the **OAuth 2.1 server** (currently a Beta feature). This is what lets an
   MCP client run the OAuth login against your Supabase.
3. **OAuth Apps → Add a new client**:
   - **Public Client** = ON (Authorization Code + PKCE — MCP clients can't hold a secret).
   - Save and copy the **Client ID** (a UUID). You'll give this to the MCP client.
   - **Redirect URIs**: leave empty for now — you add the MCP client's callback URL in step 7, once
     the client shows it to you.
4. **URL Configuration**:
   - **Site URL** = your deployed server URL (e.g. `https://your-mcp.example.com`).
   - **Redirect URLs** → add `https://your-mcp.example.com/oauth/consent`.

## 4. Collect environment values

Copy `.env.example` and fill it in. Where each value comes from:

| Variable | Value / where to find it |
| --- | --- |
| `PUBLIC_BASE_URL` | Your server's public URL, e.g. `https://your-mcp.example.com` |
| `DATABASE_URL` | Supabase → **Connect** → **Transaction pooler** string (host `…pooler.supabase.com`, port **6543**). Append **`?sslmode=require`** |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_AUTH_ISSUER` | `https://<ref>.supabase.co/auth/v1` |
| `SUPABASE_JWKS_URL` | `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_AUDIENCE` | `authenticated` |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → **Settings → API Keys** → Publishable key (`sb_publishable_…`) |
| `ALLOWED_ORIGINS` | Comma-separated client origins, e.g. `https://chatgpt.com,https://chat.openai.com` |
| `NODE_ENV` | `production` |
| `PORT` | Your host's port (Render uses `10000`; default `3000`) |
| `LOG_LEVEL` | `info` |
| `MCP_SERVER_NAME` / `MCP_SERVER_VERSION` | Any identifiers (defaults `personal-mcp` / `0.1.0`) |

> **Pooler note:** the transaction pooler does not support prepared statements; the server already
> sets `prepare: false`, so the pooler string is the right one to use.

## 5. Apply the database schema

Link the CLI to your project and push the committed migrations:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

(Alternatively, run the SQL files in `supabase/migrations/` from the dashboard SQL editor.) This
creates the `platform` schema (`app_users`, `app_user_scopes`, `audit_events`, `idempotency_keys`).

## 6. Deploy the server (public HTTPS)

Pick one:

**Render** — the included [`render.yaml`](../render.yaml) is a blueprint. Create a Web Service from
your fork, set the env vars from step 4 (the `sync: false` ones), and deploy. Edit `name`/`region`
to taste.

**Docker** — anywhere that runs containers:

```bash
docker build -t personal-mcp .
docker run --rm -p 3000:3000 --env-file .env.production personal-mcp
```

Put a TLS-terminating reverse proxy (Caddy/Traefik/your platform) in front so the endpoint is
HTTPS. The image runs `node dist/server.js` and has a `/healthz` healthcheck.

**VPS** — `pnpm build` then `node dist/server.js` behind nginx/Caddy with TLS.

## 7. Verify the deployment

```bash
curl https://your-mcp.example.com/healthz        # {"ok":true,...}
curl https://your-mcp.example.com/readyz         # {"ok":true,"dependencies":{"database":"ready"}}  -> DB reachable
curl https://your-mcp.example.com/.well-known/oauth-protected-resource
#   resource = your URL, authorization_servers = your Supabase /auth/v1, scopes = openid/email/profile
```

A `503` on `/readyz` means the `DATABASE_URL`/pooler/`sslmode` needs fixing before going further.

## 8. Connect an MCP client

The flow is the same for any OAuth-capable MCP client (ChatGPT, Claude, Cursor, VS Code). ChatGPT
example:

1. New connector → Server URL `https://your-mcp.example.com/mcp` → Authentication **OAuth** →
   **User-Defined OAuth Client**.
2. **OAuth Client ID** = the Client ID from step 3; leave the secret empty; token endpoint auth
   method **none**. Scopes auto-discover as `openid/email/profile`.
3. The client shows a **Callback URL**. Copy it.
4. Back in Supabase → Auth → OAuth Apps → your client → **add that callback URL** to Redirect URIs →
   save. (Each client/connector has its own callback; adding more is additive.)
5. Connect → sign in on the Supabase consent page → approve. The client now calls your `/mcp`.

> Tooling clients (MCP Inspector, curl, custom SDK) can skip OAuth and pass a bearer token directly
> — mint one from your Supabase the same way `scripts/dev-token.sh` does for local.

## 9. Grant yourself tool scopes

Authorization for per-tool access comes from the `platform.app_user_scopes` table, **not** the JWT
(Supabase issues no scope claim). The introspection tools (`platform.status`, `platform.whoami`)
need no scopes, but the app modules (notes/finance/habits) will. After your first sign-in (which
creates your `app_users` row), grant your operator scopes, e.g.:

```sql
insert into platform.app_user_scopes (user_id, scope)
select id, unnest(array['notes.read','notes.write','finance.read','finance.write','habits.read','habits.write'])
from platform.app_users where email = 'you@example.com'
on conflict do nothing;
```

## 10. Backups

This holds real personal data. Enable Supabase backups (Pro tier or scheduled) and/or run periodic
`pg_dump` to off-host storage. Test a restore before you rely on it.

## Local development

For running and testing locally (with the bundled Supabase CLI stack and no ChatGPT), see the
**Quick start** and **Testing the MCP server locally** sections of the [README](../README.md).
