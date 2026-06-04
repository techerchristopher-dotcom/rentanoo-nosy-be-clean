#!/usr/bin/env bash
# Bridge MCP Cursor ↔ RapidAPI AeroDataBox (https://mcp.rapidapi.com)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

KEY="${AERODATABOX_RAPIDAPI_KEY:-${RAPIDAPI_KEY:-}}"
if [[ -z "$KEY" ]]; then
  echo "AERODATABOX_RAPIDAPI_KEY manquante. Ajoutez-la dans .env.local" >&2
  exit 1
fi

exec npx -y mcp-remote "https://mcp.rapidapi.com" \
  --header "x-api-host: aerodatabox.p.rapidapi.com" \
  --header "x-api-key: ${KEY}"
