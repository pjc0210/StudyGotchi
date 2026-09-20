#!/usr/bin/env bash
# Long-running FastAPI (uvicorn) dev server for the knowledge engine.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/bin:$PATH"

cd "$REPO_ROOT/backend"
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
