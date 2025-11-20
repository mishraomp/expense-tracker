# Expense Tracker

Modern full-stack personal expense & income tracking application with reporting, budgeting, subcategory analytics, import/export, and Keycloak-backed authentication. Built with a TypeScript/NestJS backend and a React (Vite) frontend. Designed for extensibility, accessibility, and a pleasant developer experience.

---
## Table of Contents
1. Overview
2. Core Features
3. Architecture & Folder Structure
4. Tech Stack
5. Local Development Setup
6. Environment Variables
7. Database & Migrations
8. Authentication (Keycloak)
9. Managing Services (Script Usage)
10. Data Model Summary
11. Reports & Analytics
12. Import & Export
13. Testing
14. Accessibility & UI Considerations
15. Performance & Quality Notes
16. Roadmap / Ideas
17. Contributing
18. License

---
## 1. Overview
This application helps manage personal finances by storing expenses and incomes, organizing them into categories and subcategories, and generating insightful analytics (monthly income vs expense, subcategory breakdown, budgeting hints). It supports CSV import/export and aims to keep the workflow fast and transparent.

Key goals:
- Fast iteration and clear module boundaries in the backend (NestJS + Prisma).
- Reactive, chart-driven UI with D3 for visualization.
- Extensible auth (Keycloak; can later add other identity providers).
- Developer ergonomics: typed APIs, contract-based tests, modular services.

---
## 2. Core Features
- Expense & Income CRUD
- Recurring expenses (frequency + count)
- Categories & Subcategories management
- Monthly Income vs Expense bar chart (click a month ➜ subcategory pie)
- Subcategory breakdown modal (full screen with dollar & percent values)
- Unique color assignment for categories/subcategories
- CSV import & export pipeline
- Budget tracking primitives (ready for future enhancements)
- Keycloak-based JWT authentication & optional Keycloak guard
- Responsive layout with Bootstrap + custom Sass
- A11y: ARIA labels, focus management, descriptive modal semantics

---
## 3. Architecture & Folder Structure

Root layout (truncated example):
```
backend/
	src/                NestJS modules
	prisma/             Prisma schema & migrations
	migrations/         SQL migrations (versioned)
	docker/             Backend Dockerfile
frontend/
	src/                React application (features, components, services)
	docker/             Frontend Dockerfile + Nginx config
docker/
	keycloak/           Realm export & IDP config scripts
	postgres/           Initialization SQL
specs/                Specs, plans, research, OpenAPI definitions
manage-services.ps1   Helper script to start/stop core services
docker-compose.yml    Dev compose (Postgres, Keycloak, app layering)
```

Notable backend modules (under `backend/src/modules/`):
- `categories`, `subcategories`, `expenses`, `reports`, `import`, `export`, `users`

Frontend domain segmentation (under `frontend/src/features/`):
- `auth`, `expenses`, `reports`, `import`, `subcategories`, etc.

---
## 4. Tech Stack
Backend:
- NestJS (modular architecture)
- Prisma ORM + PostgreSQL
- Keycloak (Auth / Identity Provider)
- Vitest (tests)

Frontend:
- React 19 + TypeScript
- TanStack Query / Router / Table
- D3 (charts)
- Vite (bundling) + Rolldown variant
- React Hook Form (forms)
- Bootstrap 5 + Sass (styling)

DevOps / Tooling:
- Docker / Docker Compose
- manage-services PowerShell script
- GitHub (remote repository)

---
## 5. Local Development Setup
Prerequisites:
- Node.js (LTS recommended)
- Docker Desktop
- PowerShell 5.1+ (Windows) or compatible shell

Steps:
```powershell
# From repo root
.\n+.\n+./manage-services.ps1 start     # spins up Postgres + Keycloak (and optionally builds images)

# Backend
cd backend
npm install
npx prisma generate
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev     # visits http://localhost:5173
```

Stop services:
```powershell
./manage-services.ps1 stop
```

Rebuild containers:
```powershell
./manage-services.ps1 rebuild
```

---
## 6. Environment Variables
Typical variables (define in `.env` files or docker-compose):
- `DATABASE_URL` – Prisma connection string (Postgres)
- `KEYCLOAK_URL` – Base URL of Keycloak
- `KEYCLOAK_REALM` – Realm name
- `KEYCLOAK_CLIENT_ID` – Frontend client id
- `KEYCLOAK_CLIENT_SECRET` – (if using confidential client) for backend service-to-service
- `PORT` – Backend port (NestJS)

Frontend may rely on vite-style env: `VITE_API_BASE_URL`, `VITE_KEYCLOAK_REALM`, etc.

Never commit secrets; sample values can be added to a `.env.example` in the future.

