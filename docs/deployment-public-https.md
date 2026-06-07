# Public HTTPS Deployment

This runbook deploys the Personal MCP server as a public HTTPS remote MCP server
backed by Supabase Postgres and Supabase Auth.

## References

- OpenAI Apps SDK MCP concepts: https://developers.openai.com/apps-sdk/concepts/mcp-server
- OpenAI MCP and Connectors guide: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- OpenAI Apps SDK auth guide: https://developers.openai.com/apps-sdk/build/auth#triggering-authentication-ui
- Supabase OAuth 2.1 Server: https://supabase.com/docs/guides/auth/oauth-server
- Supabase MCP authentication: https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- Supabase OAuth setup: https://supabase.com/docs/guides/auth/oauth-server/getting-started
- Supabase JWT verification: https://supabase.com/docs/guides/auth/jwts
- Supabase local migrations: https://supabase.com/docs/guides/local-development/overview
- Render Web Services: https://render.com/docs/web-services
- Render Blueprint spec: https://render.com/docs/blueprint-spec
- Render Node version: https://render.com/docs/node-version

## Target Shape

Production uses:

- A Node-capable public HTTPS host for the Fastify MCP server.
- Supabase Postgres as the production database.
- Supabase Auth as the OAuth 2.1/OIDC identity provider.
- Supabase JWT signing keys with a JWKS endpoint for token verification.
- Supabase Storage later, only after attachments are approved.

OpenAI's Apps SDK guidance recommends Streamable HTTP for MCP servers, and the
Responses MCP guide says remote MCP servers can be any public Internet server
that implements remote MCP. This project exposes Streamable HTTP at `/mcp`.

## Required Routes

The host must expose these routes over HTTPS:

- `GET /healthz`
- `GET /readyz`
- `POST /mcp`
- `OPTIONS /mcp`
- `GET /.well-known/oauth-protected-resource`
- `GET /oauth/consent`
- `GET /assets/*`

`GET /mcp` and `DELETE /mcp` intentionally return JSON-RPC method-not-allowed
responses in Phase 1 because this server runs the MCP transport statelessly.

## Host Environment

Use the same variable names as `.env.example`.

| Variable                | Production value                                                  |
| ----------------------- | ----------------------------------------------------------------- |
| `NODE_ENV`              | `production`                                                      |
| `PORT`                  | Host-provided port, or `3000` if the host expects it              |
| `LOG_LEVEL`             | `info` by default                                                 |
| `PUBLIC_BASE_URL`       | `https://<mcp-host>` with no trailing slash                       |
| `DATABASE_URL`          | Supabase Postgres connection string for the production project    |
| `SUPABASE_URL`          | `https://<project-ref>.supabase.co`                               |
| `SUPABASE_AUTH_ISSUER`  | `https://<project-ref>.supabase.co/auth/v1`                       |
| `SUPABASE_JWKS_URL`     | `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_AUDIENCE` | `authenticated`, unless a custom audience is configured           |
| `SUPABASE_ANON_KEY`     | Supabase anon or publishable key for the consent page             |
| `MCP_SERVER_NAME`       | `personal-mcp`                                                    |
| `MCP_SERVER_VERSION`    | package version, for example `0.1.0`                              |
| `ALLOWED_ORIGINS`       | comma-separated HTTPS origins allowed by CORS                     |

Do not expose a Supabase service role key to browser-served code. If a future
admin job needs elevated access, put that secret in a separate server-only
runtime and keep it out of the consent page and widgets.

## Supabase Production Setup

1. Create a dedicated Supabase project for this MCP server.
2. Enable the OAuth 2.1 server in `Authentication > OAuth Server`.
3. Set the Site URL to `https://<mcp-host>`.
4. Set the Authorization Path to `/oauth/consent`.
5. Enable email magic link sign-in as the first production login method.
6. Configure asymmetric JWT signing keys so the MCP server can verify access
   tokens from the JWKS URL.
7. Enable dynamic client registration only after reviewing the Supabase MCP auth
   guidance. If enabled, require user approval, monitor registered clients, and
   validate redirect URI domains.
8. Keep production database credentials in the host provider secret manager.

Supabase OAuth redirects users to the configured authorization UI with an
`authorization_id` query parameter. The Phase 1 consent page is intentionally
minimal and relies on Supabase's OAuth helper methods when the installed
Supabase JS client exposes them.

## Database Deployment

Local database changes are committed under `supabase/migrations`.

For the first production deploy:

```bash
pnpm install --frozen-lockfile
pnpm exec supabase login
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push
```

Before every later deploy:

