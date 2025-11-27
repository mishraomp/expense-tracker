# Expense Tracker

Modern full-stack personal expense & income tracking application with reporting, budgeting primitives, subcategory analytics, import/export, tagging and Keycloak-backed authentication. Built using TypeScript/NestJS backend and React (Vite) frontend. Focused on developer ergonomics, accessibility, and real-world features (tags, filters, reports).

---
## Quick Links
- Project: https://github.com/mishraomp/expense-tracker
- Roadmap & Specs: `specs/`

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
9. Managing Services
10. Data Model Summary
11. Reports & Analytics
12. Import & Export
13. Testing
14. Accessibility & UI
15. Performance & Notes
16. Roadmap
17. Contributing
18. License

---
## 1. Overview
Expense Tracker helps manage personal finances by storing expenses and incomes in a structured way. The app provides category/subcategory organization, tag-based filtering, multi-field table sorting, CSV import/export, and charts for reporting.

This README documents the current, implemented behavior. Sections indicate features implemented vs. in-progress.

---
## 2. Core Features (Implemented)
- Expense & Income CRUD endpoints and UI
- Tagging: create tags per user and associate them with expenses (backend models + frontend Tag UI)
- Category & Subcategory management
- Multi-field sorting on the Expenses table (default: Amount desc, Date desc) using TanStack Table
- Filters: category, subcategory, tag filters, item name, date range
- Pagination and totals with server-side pagination
- CSV import pipeline with De-duplication migration/logic
- Reports: Yearly/Monthly Income vs Expense chart and drill-down subcategory pie
- Attachments: Uploads and linking to expenses
- Authentication: Keycloak + token refresh (frontend/backed guards)

Partially implemented / In-progress
- Budgeting: data models include `budgetAmount` and `budgetPeriod`, with UI and analytics planned
- Budget variance & alerts: ideas on roadmap

---
## 3. Architecture & Folder Structure
High-level layout (truncated):
```
expense-tracker/
├── backend/          # NestJS + Prisma
├── frontend/         # React, Vite
├── docker/           # Docker compose + Keycloak realm
├── specs/            # design docs and ADRs
└── manage-services.ps1
```

Notable modules:
- Backend: `modules/categories`, `modules/subcategories`, `modules/expenses`, `modules/incomes`, `modules/tags`, `modules/import`, `modules/export`, `modules/users`
- Frontend: `src/features/expenses`, `src/features/reports`, `src/components/tags`, `src/stores`.

---
## 4. Tech Stack
- Backend: NestJS 11, Prisma 7, PostgreSQL, Vitest
- Frontend: React 19, TypeScript, Vite, TanStack Query/Table/Router, React Hook Form, Bootstrap 5, Sass, D3
- Dev Tools: Docker Compose, PowerShell helpers, GitHub Actions

---
## 5. Local Development Setup
Prereqs: Node.js (LTS), Docker Desktop, PowerShell 5.1+ (on Windows)

Start services (Postgres, Keycloak):
```powershell
./manage-services.ps1 start
```

Backend (development):
```powershell
cd backend
npm install
npm run start:dev
```

Frontend (development):
```powershell
cd frontend
npm install
npm run dev
# Visit http://localhost:5173
```

---
## 6. Environment Variables
Typical vars (use `.env` or pass via Docker Compose):
- `DATABASE_URL` – Prisma Postgres connection
- `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
- `PORT` – Backend port
- Frontend Vite envs: `VITE_API_BASE_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`

Never commit secrets to the repository. Use a `.env.example` if helpful.

---
## 7. Database & Migrations
The project uses Prisma as the canonical schema source under `backend/prisma/schema.prisma`.
- Apply/Generate migrations locally with:
```powershell
cd backend
npx prisma generate
npx prisma migrate dev --name <name>
```

The project also contains SQL migrations in `backend/migrations/`. The repository includes a migration for tags (`V2.8.0__expense_tags.sql`).

---
## 8. Authentication (Keycloak)
Keycloak is used as the Identity Provider. The realm export and sample configuration are available in `docker/keycloak/export/realm-export.json`.
- Frontend: Keycloak JS adapter + silent SSO
- Backend: NestJS guards and token validation

---
## 9. Managing Services
Use the provided PowerShell helper for a simple developer start/stop:
```powershell
./manage-services.ps1 start
./manage-services.ps1 stop
./manage-services.ps1 logs
```

---
## 10. Data Model Summary
Key entities (Prisma):
- `User`
- `Category` (color, budgets)
- `Subcategory` (nested under Category)
- `Expense` (amount, date, category/subcategory, tags, attachment links)
- `Income`
- `Tag` (per-user tags for flexible filtering)
- `ImportSession'`

Notes: Recurring expenses are implemented by generating multiple expense rows at creation (no separate Recurrence entity). Budgeting fields exist, and UI/analytics are planned.

---
## 11. Reports & Analytics
Implemented:
- Yearly / Monthly Income vs Expense bar chart
- Click a month to drill-down into a subcategory pie chart
- D3 charts include accessible semantics (`<title>` and `<desc>`)

---
## 12. Import & Export
CSV import pipeline exists with import session tracking. Deduplication logic has been implemented (`V2.2.0__expense_dedup.sql`). Export helpers produce CSV for selected time ranges.

---
## 13. Testing
Run tests locally for each side:
```powershell
cd backend; npm test
cd ../frontend; npm test
```

Backend uses Vitest + in-memory mocks for many unit tests. Frontend uses Vitest + Testing Library.

