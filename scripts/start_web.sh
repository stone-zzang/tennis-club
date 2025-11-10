#!/bin/bash
set -e

echo "Starting Tennis Club Web..."

cd web

# 빌드가 안 되어 있으면 빌드
if [ ! -d "dist" ]; then
  echo "Building web application..."
  npm ci
  npm run build
fi

# 프리뷰 서버 시작
exec npm run preview -- --host 0.0.0.0 --port ${PORT:-4173}

