#!/bin/bash
set -e

# 통합 실행 스크립트 (로컬 개발용)
# Render.com에서는 각 서비스를 별도로 실행합니다

echo "Starting Tennis Club Full Stack..."

# 백엔드 시작 (백그라운드)
echo "Starting API server..."
python -m uvicorn api.main:app --host 0.0.0.0 --port 8200 &
API_PID=$!

# 프론트엔드 빌드 및 시작
echo "Building and starting web server..."
cd web
npm ci
npm run build
npm run preview -- --host 0.0.0.0 --port 4173 &
WEB_PID=$!

# 종료 시그널 처리
trap "kill $API_PID $WEB_PID" EXIT

echo "API running on http://localhost:8200"
echo "Web running on http://localhost:4173"
echo "Press Ctrl+C to stop"

# 프로세스 대기
wait

