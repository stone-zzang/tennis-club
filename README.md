# Tennis Club Mobile League

## 개요
모바일 전용 테니스 리그 관리 웹앱과 FastAPI 백엔드를 담은 모노리포 템플릿입니다. 기본 데이터베이스는 SQLite이며 `.env`를 통해 다른 RDB로 손쉽게 전환할 수 있습니다. 관리자(`role="admin"`)는 리그·경기·대진표를 관리하고 일반 회원(`role="member"`)은 참가 신청과 경기 확인을 수행합니다.

## 기술 스택
- **Backend** FastAPI, SQLAlchemy, Pydantic, SQLite
- **Frontend** React, Vite, TypeScript, Tailwind CSS
- **Testing & Tooling** Pytest, Vitest, npm, uvicorn, Node.js 18+, Python 3.11+

## 프로젝트 구조
- **`api/`** FastAPI 엔드포인트, 서비스 로직, SQLAlchemy 모델
- **`web/`** 모바일 퍼스트 React UI 및 상태 관리 코드
- **`scripts/`** 샘플 데이터 시드 및 유지보수 스크립트
- **`styles/`** 디자인 토큰과 공용 스타일 자원
- **`tests/`** 백엔드 및 프론트엔드 테스트 수트

## 필수 설정

1. 환경 변수 템플릿 복사
   ```bash
   cp .env.example .env
   ```
2. Python 가상 환경 생성 및 패키지 설치
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r api/requirements.txt
   ```
3. Node.js 의존성 설치
   ```bash
   cd web
   npm install
   ```

## 로컬 실행

### API (FastAPI)
```
source .venv/bin/activate
uvicorn api.main:app --reload --port 8200
```
- 기본 포트는 `8200`
- SQLite 데이터 파일은 `tennis_club.db`
- 관리자 생성 예시: `POST /members` 요청 body에 `"role": "admin"` 포함

### Web (React + Vite)
```
cd web
npm run dev
```
`.env`의 `VITE_API_BASE_URL` 값에 맞춰 API 프록시가 설정됩니다(기본값: `http://localhost:8200`). Vitest 실행 시에는 WebSocket 포트 제한을 피하기 위해 `CI=1` 플래그를 사용하세요.

## 주요 기능 흐름

- **회원**: `POST /members`로 등록 → `POST /leagues/{id}/applications`로 참가 신청
- **관리자**: 리그 생성 시 자동 대진표 여부와 그룹/코트 수 설정 → 신청 인원 충족 시 자동 대진표 생성 또는 `POST /leagues/{id}/bracket`으로 수동 생성 → 필요시 `POST /leagues/{id}/matches`로 개별 경기 추가(`admin_id` 필수)

### 로그인

- 기본 관리자 계정은 `admin / admin`이며, 로그인 화면에서 관리자 모드를 선택하면 됩니다. 최초 로그인 시 자동으로 `admin@tennis.club` 계정이 생성됩니다.
- 일반 회원은 이름/이메일/레벨만 입력하면 계정이 생성되며, 재로그인 시 동일 정보를 입력하면 기존 계정이 복구됩니다. 로그인 화면의 샘플 계정 버튼을 눌러 곧바로 테스트할 수도 있습니다.
- 새 프로젝트 초기 세팅 시 샘플 계정을 미리 주입하려면 `python scripts/seed_sample_members.py`를 실행하세요.

자동 생성 시 신청 인원이 `max_participants`에 도달하면 신청 순서대로 그룹에 배정되고, 코트 수만큼 경기가 분산됩니다. 대진표는 `/leagues/{id}/matches`에서 확인할 수 있으며, 프론트엔드 관리자 화면에서도 생성/확인 가능합니다.

## 테스트

- 프론트엔드: Vitest (`CI=1` 플래그 필수)
  ```bash
  cd web
  CI=1 npm run test -- --run
  ```
- 백엔드: Pytest (임시 SQLite DB 사용)
  ```bash
  source .venv/bin/activate
  python -m pytest
  ```

## Render 배포 가이드

### 1. render.yaml 템플릿
레포 루트에 `render.yaml` 파일을 생성하여 인프라 구성을 선언적으로 관리할 수 있습니다.

```yaml
services:
  - type: web
    name: tennis-club-api
    plan: free
    rootDir: api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn api.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false  # Render Dashboard에서 Postgres 연결 문자열 입력
  - type: static
    name: tennis-club-web
    plan: free
    rootDir: web
    buildCommand: npm install && npm run build
    publishPath: dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://tennis-club-api.onrender.com
```

> `sync: false`는 민감한 값을 Git에 올리지 않고 Render 대시보드에서 수동으로 관리하겠다는 의미입니다. 프론트엔드 서비스의 `VITE_API_BASE_URL` 값은 실제 배포된 API 도메인으로 교체하세요.

### 2. 백엔드(Web Service) 설정
1. Render 대시보드에서 **New +** → **Web Service** → GitHub 레포 선택
2. `Root Directory`를 `api`로 설정
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
5. Python 버전은 3.11 이상으로 지정
6. **Environment Variables**
   - `DATABASE_URL`: Render PostgreSQL 인스턴스 생성 후 제공되는 URL 입력
   - 필요 시 `ALLOWED_ORIGINS` 등의 추가 변수로 CORS 제한 가능

> SQLite는 Render의 에페메럴 디스크 특성상 재시작 시 데이터가 사라집니다. 운영용 DB는 Render PostgreSQL 또는 외부 RDS를 권장합니다.

### 3. 프론트엔드(Static Site) 설정
1. Render 대시보드에서 **New +** → **Static Site** → 동일 레포 선택
2. `Root Directory`를 `web`으로 설정
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Environment Variables
   - `VITE_API_BASE_URL`: 배포된 FastAPI 서비스 URL (예: `https://tennis-club-api.onrender.com`)

### 4. 도메인 및 HTTPS
- Render가 제공하는 기본 도메인을 사용하거나, 커스텀 도메인을 연결하려면 DNS에 CNAME 레코드를 추가합니다.
- Static Site와 Web Service 모두 자동으로 HTTPS 인증서가 발급됩니다.

### 5. CI/CD 파이프라인
- `render.yaml`을 커밋하면, Render에서 **Infrastructure as Code** 옵션을 활성화할 때 자동으로 서비스 구성이 갱신됩니다.
- GitHub main 브랜치에 새로운 커밋이 푸시되면 백엔드와 프론트엔드가 각각 자동으로 재배포됩니다.

## TODO

- [ ] **문서화** `TOURNAMENT_FEATURES.md` 내용을 `README.md` 주요 기능 섹션과 동기화
- [ ] **테스트 보강** `tests/api/`에 리그 자동 대진표 생성 시나리오 추가
- [ ] **프런트 성능** `web/src/features/league/` 렌더링 최적화 및 lazy loading 도입 검토
- [ ] **CI 구축** GitHub Actions 워크플로로 Pytest/Vitest 병렬 실행 구성
- [ ] **배포 자동화** Dockerfile 추가 및 staging 배포 스크립트 작성
