<<<<<<< HEAD
# tennis-club
땅땅리그
=======
# Tennis Club Mobile League

모바일 전용 테니스 리그 관리 웹앱과 FastAPI 백엔드를 위한 모노리포 템플릿입니다. 기본 데이터베이스는 SQLite이며 `.env`를 통해 다른 DB로 전환할 수 있습니다. 관리자(`role="admin"`)와 일반 회원(`role="member"`)의 역할이 분리되어 있으며, 관리자는 경기/대진표를 생성하고 회원은 참가 신청을 수행합니다.

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
>>>>>>> 021bbfb (Initial import)
