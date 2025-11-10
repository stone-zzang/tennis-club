#!/bin/bash
set -e

echo "Building Tennis Club Web..."

cd web

# 의존성 설치
npm ci

# 프로덕션 빌드
npm run build

echo "Build completed successfully!"