---
## 7. Database & Migrations
Two layers:
1. Prisma schema (`backend/prisma/schema.prisma`) – source of truth for model types.
2. Versioned SQL migrations in `backend/migrations/` (e.g., `V1.0.0__initial_schema.sql`).

Typical workflow:
```powershell
cd backend
npx prisma generate
npx prisma migrate dev --name add_field_example
```

To apply in containerized environment, Compose boot scripts run SQL from `docker/postgres/init.sql` or migrations directory depending on setup.

---
## 8. Authentication (Keycloak)
Keycloak container provides realm + clients:
- Realm export in `docker/keycloak/export/realm-export.json`.
- Script `configure-idps.sh` supports additional IdPs (future expansion).

Frontend uses Keycloak JS adapter for login, silent SSO check (`public/silent-check-sso.html`), token refresh, and attaches tokens to API calls.
Backend has guards:
- `jwt-auth.guard.ts` – internal JWT validation logic
- `keycloak-auth.guard.ts` – Keycloak token assertions

Paths requiring auth should use NestJS decorators to enforce roles/scopes (extend as needed).

---
## 9. Managing Services (Script Usage)
`manage-services.ps1` orchestrates Docker Compose commands:
- `start` – up Postgres + Keycloak (+ optionally builds images)
- `stop` – stops containers
- `logs` – tails logs
- `status` – reports health

This centralizes command complexity for a smoother onboarding.

---
## 10. Data Model Summary (High-Level)
Key entities:
- `User` – Auth principal (from Keycloak; mapped internally)
- `Category` – Top-level classification (color-coded)
- `Subcategory` – More granular classification
- `Expense` – { amount, date, categoryId, optional subcategoryId, description, recurring meta }
- `Income` – { amount, date, description }
- `Budget` – (Future) per category/subcategory/time span

Relationships:
- Category 1—N Subcategories
- Category 1—N Expenses
- Subcategory 1—N Expenses (optional link)

---
## 11. Reports & Analytics
Implemented:
- Monthly Income vs Expense bar chart (domain normalized to avoid timezone skew)
- On-click month ➜ full-screen subcategory pie modal (with % + $ value)
- Automatic color palette assignment for visual consistency
- Accessible chart semantics (title/desc/legend roles)

Potential upcoming:
- Trend lines (rolling average spending)
- Budget variance overlays
- Export of charts as PNG/SVG

---
## 12. Import & Export
CSV import pipeline: staging uploaded file in `backend/uploads/` (excluded from git except placeholder).
Export modules generate CSV representations of expenses/incomes for a selected time range.
Deduplication logic (`V2.2.0__expense_dedup.sql`) reduces duplicate records on import.

---
## 13. Testing
Backend:
- Contract tests (e.g., `tests/contract/reports.spec.ts`)
- Vitest config (`backend/vitest.config.ts`)
Frontend:
- Vitest + Testing Library (`frontend/tests/setup.ts`)
- Ensure component accessibility & rendering for key flows (expand coverage over time)

Run tests:
```powershell
cd backend
npm test

cd ../frontend
npm test
```

---
## 14. Accessibility & UI Considerations
- Modal overlay opacity tuned for readability
- ARIA attributes on interactive elements and charts
- Keyboard focus retention on modal open/close
- Color choices aimed at acceptable contrast; future improvement: theme switcher & WCAG audit

---
## 15. Performance & Quality Notes
- Memoization of table columns (TanStack Table) to reduce React re-renders
- Refactored Expenses table to isolate `useReactTable` in an inner component
- D3 charts use `viewBox` + responsive container for scaling
- Potential improvement: virtualization for large expense lists

---
## 16. Roadmap / Ideas
- Budgets CRUD + variance insights
- Recurring incomes (mirror recurring expenses)
- Tagging system (beyond subcategories)
- Multi-currency support
- Export to PDF report summaries
- User preferences (theme, default filters)
- API rate limiting & audit logging

---
## 17. Contributing
Steps:
1. Fork & clone
2. Create feature branch: `git switch -c feature/xyz`
3. Run services & implement changes
4. Add/adjust tests
5. Lint & format:
	 ```powershell
	 npm run lint
	 npm run format
	 ```
6. Commit with conventional style (e.g., `feat: add budget variance endpoint`)
7. Open PR with description & screenshots for UI changes.

Please discuss larger changes via Issues before starting.

---
## 18. License
This project currently includes a `LICENSE` file (inserted via upstream initial commit). Review and adjust if distributing broadly.

---
## Appendix: Handy Commands
```powershell
# Regenerate Prisma client
cd backend
npx prisma generate

# Re-seed (adjust script if available)
# npx prisma db seed

# Start all (from root)
./manage-services.ps1 start

# Tail logs (example)
docker compose logs -f postgres
```

---
If you have suggestions or find issues, please open a GitHub Issue. Enjoy tracking your expenses smarter!