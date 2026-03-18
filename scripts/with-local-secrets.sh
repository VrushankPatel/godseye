#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_SECRETS_FILE="$ROOT_DIR/scripts/local-secrets.sh"

if [[ -f "$LOCAL_SECRETS_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$LOCAL_SECRETS_FILE"
else
  echo "[Godseye] Local secrets file not found at scripts/local-secrets.sh. Optional keyed features may be unavailable." >&2
fi

exec "$@"
