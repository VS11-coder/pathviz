#!/usr/bin/env bash
set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   PathViz — Pathfinding Visualizer   ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$SCRIPT_DIR/backend"

# ── Install dependencies ──────────────────────────────────────────
if ! python3 -c "import fastapi" &>/dev/null; then
  echo "  → Installing Python dependencies…"
  pip3 install -r "$BACKEND/requirements.txt" -q
else
  echo "  ✓ Dependencies already installed"
fi

# ── Launch ────────────────────────────────────────────────────────
echo ""
echo "  → Starting server at http://localhost:8000"
echo "  → Press Ctrl+C to stop"
echo ""

cd "$BACKEND"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
