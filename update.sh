#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"
COMMIT_MSG=${1:-"更新试卷库"}

echo "Adding data/exams.json and assets/papers..."
git add data/exams.json assets/papers

if ! git diff --staged --quiet; then
  git commit -m "$COMMIT_MSG"
  git push
  echo "已提交并推送更改。"
else
  echo "没有可提交的更改。"
fi