---
## 14. Accessibility & UI
- UI uses Bootstrap + custom Sass utilities in `frontend/src/styles/theme.scss`.
- ARIA attributes and keyboard focus handling for dialogs.

---
## 15. Performance & Notes
- Memoize table columns; TanStack Table recommended patterns are used
- The Expense table supports multi-column sorting (primary: amount desc, secondary: date desc) and server-side pagination to scale lists
- D3 charts use `viewBox` for responsive scaling

---
## 16. Roadmap / Ideas
- Budget CRUD and variance insights
- Per-subcategory alerts (budget thresholds)
- Multi-currency support (future)
- Export charts as PDF/PNG

---
## 17. Contributing
1. Fork & clone
2. Make a branch: `git switch -c feature/...`
3. Run services, implement code & tests
4. Lint & format: `npm run lint`, `npm run format`
5. Open PR and include screenshots for UI changes

---
## 18. License
See `LICENSE` in the repository root.

---
If you find issues, please open an Issue on GitHub. Enjoy!
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
This project is a practical, work‑in‑progress personal finance app. You can add expenses and incomes, organize them under categories and subcategories, and view a yearly **Income vs Expense** chart with a drill‑down pie for any month. Import sessions, exports, and color‑coded categories are already in place. Some things (like recurring expenses and fuller budgeting) are only partially implemented or are still ideas; they are called out clearly below so nothing is overstated.
	src/                NestJS modules
	prisma/             Prisma schema & migrations
	migrations/         SQL migrations (versioned)
## 2. Core Features (Implemented vs Planned)
Implemented (verified in code):
- Expense CRUD (`backend/src/modules/expenses/`, Prisma `Expense` model).
- Income CRUD (`backend/src/modules/incomes/`, Prisma `Income` model).
- Category & Subcategory management (`categories/`, `subcategories/` modules; Prisma models have `colorCode`).
- Year-to-date Income vs Expense chart with month drill‑down (`frontend/src/features/reports/components/IncomeVsExpenseReport.tsx`).
- Full‑screen subcategory breakdown pie modal (`SubcategoryBreakdownModal.tsx`) with dollars + percentages.
- Import sessions (`ImportSession` model) and basic CSV import path (`import` module) plus export scaffolding (`export` module).
- Deduplication migration (`migrations/V2.2.0__expense_dedup.sql`).
- Keycloak authentication (realm export + guards `jwt-auth.guard.ts`, `keycloak-auth.guard.ts`).
- Color assignment for chart slices (logic in D3 pie / chart components).
- Responsive React + Bootstrap + Sass styling.
- Accessibility touches: ARIA labels on modals, charts provide `<title>` and `<desc>`; form inputs have labels.

Partially implemented / Planned:
- Recurring expenses: UI fields exist in `ExpenseForm.tsx` but Prisma `Expense` currently has no recurrence columns—feature not persisted yet.
- Budget tracking: `budgetAmount` and `budgetPeriod` exist on Category/Subcategory models; no exposed UI or calculations yet.
- Role / scope enforcement beyond basic auth: not yet present.
- Advanced exports (PDF, images) – future idea.

Notable backend modules (under `backend/src/modules/`):
- `categories`, `subcategories`, `expenses`, `incomes`, `reports`, `import`, `export`, `users`

Frontend domain segmentation (under `frontend/src/features/`):
- `auth`, `expenses`, `reports`, `import`, `subcategories`, etc.

---
./manage-services.ps1 start     # spins up Postgres + Keycloak (and optionally builds images)
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
## 10. Data Model Summary (High-Level)
Key entities (Prisma models):
- `User` – basic profile + preferences (date format, currency) and link to Keycloak subject.
- `Category` – may include color + optional budget fields (`budgetAmount`, `budgetPeriod`).
- `Subcategory` – nested under Category; also optional budget fields.
- `Expense` – amount, date, description, links to user/category/subcategory; NO recurrence fields yet.
- `Income` – amount, date, source, frequency, optional recurrence flag.
- `ImportSession` – tracks file import attempts and their status.
- `FinancialConnection` – placeholder for external account linking (future expansion).

Budget and recurring expense logic: only structural fields (budget) exist; recurrence for expenses is UI-only at this time.
# Backend
cd backend
Implemented:
- Monthly Income vs Expense bar chart (locked to current year; domain uses string YYYY-MM for timezone stability).
- On-click month ➜ full-screen subcategory pie modal (shows % + dollar value).
- Color palette logic for slices (defaults + fallback hue generation).
- Accessible chart semantics (`<title>`, `<desc>`, legend group, focusable paths).

# Frontend
cd ../frontend
npm install
CSV import pipeline: uploaded file staged in `backend/uploads/` (gitignored). Import sessions tracked in DB. Export module present (implementation scope subject to expansion). Deduplication migration (`V2.2.0__expense_dedup.sql`) reduces duplicates.
npm run dev     # visits http://localhost:5173
```
Backend:
- Contract test example (`backend/src/tests/contract/reports.spec.ts`).
- Vitest configuration (`backend/vitest.config.ts`).
Frontend:
- Vitest + Testing Library setup (`frontend/tests/setup.ts`).
Current coverage is limited; more tests welcome.

-- Expenses table: logic isolated in an inner component to stabilize column definitions
-- Recurring expenses (persisted model fields) and richer recurrence handling
-- Recurring incomes enhancements
./manage-services.ps1 rebuild
```
## 18. License
See `LICENSE` in the repository root.
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