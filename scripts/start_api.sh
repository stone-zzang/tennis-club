#!/bin/bash
set -e

echo "Starting Tennis Club API..."

# 데이터베이스 초기화 (필요한 경우)
python -c "from api.db.models import Base; from api.db.session import engine; Base.metadata.create_all(bind=engine)"

# FastAPI 서버 시작
exec python -m uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8200}

