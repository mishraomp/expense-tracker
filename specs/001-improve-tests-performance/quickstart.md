# Quickstart — Improve test coverage and performance

This quickstart provides commands to gather baseline coverage and performance metrics, run the initial load tests, and how to run CI-related commands.

Prereqs:
 - Start the backend (localhost:3000): `cd backend && npm run start:dev`
 - Start the frontend (localhost:5173): `cd frontend && npm run dev`
 - Ensure the DB is seeded with sample datasets (10k expenses recommended) or use test fixtures.

Coverage commands:
```powershell
# Backend: run backend tests with coverage
Push-Location backend; npm run test:coverage; Pop-Location

# Frontend: run frontend tests with coverage
Push-Location frontend; npm run test:coverage; Pop-Location
```

Load tests:
```powershell
# Reports baseline (Docker) — defaults to localhost:3000
docker run -it --network host -e BASE_URL=http://localhost:3000 -v "${PWD}/load-tests:/load-tests" loadimpact/k6:0.43.0 run /load-tests/reports.js

PowerShell helper (Windows):
```powershell
./load-tests/run-k6.ps1 -Script 'reports.js' -BaseUrl 'http://localhost:3000' -Vus 10 -Duration '30s'
```
```

Notes:
 - Adjust `k6` VUs and duration via env vars: `K6_VUS=50`, `K6_DURATION='120s'`.
 - Nightly CI harness will use a smaller test (or cloud) to avoid resource exhaustion.
