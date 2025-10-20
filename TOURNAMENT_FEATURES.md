# 토너먼트 시스템 기능 추가

## 개요
기존 리그 관리 시스템에 **예선 → 본선 토너먼트** 흐름을 완성했습니다.

## 추가된 기능

### 1. 경기 점수 입력 시스템
**API 엔드포인트**: `PATCH /matches/{match_id}/score`

회원과 관리자 모두 경기 결과를 입력할 수 있습니다.

**요청 예시**:
```json
{
  "score_a": 21,
  "score_b": 18
}
```

**동작**:
- 점수 기반 승자 자동 계산
- 경기 상태를 `completed`로 변경
- 완료 시간 기록

### 2. 그룹별 순위 계산
**API 엔드포인트**: `GET /leagues/{league_id}/rankings?group_number={n}`

예선 경기 결과를 기반으로 그룹별 순위를 계산합니다.

**응답 예시**:
```json
[
  {
    "player_name": "홍길동",
    "group_number": 1,
    "wins": 3,
    "losses": 1,
    "points_for": 84,
    "points_against": 72,
    "points_diff": 12,
    "matches_played": 4,
    "win_rate": 0.75
  }
]
```

**정렬 순서**: 승수 → 득실차 → 득점 순

### 3. 토너먼트 대진표 생성
**API 엔드포인트**: `POST /leagues/{league_id}/tournament`

예선 결과를 기반으로 본선 토너먼트 대진표를 생성합니다.

**요청 예시**:
```json
{
  "admin_id": "admin-id-here",
  "courts_count": 2,
  "top_n_per_group": 2
}
```

**동작**:
- 각 그룹에서 상위 N명 선발
- 단일 토너먼트 대진표 생성 (round = 2)
- 코트별 시간 분산 배정

### 4. 토너먼트 라운드 진행
**API 엔드포인트**: `POST /leagues/{league_id}/tournament/advance`

현재 라운드 승자들을 다음 라운드로 진출시킵니다.

**요청 예시**:
```json
{
  "admin_id": "admin-id-here",
  "current_round": 2,
  "courts_count": 2
}
```

**동작**:
- 현재 라운드 완료된 경기에서 승자 추출
- 다음 라운드 대진표 자동 생성
- 결승까지 반복 가능

### 5. 관리자 권한 관리
**API 엔드포인트**: `PATCH /members/{member_id}/role`

관리자가 회원의 역할을 변경할 수 있습니다.

**요청 예시**:
```json
{
  "role": "admin",
  "admin_id": "admin-id-here"
}
```

## 데이터베이스 변경사항

### LeagueMatch 테이블 추가 필드:
- `status` (VARCHAR): 경기 상태 (scheduled/in_progress/completed)
- `score_a` (INTEGER): 선수 A 점수
- `score_b` (INTEGER): 선수 B 점수
- `winner` (VARCHAR): 승자 이름
- `completed_at` (DATETIME): 완료 시간

### 마이그레이션 실행:
```bash
python scripts/migrate_add_match_scores.py
```

## 새로운 서비스 모듈

1. **`api/services/rankings.py`**
   - `calculate_group_rankings()`: 그룹별 순위 계산
   - `get_top_players_per_group()`: 그룹별 상위 N명 추출

2. **`api/services/tournaments.py`**
   - `generate_tournament_bracket()`: 토너먼트 대진표 생성
   - `advance_tournament_round()`: 다음 라운드 진행

3. **`api/services/matches.py` (확장)**
   - `update_match_score()`: 점수 입력 및 승자 계산

4. **`api/services/members.py` (확장)**
   - `update_member_role()`: 회원 역할 변경

## 전체 토너먼트 흐름

```
1. 리그 생성 (관리자)
   POST /leagues

2. 회원 신청
   POST /leagues/{id}/applications

3. 예선 대진표 생성 (관리자 or 자동)
   POST /leagues/{id}/bracket

4. 예선 경기 진행 및 점수 입력 (회원/관리자)
   PATCH /matches/{match_id}/score

5. 그룹별 순위 확인
   GET /leagues/{id}/rankings

6. 토너먼트 대진표 생성 (관리자)
   POST /leagues/{id}/tournament

7. 토너먼트 경기 진행 및 점수 입력
   PATCH /matches/{match_id}/score

8. 다음 라운드 진행 (관리자)
   POST /leagues/{id}/tournament/advance

9. 7-8 반복하여 결승까지 진행
```

## 다음 단계

프론트엔드에서 다음 기능들을 구현해야 합니다:

1. **경기 점수 입력 UI**
   - 회원이 자신의 경기 점수를 입력할 수 있는 폼
   - 관리자 화면에서 모든 경기 점수 관리

2. **순위표 표시**
   - 그룹별 순위표 뷰
   - 승률, 득실차 등 상세 정보 표시

3. **토너먼트 대진표 UI**
   - 토너먼트 브라켓 시각화
   - 라운드별 경기 진행 상황

4. **관리자 패널 확장**
   - 회원 역할 관리
   - 토너먼트 단계 제어

## API 테스트

서버 실행:
```bash
source .venv/bin/activate
uvicorn api.main:app --reload --port 8200
```

API 문서 확인:
- http://localhost:8200/docs (Swagger UI)
- http://localhost:8200/redoc (ReDoc)
