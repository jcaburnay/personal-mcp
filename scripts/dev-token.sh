#!/usr/bin/env bash
# Mint a local Supabase access token so you can call the MCP server without ChatGPT.
# The local stack has email confirmations disabled, so signup returns a usable token immediately.
#
#   scripts/dev-token.sh            # prints the JWT to stdout
#   TOKEN=$(scripts/dev-token.sh)   # capture it for the smoke test / curl
#
# Overridable via env: SUPABASE_API_URL, SUPABASE_PUBLISHABLE_KEY, DEV_EMAIL, DEV_PASSWORD.
set -euo pipefail

API="${SUPABASE_API_URL:-http://127.0.0.1:55321}"
KEY="${SUPABASE_PUBLISHABLE_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}"
EMAIL="${DEV_EMAIL:-dev@local.test}"
PASSWORD="${DEV_PASSWORD:-devpass12345}"

extract_token() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).access_token||"")}catch{process.stdout.write("")}})'
}

# Existing user -> log in. New user -> sign up. Either returns an access_token.
token="$(curl -s "$API/auth/v1/token?grant_type=password" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | extract_token)"

if [ -z "$token" ]; then
  token="$(curl -s "$API/auth/v1/signup" \
    -H "apikey: $KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | extract_token)"
fi

if [ -z "$token" ]; then
  echo "Could not mint a token. Is the local Supabase stack running? (pnpm supabase:start)" >&2
  exit 1
fi

echo "$token"
