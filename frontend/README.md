# Expense Tracker Frontend

A React + TypeScript + Vite application for personal expense tracking.

## Quick Start

```bash
npm install
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Lint and fix |
| `npm run format` | Format with Prettier |
| `npm test` | Run unit tests |
| `npm run test:cov` | Unit tests with coverage |

---

## End-to-End (E2E) Testing

E2E tests use [Playwright](https://playwright.dev/) and live in `frontend/e2e/`.

### Prerequisites

1. **Backend + Keycloak running** — from project root:
   ```powershell
   ./manage-services.ps1 start
   cd backend && npm run start:dev
   ```
2. **Test user** — `e2etestuser` / `Password` (or set via env vars).

### Install Browsers

```bash
npm run e2e:install
```

### Run Tests

```bash
# Headless (default)
npm run e2e:run

# Headed (see browser)
npm run e2e:run:headed

# CI mode (list reporter)
npm run e2e:ci
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_BASE_URL` | `http://localhost:3000` | Backend URL |
| `E2E_USERNAME` | `e2etestuser` | Keycloak test user |
| `E2E_PASSWORD` | `Password` | Keycloak test password |

Example (PowerShell):
```powershell
$env:E2E_USERNAME = "e2etestuser"
$env:E2E_PASSWORD = "Password"
npm run e2e:run
```

### Test Structure

```
frontend/e2e/
├── playwright.config.ts    # Playwright configuration
└── tests/
    ├── helpers/
    │   ├── auth.ts         # Login helper (Keycloak)
    │   └── fixtures.ts     # Test data helpers (CRUD)
    ├── login.spec.ts       # P1: Login & navigation
    ├── crud.spec.ts        # P2: Expense CRUD
    └── attachments.spec.ts # P3: Attachment upload/preview
```

### Artifacts

On failure, Playwright captures:
- **Screenshots** — `test-results/`
- **Traces** — viewable with `npx playwright show-trace <trace.zip>`
- **HTML Report** — `playwright-report/index.html`

Open the HTML report:
```bash
npx playwright show-report playwright-report
```

### CI Integration

E2E tests run automatically on PRs to `main`/`release` via `.github/workflows/e2e.yml`.

Set repository secrets `E2E_USERNAME` and `E2E_PASSWORD` (or rely on defaults).

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
