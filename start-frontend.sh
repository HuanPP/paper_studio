#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-4173}"
cd "$ROOT_DIR"
echo "Serving Paper Studio on http://localhost:${PORT}"
python3 -m http.server "$PORT"
