#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT/web"
API_PORT="${DEV_API_PORT:-8200}"
FRONT_PORT="${DEV_WEB_PORT:-5173}"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ROOT/.env"
  set +a
  API_PORT="${DEV_API_PORT:-$API_PORT}"
  FRONT_PORT="${DEV_WEB_PORT:-$FRONT_PORT}"
fi

stop_pattern() {
  local label="$1"
  local pattern="$2"
  if pgrep -f "$pattern" >/dev/null 2>&1; then
    echo "Stopping existing $label instances…"
    pkill -f "$pattern" || true
    sleep 1
  fi
}

free_port() {
  local label="$1"
  local port="$2"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -ti :"$port" >/dev/null 2>&1; then
      echo "Releasing $label on port $port…"
      lsof -ti :"$port" | xargs -r kill -9 || true
    fi
  fi
}

stop_pattern "FastAPI server" "uvicorn api.main:app"
stop_pattern "Vite dev server" "vite" # spawned by npm run dev
free_port "FastAPI" "$API_PORT"
free_port "Vite" "$FRONT_PORT"

PYTHON_BIN="$ROOT/.venv/bin/python"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="${PYTHON:-${PYTHON_BIN:-}}"
  if [[ -z "$PYTHON_BIN" ]]; then
    PYTHON_BIN="$(command -v python3 || command -v python)"
  fi
fi

if [[ -z "$PYTHON_BIN" ]]; then
  echo "Python interpreter not found. Install Python 3 and/or create .venv." >&2
  exit 1
fi

cd "$ROOT"
"$PYTHON_BIN" -m uvicorn api.main:app --reload --port "$API_PORT" &
BACK_PID=$!

echo "FastAPI server (pid $BACK_PID) running on port $API_PORT"

(
  cd "$WEB_DIR"
  npm run dev
) &
FRONT_PID=$!

echo "Vite dev server (pid $FRONT_PID) starting…"

cleanup() {
  echo "Shutting down…"
  kill "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
  wait "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

wait "$BACK_PID" "$FRONT_PID"
