#!/bin/bash

# Start TodoFlow — FastAPI backend + React frontend

echo "🚀 Starting TodoFlow..."

# Start backend
echo "📡 Starting FastAPI backend on http://localhost:8000..."
cd "$(dirname "$0")/backend"
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

sleep 2

# Start frontend
echo "🌐 Starting React frontend on http://localhost:5173..."
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ TodoFlow is running!"
echo "   Frontend: http://localhost:5173"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
