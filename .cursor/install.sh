#!/usr/bin/env bash
# Idempotent repository bootstrap for the StudyGotchi Knowledge Engine.
# Installs backend (uv) and frontend (npm) dependencies after checkout.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$HOME/.local/bin:$PATH"

# uv is baked into the base snapshot; self-heal if it is ever missing.
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

# --- Backend -------------------------------------------------------------
cd "$REPO_ROOT/backend"

# Local dev env file. Defaults to the deterministic offline LLM stub so the
# engine, migrations, and demo seed run without any API keys. Add
# ANTHROPIC_API_KEY / VOYAGE_API_KEY and set LLM_PROVIDER=anthropic to enable
# real extraction/embeddings.
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i 's/^LLM_PROVIDER=.*/LLM_PROVIDER=fake/' .env
fi

uv sync

# --- Frontend ------------------------------------------------------------
cd "$REPO_ROOT/frontend"
npm ci

echo "install.sh: dependencies installed."
