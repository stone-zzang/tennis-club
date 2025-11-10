#!/bin/bash
# Render.com 배포 전 로컬 테스트 스크립트

set -e

echo "=== Render.com 배포 전 로컬 테스트 ==="

# 환경 변수 확인
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL이 설정되지 않았습니다. 기본값(sqlite)을 사용합니다."
  export DATABASE_URL="sqlite:///./tennis_club.db"
fi

if [ -z "$VITE_API_BASE_URL" ]; then
  echo "⚠️  VITE_API_BASE_URL이 설정되지 않았습니다. 기본값을 사용합니다."
  export VITE_API_BASE_URL="http://localhost:8200"
fi

echo ""
echo "환경 변수:"
echo "  DATABASE_URL: $DATABASE_URL"
echo "  VITE_API_BASE_URL: $VITE_API_BASE_URL"
echo ""

# 백엔드 빌드 테스트
echo "1. 백엔드 의존성 설치 테스트..."
cd api
pip install -q -r requirements.txt
echo "✅ 백엔드 의존성 설치 완료"

# 백엔드 시작 테스트
echo ""
echo "2. 백엔드 시작 테스트..."
cd ..
timeout 5 python -m uvicorn api.main:app --host 0.0.0.0 --port 8200 &
API_PID=$!
sleep 3

if ps -p $API_PID > /dev/null; then
  echo "✅ 백엔드 서버 시작 성공"
  kill $API_PID 2>/dev/null || true
else
  echo "❌ 백엔드 서버 시작 실패"
  exit 1
fi

# 프론트엔드 빌드 테스트
echo ""
echo "3. 프론트엔드 빌드 테스트..."
cd web
npm ci --silent
npm run build
echo "✅ 프론트엔드 빌드 완료"

# 프론트엔드 프리뷰 테스트
echo ""
echo "4. 프론트엔드 프리뷰 테스트..."
timeout 5 npm run preview -- --host 0.0.0.0 --port 4173 &
WEB_PID=$!
sleep 3

if ps -p $WEB_PID > /dev/null; then
  echo "✅ 프론트엔드 서버 시작 성공"
  kill $WEB_PID 2>/dev/null || true
else
  echo "❌ 프론트엔드 서버 시작 실패"
  exit 1
fi

echo ""
echo "=== 모든 테스트 통과! Render.com에 배포할 준비가 되었습니다. ==="

