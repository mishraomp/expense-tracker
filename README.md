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
10. Disaster Recovery
11. Data Model Summary
12. Reports & Analytics
13. Import & Export
14. Testing
15. Accessibility & UI
16. Performance & Notes
17. Roadmap
18. Contributing
19. License

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
- `RCLONE_REMOTE`, `RCLONE_BACKUP_FOLDER`, `BACKUP_RETENTION_DAYS` – disaster recovery, see § 10

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
## 10. Disaster Recovery
The `pg-backup` service backs up the **entire Postgres cluster** (`expense_tracker`, `keycloak`, and `metabase` — one `pg_dumpall`, not just the app database) to Google Drive via `rclone`, on a daily cron schedule with 7-day rotation, and can restore from any specific prior backup.

### One-time setup
1. Build the backup image once (and again after any change to `docker/postgres/backup/Dockerfile`, `backup.sh`, or `backup.cron`):
   ```powershell
   docker build -f docker/postgres/backup/Dockerfile -t expense-tracker-pg-backup:latest docker/postgres/backup
   ```
2. Configure Google Drive access — create `docker/postgres/backup/rclone.conf` **before** ever running `docker compose up -d pg-backup` (Docker/Podman otherwise creates an empty directory at that path instead of erroring). If you already have a working rclone remote from another project, just copy that file here — no need to repeat the browser OAuth flow. Otherwise, configure one fresh:
   ```powershell
   rclone config --config docker\postgres\backup\rclone.conf config
   ```
3. Set `RCLONE_REMOTE` in `.env` to whatever you actually named the remote (see § 6).

### Running backups
```powershell
./manage-services.ps1 start   # starts pg-backup with everything else; cron fires daily at 10:00 container time
```
Ad-hoc backup, without waiting for the schedule:
```powershell
docker compose run --rm pg-backup /scripts/backup.sh
```
Cadence tracks how often the container is actually running, not a guaranteed wall-clock schedule — same caveat as any dev-machine cron job.

### Listing and restoring
```powershell
docker compose run --rm pg-backup sh -c 'rclone lsf "$RCLONE_REMOTE:$RCLONE_BACKUP_FOLDER"'
docker compose run --rm pg-backup /scripts/backup.sh --restore --date=YYYY-MM-DD --yes
```
Restore pulls the file from Google Drive automatically if it isn't already present in `./backups`, and **replaces all three databases**. Omitting `--yes` prints a warning describing exactly what would be overwritten and exits without touching anything.

### What this deliberately does not cover
`ENCRYPTION_KEY` (decrypts stored Google Drive OAuth refresh tokens in the `user_drive_auth` table) is excluded from the automated backup on purpose — bundling a master key next to the data it decrypts is a needless blast-radius risk. Record it separately (e.g. a password manager). If it's ever missing or different after a restore, affected users simply need to reconnect their Google Drive — not a data-loss event, since their actual attachments remain safely in their own Drive regardless.

### Rotation
`backup.sh` deletes Drive backups older than `BACKUP_RETENTION_DAYS` (default 7) immediately after each successful upload — a failed upload never triggers rotation, and the newest backup can never prune itself. `scripts/cleanup-backups.ps1` separately handles local-disk `./backups` cleanup (also 7-day default) — unrelated to, and complementary with, the Drive-side rotation above.

---
## 11. Data Model Summary
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
## 12. Reports & Analytics
Implemented:
- Yearly / Monthly Income vs Expense bar chart
- Click a month to drill-down into a subcategory pie chart
- D3 charts include accessible semantics (`<title>` and `<desc>`)

---
## 13. Import & Export
CSV import pipeline exists with import session tracking. Deduplication logic has been implemented (`V2.2.0__expense_dedup.sql`). Export helpers produce CSV for selected time ranges.

---
## 14. Testing
Run tests locally for each side:
```powershell
cd backend; npm test
cd ../frontend; npm test
```

Backend uses Vitest + in-memory mocks for many unit tests. Frontend uses Vitest + Testing Library.

---
## 15. Accessibility & UI
- UI uses Bootstrap + custom Sass utilities in `frontend/src/styles/theme.scss`.
- ARIA attributes and keyboard focus handling for dialogs.

---
## 16. Performance & Notes
- Memoize table columns; TanStack Table recommended patterns are used
- The Expense table supports multi-column sorting (primary: amount desc, secondary: date desc) and server-side pagination to scale lists
- D3 charts use `viewBox` for responsive scaling

---
## 17. Roadmap / Ideas
- Budget CRUD and variance insights
- Per-subcategory alerts (budget thresholds)
- Multi-currency support (future)
- Export charts as PDF/PNG

---
## 18. Contributing
1. Fork & clone
2. Make a branch: `git switch -c feature/...`
3. Run services, implement code & tests
4. Lint & format: `npm run lint`, `npm run format`
5. Open PR and include screenshots for UI changes

---
## 19. License
See `LICENSE` in the repository root.

---
If you find issues, please open an Issue on GitHub. Enjoy!
