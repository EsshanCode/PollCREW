#!/bin/sh
cd "$(dirname "$0")"
trap 'kill 0' INT TERM EXIT
(cd backend && uv run uvicorn main:app --host 127.0.0.1 --port 8000) &
(cd frontend && npm run build && npm run start) &
wait
