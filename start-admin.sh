#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-4174}"
cd "$ROOT_DIR/admin"
if [ ! -d node_modules ]; then
  echo "Installing admin dependencies..."
  npm install >/dev/null
fi
export PORT
echo "Starting Paper Studio Admin on http://localhost:${PORT}"
npm run dev
