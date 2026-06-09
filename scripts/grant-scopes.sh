#!/usr/bin/env bash
# Grant platform scopes to a user (matched by email) in the configured database.
#
# The app authorizes per-tool access from the platform.app_user_scopes table, not from the JWT
# (Supabase issues no scope claim). A user must exist first — make any authenticated MCP call
# (e.g. platform.whoami) so resolveCurrentUser upserts the row, then run this.
#
# Usage:   scripts/grant-scopes.sh <email> [scope ...]
# Default scopes: habits.read habits.write
# DB target: $DATABASE_URL, else local Supabase (127.0.0.1:55322).
set -euo pipefail

EMAIL="${1:?usage: grant-scopes.sh <email> [scope ...]}"
shift || true
SCOPES=("$@")
if [ ${#SCOPES[@]} -eq 0 ]; then
  SCOPES=(habits.read habits.write)
fi

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:55322/postgres}"

for scope in "${SCOPES[@]}"; do
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c \
    "insert into platform.app_user_scopes (user_id, scope)
       select id, '${scope}' from platform.app_users where email = '${EMAIL}'
     on conflict (user_id, scope) do nothing;"
done

echo "Scopes for ${EMAIL}:"
psql "$DB_URL" -At -c \
  "select s.scope from platform.app_user_scopes s
     join platform.app_users u on u.id = s.user_id
    where u.email = '${EMAIL}' order by s.scope;"
