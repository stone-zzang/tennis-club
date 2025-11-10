#!/bin/bash
# Render.com용 통합 빌드 및 시작 스크립트
# 프론트엔드 빌드 후 백엔드 시작

set -e

echo "=== Tennis Club 통합 빌드 및 시작 ==="

# 프론트엔드 빌드
echo "1. 프론트엔드 빌드 중..."
cd web
npm ci
npm run build
echo "✅ 프론트엔드 빌드 완료"
cd ..

# 데이터베이스 초기화
echo ""
echo "2. 데이터베이스 초기화 중..."
python -c "from api.db.models import Base; from api.db.session import engine; Base.metadata.create_all(bind=engine)"
echo "✅ 데이터베이스 초기화 완료"

# 백엔드 서버 시작
echo ""
echo "3. 백엔드 서버 시작 중..."
echo "   프론트엔드와 백엔드가 통합되어 실행됩니다."
exec python -m uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8200}

