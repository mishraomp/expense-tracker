# Expense Tracker - AI Agent Guidelines

This document provides guidelines for AI agents working on the Expense Tracker project.

---

## Project Overview

Full-stack personal finance application with:
- **Backend**: NestJS 11 + Prisma ORM + PostgreSQL
- **Frontend**: React 19 + TypeScript + TanStack (Query/Router/Table) + Bootstrap 5 + Sass
- **Auth**: Keycloak-based JWT authentication
- **Testing**: Vitest for both frontend and backend
- **Documentation**: Markdown files and inline code comments
- **Dependency Management**: npm for both frontend and backend, with `package.json` files in each and latest stable versions of dependencies

---

## Technology Stack

### Backend (`backend/`)
| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 11.x | Modular API framework |
| Prisma | 7.x | ORM and database client |
| PostgreSQL | - | Primary database |
| Vitest | 4.x | Unit and contract tests |
| class-validator | 0.14.x | DTO validation |
| class-transformer | 0.5.x | DTO transformation |

### Frontend (`frontend/`)
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.9.x | Type safety |
| TanStack Query | 5.x | Data fetching and caching |
| TanStack Router | 1.x | Type-safe routing |
| TanStack Table | 8.x | Data tables |
| Bootstrap | 5.3.x | Styling framework |
| Sass | - | CSS preprocessing |
| D3 | 3.x | Data visualization |
| Vitest | 4.x | Unit tests |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker Compose | Service orchestration |
| Keycloak | Identity provider |
| GitHub Actions | CI/CD (in `.github/`) |

---

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use async/await over raw Promises
- Export types/interfaces separately from implementations
- Always use 2 space for indentation
- Use CamelCase for naming
- 


### CSS/Styling - CRITICAL RULES
1. **Use `rem` or `em` units ONLY** - Never use `px` values
2. **All custom CSS must be in CSS/SCSS files** - No inline styles in components
3. **Prefer Bootstrap classes** over custom CSS where possible
4. **Must be responsive** for all screen sizes - test at mobile, tablet, and desktop breakpoints

CSS utilities are centralized in `frontend/src/styles/theme.scss`. Add new utility classes there instead of using inline styles.

**Exception**: Dynamic values that come from the database (e.g., user-defined colors) or calculated values (e.g., progress bar widths) may use inline styles.

### Backend Conventions
- One module per domain entity (categories, expenses, incomes, etc.)
- DTOs for all request/response payloads
- Use `class-validator` decorators for validation
- Controllers should be thin; business logic in services
- Use Prisma for all database operations

### Frontend Conventions
- Feature-based folder structure under `src/features/`
- Shared components in `src/components/`
- API calls through services in `src/services/`
- State management with Zustand stores in `src/stores/`
- Forms using React Hook Form

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── src/
│   │   ├── modules/          # Domain modules (expenses, incomes, etc.)
│   │   ├── common/           # Shared utilities, guards, decorators
│   │   ├── prisma/           # Prisma service
│   │   └── cron/             # Scheduled jobs
│   ├── tests/
│   │   ├── unit/             # Unit tests
│   │   └── contract/         # Contract/integration tests
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── migrations/           # SQL migrations (V*.sql files)
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── features/         # Feature modules (auth, expenses, reports)
│   │   ├── services/         # API client services
│   │   ├── stores/           # Zustand state stores
│   │   ├── styles/           # Global SCSS (theme.scss)
│   │   └── types/            # Shared TypeScript types
│   └── tests/
│       ├── unit/             # Component unit tests
│       └── e2e/              # End-to-end tests
├── docker/                   # Docker configurations
├── specs/                    # Feature specifications and ADRs
└── load-tests/               # k6 performance tests
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | Database models definition |
| `frontend/src/styles/theme.scss` | Global CSS utilities and theme |
| `docker-compose.yml` | Service definitions |
| `manage-services.ps1` | PowerShell script for Docker management |
| `.github/agents/` | Speckit agents for automated workflows |

---

## Commands Reference

### Backend
```powershell
cd backend
npm install          # Install dependencies
npm run start:dev    # Start in development mode
npm test             # Run all tests
npm run test:cov     # Run tests with coverage
npm run lint         # Lint and fix
npm run format       # Format code with Prettier
npx prisma generate  # Regenerate Prisma client
npx prisma migrate dev --name <name>  # Create migration
```

