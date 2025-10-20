# Repository Guidelines

## Project Structure & Module Organization
- `web/` houses the mobile-first React + TypeScript client; group features under `web/src/features/<domain>` (e.g., `league/bracket`) and keep shared UI in `web/src/components/`.
- `api/` provides the FastAPI backend with services in `api/services/`, SQLAlchemy models in `api/db/models.py`, sessions in `api/db/session.py`, and response schemas in `api/schemas/`.
- Place environment samples in `.env.example` and copy to `.env` before running either tier; design tokens and icons live in `styles/` and `data/`.
- Integration suites sit in `tests/api/`; UI specs live beside components in `__tests__/`; utility scripts reside in `scripts/` (e.g., `seed_sample_members.py`).

## Build, Test, and Development Commands
- `cd web && npm install` then `npm run dev` to serve the mobile preview at 390×844.
- `npm run build` followed by `npm run preview` inside `web/` validates the production bundle.
- `CI=1 npm run test -- --run` executes Vitest suites without opening a WebSocket port.
- Activate the Python virtualenv, run `uvicorn api.main:app --reload --port 8200`, and point `VITE_API_BASE_URL` accordingly.
- `python -m pytest` or `pytest --cov=api` validates backend services against the SQLite test DB.

## Coding Style & Naming Conventions
- Prefer functional React components, hooks, camelCase props, and PascalCase component names; follow the `feature-action.component.tsx` pattern.
- Keep Tailwind utilities in recommended order; extract reused sets into `web/src/styles/tokens.css`.
- Backend code respects PEP 8, 4-space indents, snake_case functions, and explicit string Enums for roles and statuses; write concise, domain-focused docstrings.

## Testing Guidelines
- Co-locate Vitest specs in `__tests__/` using `describe('<Feature>')`; mock network calls via `vi.stubGlobal('fetch', ...)`.
- Add contract tests whenever API schemas change and update definitions under `api/schemas/`.
- Target ≥90% coverage for scheduling, bracket, and membership flows; flag temporary gaps in PR notes.
- Run `CI=1 npm run test -- --run` and `pytest --cov=api` before review requests.

## Commit & Pull Request Guidelines
- Keep commit messages present tense and under 72 characters (e.g., `Create bracket seeding hooks`).
- PRs summarize scope, design references, manual test steps, and attach mobile viewport screenshots or GIFs.
- Link work items with `Fixes #ID`; confirm both web and API pipelines pass or document any intentional failures.

## Environment & Access Tips
- Use `python scripts/seed_sample_members.py` to provision the admin and sample members; frontend quick-login buttons mirror these accounts.
- Admin login uses `admin / admin` (email `admin@tennis.club`); members join with name, email, and level, creating or restoring their profiles automatically.
