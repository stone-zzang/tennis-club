# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tennis Club Mobile League is a mobile-first web application for managing tennis leagues. It's a monorepo with a React + TypeScript frontend (`web/`) and a FastAPI backend (`api/`) using SQLite by default.

The app has two user roles:
- **Admins** (`role="admin"`): Create leagues, generate brackets, and manage matches
- **Members** (`role="member"`): Apply to leagues and view their schedules

## Development Commands

### Backend (FastAPI)

```bash
# Setup
python -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt

# Run database migration (if upgrading existing DB)
python scripts/migrate_add_match_scores.py

# Run development server
source .venv/bin/activate
uvicorn api.main:app --reload --port 8200

# Run tests
python -m pytest                    # All tests
pytest --cov=api                    # With coverage
```

The API runs on port 8200 by default. Database file is `tennis_club.db` at the project root.

### Frontend (React + Vite)

```bash
# Setup
cd web
npm install

# Run development server
npm run dev                         # Runs on port 5173

# Build and preview
npm run build                       # TypeScript compile + Vite build
npm run preview                     # Preview production build on port 4173

# Run tests
CI=1 npm run test -- --run          # Run all tests (CI=1 prevents WebSocket port issues)
npm run test:coverage               # Run with coverage
```

The `VITE_API_BASE_URL` environment variable (default: `http://localhost:8200`) controls the API connection.

### Utilities

```bash
# Seed sample data
python scripts/seed_sample_members.py   # Creates admin + 3 sample members
python scripts/seed_sample_league.py    # Creates sample league data
```

## Architecture

### Backend Structure

- `api/main.py`: FastAPI app initialization, CORS middleware, and all route handlers
- `api/db/models.py`: SQLAlchemy ORM models (League, Member, LeagueApplication, LeagueMatch)
- `api/db/session.py`: Database engine and session factory
- `api/services/`: Business logic layer, one service per domain:
  - `members.py`: Member registration and role management
  - `leagues.py`: League CRUD
  - `applications.py`: League application management
  - `matches.py`: Match creation and score submission
  - `brackets.py`: Preliminary round bracket generation
  - `rankings.py`: Group ranking calculation based on match results
  - `tournaments.py`: Tournament bracket generation from preliminary results
- `api/schemas/`: Pydantic request/response models
- `scripts/`: Database migration and seed scripts
- `tests/api/`: Integration tests using SQLite test database

### Frontend Structure

- `web/src/features/`: Feature-based organization:
  - `auth/`: Login flows (admin credentials vs member sign-up)
  - `league/`: League list, detail, application, and bracket views
  - `home/`: Dashboard/landing pages
- `web/src/components/`: Shared UI primitives
- `web/src/lib/`: API client and utilities
- `web/src/styles/`: Tailwind config and design tokens

State management uses Zustand. Routing uses React Router v6.

### Database Models

**League**: Has `auto_generate_bracket` flag, `groups_count`, `courts_count`, and `max_participants`. When applications reach max capacity and auto-generation is enabled, brackets are created automatically.

**Member**: Has `role` field (`"admin"` or `"member"`) and `level` for skill rating. Admins can change member roles via `PATCH /members/{id}/role`.

**LeagueApplication**: Links members to leagues with `status` (`"pending"` or `"scheduled"`). Has unique constraint on `(league_id, member_id)`.

**LeagueMatch**: Stores matches with:
- `round`: Round number (1 = preliminary, 2+ = tournament knockout)
- `group_number`: Group assignment for preliminary rounds
- `player_a`, `player_b`: Player names
- `court`: Court assignment
- `scheduled_at`: Match time
- `status`: Match state (`"scheduled"`, `"in_progress"`, `"completed"`)
- `score_a`, `score_b`: Match scores (nullable until completed)
- `winner`: Winner's name (auto-calculated from scores)
- `completed_at`: Completion timestamp

### Tournament Flow

The league system supports a two-stage competition:

#### 1. Preliminary Round (Round 1)
Located in `api/services/brackets.py`:
- Fetches all league applications ordered by `applied_at` (FIFO)
- Distributes players across groups using round-robin (`index % groups`)
- Within each group, pairs adjacent players (indices 0-1, 2-3, etc.)
- Assigns courts using round-robin across all matches
- Marks all applications as `status="scheduled"`
- Admin privileges required unless auto-generation is enabled

#### 2. Score Submission
Located in `api/services/matches.py`:
- Players/admins submit scores via `PATCH /matches/{match_id}/score`
- System automatically calculates winner based on scores
- Updates match `status` to `"completed"`
- Sets `completed_at` timestamp

#### 3. Ranking Calculation
Located in `api/services/rankings.py`:
- Calculates per-group standings based on completed matches
- Sorts by: wins (desc), point differential (desc), points scored (desc)
- Returns ranking data: wins, losses, points for/against, matches played, win rate
- Access via `GET /leagues/{league_id}/rankings?group_number={n}`

#### 4. Tournament Bracket Generation (Round 2+)
Located in `api/services/tournaments.py`:
- Takes top N players from each group (default: 2)
- Generates single-elimination tournament bracket
- Subsequent rounds created via `POST /leagues/{league_id}/tournament/advance`
- Winners advance automatically based on completed match scores
- Supports multi-round knockout progression

## Authentication & Authorization

### Admin Login
- Fixed credentials: `admin / admin`
- Creates or reuses account `admin@tennis.club` with `role="admin"`
- Frontend login screen has admin toggle

### Member Login
- Enter name, email, and level
- Automatically creates new account or retrieves existing by email
- Frontend has "sample account" quick-login buttons

### Authorization Rules
- Only admins can:
  - Create matches or trigger bracket generation
  - Generate tournament brackets from preliminary results
  - Change member roles
- Score submission is open to all users (members can submit their own scores)
- Bracket generation endpoints require `admin_id` in request body
- Admin checks are centralized in service layer `_require_admin()` methods

## Testing Guidelines

### Backend Tests
- Use pytest with SQLite in-memory database
- Tests live in `tests/api/`
- Run with `python -m pytest` from project root
- `pytest.ini` sets `pythonpath = .` for imports

### Frontend Tests
- Use Vitest with jsdom environment
- Tests colocated with features in `__tests__/` subdirectories
- Mock API calls with `vi.stubGlobal('fetch', ...)`
- Always run with `CI=1` flag to avoid WebSocket port conflicts

## Environment Configuration

`.env.example` shows required variables:
- `DATABASE_URL`: Database connection string (default: `sqlite:///./tennis_club.db`)
- `VITE_API_BASE_URL`: Frontend API endpoint (default: `http://localhost:8200`)

Copy `.env.example` to `.env` before running.

## Mobile-First Design

The app is designed for mobile viewports (390×844). Desktop is not a primary target. Use mobile preview when developing frontend features.
