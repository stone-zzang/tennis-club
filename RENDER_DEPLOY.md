# Render.com 배포 가이드

이 문서는 Tennis Club 애플리케이션을 Render.com에 배포하는 방법을 설명합니다.

## 배포 구조

이 프로젝트는 **하나의 통합 서비스**로 배포됩니다:
- **백엔드 API** (FastAPI)가 프론트엔드 정적 파일도 함께 서빙합니다
- 하나의 URL로 프론트엔드와 백엔드 모두 접근 가능합니다

## 배포 방법

### 방법 1: render.yaml 사용 (권장)

1. Render.com 대시보드에서 "New" → "Blueprint" 선택
2. GitHub 저장소 연결
3. `render.yaml` 파일이 자동으로 감지되어 통합 서비스가 생성됩니다

### 방법 2: 수동 배포

1. Render.com 대시보드에서 "New" → "Web Service" 선택
2. GitHub 저장소 연결
3. 설정:
   - **Name**: `tennis-club`
   - **Environment**: `Python 3`
   - **Build Command**: 
     ```bash
     pip install -r api/requirements.txt && cd web && npm ci && npm run build && cd ..
     ```
   - **Start Command**: 
     ```bash
     python -m uvicorn api.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Health Check Path**: `/health`
   - **Python Version**: `3.11.0`
   - **Node Version**: `20.18.0` (빌드에 필요)

## 환경 변수 설정

다음 환경 변수를 설정하세요:

- `DATABASE_URL`: 데이터베이스 연결 URL
  - SQLite (로컬): `sqlite:///./tennis_club.db`
  - PostgreSQL (프로덕션): Render.com에서 제공하는 PostgreSQL 서비스 URL
  - 예: `postgresql://user:password@host:5432/dbname`

- `PYTHON_VERSION`: `3.11.0` (선택사항)

- `NODE_VERSION`: `20.18.0` (빌드에 필요)

- `VITE_API_BASE_URL`: (선택사항)
  - 통합 배포의 경우 빈 문자열로 두면 같은 도메인에서 API를 호출합니다
  - 별도 도메인에서 API를 호출해야 하는 경우에만 설정하세요

## 데이터베이스 설정

### PostgreSQL 사용 (권장)

1. Render.com 대시보드에서 "New" → "PostgreSQL" 선택
2. 데이터베이스 생성
3. 생성된 데이터베이스의 "Internal Database URL"을 복사
4. 백엔드 API 서비스의 `DATABASE_URL` 환경 변수에 설정

### SQLite 사용 (개발용)

SQLite는 파일 기반이므로 Render.com의 임시 파일 시스템에 저장됩니다.
**프로덕션 환경에서는 PostgreSQL 사용을 강력히 권장합니다.**

## 배포 후 확인

1. 프론트엔드가 정상 작동하는지 확인:
   - `https://your-service.onrender.com` 접속
   - 애플리케이션이 정상적으로 로드되는지 확인

2. 백엔드 API가 정상 작동하는지 확인:
   - `https://your-service.onrender.com/health` 접속
   - `https://your-service.onrender.com/docs` 접속하여 API 문서 확인
   - 프론트엔드에서 API 호출이 정상인지 브라우저 개발자 도구로 확인

## 로컬 개발

로컬에서 전체 스택을 실행하려면:

```bash
# 방법 1: 통합 스크립트 사용
./scripts/start_all.sh

# 방법 2: 개별 실행
# 터미널 1: 백엔드
./scripts/start_api.sh

# 터미널 2: 프론트엔드
./scripts/start_web.sh
```

## 문제 해결

### 백엔드가 시작되지 않는 경우

- `DATABASE_URL` 환경 변수가 올바르게 설정되었는지 확인
- 빌드 로그에서 Python 패키지 설치 오류 확인
- 포트가 `$PORT` 환경 변수를 사용하는지 확인

### 프론트엔드가 API를 찾지 못하는 경우

- `VITE_API_BASE_URL` 환경 변수가 올바르게 설정되었는지 확인
- 백엔드 서비스가 실행 중인지 확인
- CORS 설정이 올바른지 확인 (현재는 모든 origin 허용)

### 빌드 실패

- Node.js 버전이 20.18.0인지 확인
- Python 버전이 3.11.0인지 확인
- 의존성 설치 오류가 없는지 확인

## 추가 리소스

- [Render.com 문서](https://render.com/docs)
- [FastAPI 배포 가이드](https://fastapi.tiangolo.com/deployment/)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)

