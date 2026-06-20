#!/usr/bin/env bash
# BOM Live Arrivals 3D — unified start script
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " BOM Live Arrivals 3D — Starting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Install backend deps if needed
if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "[backend] Installing Python dependencies..."
  pip3 install -r "$ROOT/backend/requirements.txt" --quiet
fi

# Install frontend deps if needed
if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "[frontend] Installing npm dependencies..."
  cd "$ROOT/frontend" && npm install --silent
fi

# Start FastAPI backend
echo "[backend] Starting FastAPI on http://localhost:8000"
cd "$ROOT/backend"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# Start Vite frontend
echo "[frontend] Starting Vite dev server on http://localhost:5173"
cd "$ROOT/frontend"
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000"
echo "✓ Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Cleanup on exit
cleanup() {
  echo "Stopping servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

wait