```bash
pnpm migrations:check
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

Review any SQL generated by Supabase CLI before pushing. Do not use the
production database for local tests.

## Application Deployment

This project targets Render for the first public HTTPS deployment.

Committed Render files:

- `render.yaml`: Render Blueprint for the web service.
- `.node-version`: Node version pin used by Render's native Node runtime.

The Render service uses:

- Runtime: Node
- Region: Singapore
- Plan: Starter
- Build command:

```bash
corepack enable && corepack prepare pnpm@11.5.2 --activate && pnpm install --frozen-lockfile && pnpm build
```

- Start command:

```bash
node dist/server.js
```

- Health check path: `/healthz`

Render web services must bind to `0.0.0.0` and should use the `PORT`
environment variable. This project does both through `src/server.ts` and the
`PORT=10000` Blueprint value.

### Render Environment Variables

`render.yaml` sets safe defaults for:

- `NODE_ENV=production`
- `PORT=10000`
- `LOG_LEVEL=info`
- `MCP_SERVER_NAME=personal-mcp`
- `MCP_SERVER_VERSION=0.1.0`

Render will prompt for these deployment-specific values because they are marked
with `sync: false`:

- `PUBLIC_BASE_URL`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_AUTH_ISSUER`
- `SUPABASE_JWKS_URL`
- `SUPABASE_JWT_AUDIENCE`
- `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGINS`

Use the Render `onrender.com` URL first:

```text
PUBLIC_BASE_URL=https://<render-service>.onrender.com
ALLOWED_ORIGINS=https://<render-service>.onrender.com,https://chatgpt.com,https://chat.openai.com
```

If a custom domain is added later, change `PUBLIC_BASE_URL` to the custom HTTPS
origin and include both the custom origin and ChatGPT origins in
`ALLOWED_ORIGINS`.

### Render Setup

1. Push this repository to GitHub.
2. Create the Supabase production project and collect the environment values.
3. In Render, create a new Blueprint from this repository.
4. Confirm the `personal-mcp` web service settings from `render.yaml`.
5. Enter every `sync: false` environment variable.
6. Create the Blueprint and wait for the first deploy.
7. Verify `/healthz`, `/readyz`, OAuth metadata, and `/mcp`.

If the first deploy starts before the exact Render URL is known, let it fail,
copy the generated `onrender.com` URL into `PUBLIC_BASE_URL` and
`ALLOWED_ORIGINS`, then redeploy.

The generic host command shape remains:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Render terminates TLS and forwards HTTP traffic to the Node process.

After deployment, verify:

```bash
curl -fsS https://<mcp-host>/healthz
curl -fsS https://<mcp-host>/readyz
curl -fsS https://<mcp-host>/.well-known/oauth-protected-resource
```

The OAuth protected resource metadata must advertise:

- `resource`: `https://<mcp-host>`
- `authorization_servers`: `["https://<project-ref>.supabase.co/auth/v1"]`
- `scopes_supported`: the platform scope list from `src/platform/auth/scopes.ts`

## ChatGPT Connector Setup

1. Open ChatGPT connector settings.
2. Create a custom connector in Developer Mode.
3. Use `https://<mcp-host>/mcp` as the MCP server URL.
4. Confirm OAuth/resource discovery succeeds.
5. Confirm `platform.status` appears in the tool list.
6. Call `platform.status` and verify structured content:

```json
{
  "service": "personal-mcp",
  "version": "0.1.0",
  "status": "ok"
}
```

## Auth Requirements Before Private Tools

`platform.status` is public in Phase 1. Before adding notes, finance, habits, or
other private tools:

- Add per-tool `securitySchemes` metadata so ChatGPT knows which scopes each
  tool requires.
- Verify issuer, audience, signature, expiry, subject, and scopes for every
  private tool call.
- Return `_meta["mcp/www_authenticate"]` challenges when a private tool needs
  ChatGPT to start OAuth linking.
- Map Supabase user subjects into `platform.app_users`.
- Audit every write with `platform.audit_events`.
- Use idempotency keys for state-changing tool calls that may be retried.

OpenAI's Apps SDK auth guidance requires both OAuth metadata and runtime
`mcp/www_authenticate` challenges before ChatGPT surfaces tool-level OAuth UI.

## Security Requirements

- HTTPS is mandatory.
- Keep rate limits enabled.
- Keep the 1 MiB body limit for Phase 1.
- Keep authorization headers, tokens, secrets, passwords, cookies, and API keys
  redacted from logs.
- Restrict CORS to known HTTPS origins.
- Store all host secrets in the deployment provider's secret manager.
- Rotate Supabase signing keys carefully; Supabase notes JWKS responses can be
  cached, so allow overlap during key changes.
- Keep Supabase RLS enabled for user-facing app data.
- Review tool call logs periodically because remote MCP tool calls can move
  sensitive data between systems.

## Rollback

1. Revert the host to the previous deployed image or build.
2. Do not roll back production migrations by hand unless there is a written
   down-migration or a verified restore plan.
3. If OAuth setup is broken, disable the ChatGPT custom connector first, then
   fix Supabase OAuth settings and redeploy.
4. If token verification fails after signing key changes, check the JWKS URL,
   issuer, audience, and key rotation timing before changing application code.
