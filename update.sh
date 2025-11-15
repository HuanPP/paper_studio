#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"
COMMIT_MSG=${1:-"更新试卷库"}

if ! git diff --quiet; then
  echo "Adding data/exams.json and assets/papers..."
  git add data/exams.json assets/papers
  git commit -m "$COMMIT_MSG"
  git push
else
  echo "没有可提交的更改。"
fi