### Frontend
```powershell
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm test             # Run all tests
npm run test:cov     # Run tests with coverage
npm run lint         # Lint and fix
npm run format       # Format code with Prettier
npm run build        # Production build
```

### Docker Services
```powershell
./manage-services.ps1 start   # Start Postgres + Keycloak
./manage-services.ps1 stop    # Stop services
./manage-services.ps1 logs    # Tail service logs
./manage-services.ps1 status  # Check service health
```

---

## Testing Guidelines

### Backend Tests
- Place unit tests in `backend/tests/unit/`
- Place contract/integration tests in `backend/tests/contract/`
- Use `TestPrismaService` from `tests/test-prisma.service.ts` for database tests
- Mock external services (Keycloak, file system) appropriately

### Frontend Tests
- Place unit tests in `frontend/tests/unit/`
- Use Testing Library conventions (`@testing-library/react`)
- Test user interactions and accessibility
- Prefer `getByRole`, `getByLabelText` over `getByTestId`

### Running Tests
```powershell
# Backend
cd backend; npm test

# Frontend
cd frontend; npm test
```

---

## Git Workflow

1. Create feature branch from `main`: `git switch -c feature/<name>`
2. Make changes following code style guidelines
3. Run tests and linting before committing
4. Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code refactoring
   - `docs:` for documentation
   - `test:` for test changes
   - `style:` for formatting/styling
   - `chore:` for maintenance tasks
5. Create PR with description
6. Merge to `main` after review

---

## Database Migrations
1. Always use FLYWAY first approach within docker
1. generate `backend/prisma/schema.prisma` using db pull cli command.
2. Generate Prisma client: `npx prisma generate`
4. SQL migrations are stored in `backend/migrations/` with version prefix (e.g., `V2.6.0__performance_indices.sql`)
5. Follow Flyway best practices while crafting flyway migration files.

---

## Environment Variables

### Backend
- `DATABASE_URL` - Prisma connection string
- `KEYCLOAK_URL` - Keycloak base URL
- `KEYCLOAK_REALM` - Realm name
- `KEYCLOAK_CLIENT_ID` - Client ID
- `KEYCLOAK_CLIENT_SECRET` - Client secret (if confidential)
- `PORT` - Server port

### Frontend (Vite)
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_KEYCLOAK_URL` - Keycloak URL
- `VITE_KEYCLOAK_REALM` - Realm name
- `VITE_KEYCLOAK_CLIENT_ID` - Client ID

---

## Accessibility Requirements

- All form inputs must have labels
- Interactive elements must have ARIA attributes
- Charts must include `<title>` and `<desc>` elements
- Modals must trap focus and handle escape key
- Color contrast must meet WCAG AA standards

---

## Performance Considerations

- Memoize table column definitions (TanStack Table)
- Use React Query for data caching
- D3 charts use `viewBox` for responsive scaling
- Consider virtualization for large lists

---

## Common Patterns

### Adding a New Backend Endpoint
1. Create/update DTO in `modules/<module>/dto/`
2. Add service method in `modules/<module>/<module>.service.ts`
3. Add controller route in `modules/<module>/<module>.controller.ts`
4. Add unit test in `tests/unit/<module>/`
5. Update Swagger decorators for API documentation

### Adding a New Frontend Feature
1. Create feature folder under `src/features/<feature>/`
2. Add API service in `src/services/`
3. Add types in `src/types/` or feature folder
4. Create components in feature folder
5. Add route in `src/routes/`
6. Add unit tests in `tests/unit/`

### Adding a New CSS Utility
1. Add class to `frontend/src/styles/theme.scss`
2. Use rem/em units (1rem = 16px base)
3. Follow existing naming conventions
4. Consider responsive breakpoints

---

## Troubleshooting

### Prisma Issues
```powershell
cd backend
npx prisma generate  # Regenerate client
npx prisma db push   # Push schema to DB (dev only)
```

### Port Conflicts
- Backend: 3000
- Frontend: 5173
- PostgreSQL: 5432
- Keycloak: 8080

### Docker Issues
```powershell
./manage-services.ps1 stop
docker compose down -v  # Remove volumes
./manage-services.ps1 start
```

---

## Additional Resources

- Feature specifications: `specs/` directory
- ADRs (Architecture Decision Records): `specs/*/adr-*.md`
- Agent configurations: `.github/agents/`
- Load test documentation: `load-tests/README.md`
