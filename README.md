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
## Infrastructure as Code (Terraform)

Terraform IaC (when enabled by feature specs under `specs/`) lives in:

- `infra/terraform/`

Common commands:

- Format: `terraform fmt -recursive`
- Validate/plan (single root + per-env tfvars):
	- `cd infra/terraform`
	- `terraform init`
	- `terraform validate`
	- `terraform plan -var-file=terraform.dev.tfvars`

---
## Release Artifacts (GHCR)

On every push to `main` (and on version tags like `v1.2.3`), GitHub Actions publishes Docker images to GHCR.

Images:
- Backend: `ghcr.io/<owner>/<repo>-backend`
- Frontend: `ghcr.io/<owner>/<repo>-frontend`

Tags:
- Commit SHA: `sha-<full_sha>` (immutable)
- Version tag (optional): `vX.Y.Z` (when pushing a git tag)

Rollback guidance:
- Pick a known-good commit SHA from a previous run and deploy that image tag (for example: `...-backend:sha-<full_sha>`).

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
- `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID_API`
- `PORT` – Backend port
- Frontend Vite envs: `VITE_API_URL`, `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`

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

### PR checklist (CI-equivalent)

Backend:
```powershell
cd backend
npm ci
npm run lint
npm run test:cov
```

Frontend:
```powershell
cd frontend
npm ci
npm run lint
npm run test:cov
```

Optional (when user journeys/auth are impacted):
```powershell
docker compose up -d --build
cd frontend
npm run e2e:install
$env:E2E_BASE_URL = "http://localhost:5173"; npm run e2e:ci
```

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
