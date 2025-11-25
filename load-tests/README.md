# Load Tests (k6)

This folder contains k6 scripts to benchmark the application. These are intended for CI or local runs.

## Prerequisites

- Install k6 locally: https://k6.io/docs/getting-started/installation/ or run with Docker
- Start the backend: `cd backend && npm run start:dev` (runs on http://localhost:3000)
- Seed the database with sample data (see [Seeding Data](#seeding-data) section below)
- Ensure the database has a realistic dataset (recommended: 10k expenses, 2k attachments)

## Quick Start

### Docker Run (Windows PowerShell)

```powershell
docker run -it --network host -e BASE_URL=http://localhost:3000 -v "${PWD}/load-tests:/load-tests" loadimpact/k6:0.43.0 run /load-tests/reports.js
```

### Docker Run with PowerShell Helper

```powershell
./run-k6.ps1 -Script 'reports.js' -BaseUrl 'http://localhost:3000' -Vus 10 -Duration '30s'
```

### Native k6 Run

```bash
k6 run --env BASE_URL=http://localhost:3000 --vus 10 --duration 30s load-tests/reports.js
```

### Collecting JSON Results

To save k6 results for comparison:

```powershell
# Native k6 with JSON output
k6 run --env BASE_URL=http://localhost:3000 --out json=results/baseline-$(Get-Date -Format 'yyyyMMdd-HHmmss').json load-tests/reports.js

# Docker with JSON output
docker run -it --network host -e BASE_URL=http://localhost:3000 -v "${PWD}/load-tests:/load-tests" loadimpact/k6:0.43.0 run --out json=/load-tests/results/baseline-$(Get-Date -Format 'yyyyMMdd-HHmmss').json /load-tests/reports.js
```

## Available Scripts

| Script | Endpoint(s) Tested | Description |
|--------|-------------------|-------------|
| `reports.js` | `/api/v1/reports/spending-over-time` | Tests report generation performance |
| `expenses-list.js` | `/api/v1/expenses?limit=100` | Tests expense listing with pagination |
| `attach-upload.js` | `/api/v1/attachments/upload` | Tests file attachment upload |

## Seeding Data

### Manual Seeding via API

Use the seed script to populate test data:

```powershell
# Seed 10k expenses and 2k attachments (requires backend running)
./seed-db.ps1 -ExpenseCount 10000 -AttachmentCount 2000 -BaseUrl 'http://localhost:3000'
```

### Database Restore (Faster for CI)

For CI runs, restore a pre-seeded database backup:

```powershell
# Restore from backup (Docker Postgres)
docker exec -i expense-tracker-postgres psql -U expense_user expense_tracker < ./docker/postgres/backup/test-dataset-10k.sql
```

## Interpreting Results

### Key Metrics

k6 outputs several important metrics:

- **http_req_duration**: Total request duration (median p50, p95, p99)
  - Target: p95 < 500ms for read endpoints, < 2s for reports
- **http_req_failed**: Percentage of failed requests
  - Target: < 1%
- **http_reqs**: Total requests per second (throughput)
- **vus**: Virtual users (concurrent connections)
- **iteration_duration**: Time to complete one full test iteration

### Example Baseline

```
✓ status is 200

checks.........................: 100.00% ✓ 300       ✗ 0
data_received..................: 1.2 MB  40 kB/s
data_sent......................: 36 kB   1.2 kB/s
http_req_blocked...............: avg=1.23ms   min=0s     med=0s      max=12.45ms p(95)=3.12ms  p(99)=10.23ms
http_req_duration..............: avg=245.67ms min=123ms  med=234ms   max=567ms   p(95)=412ms   p(99)=498ms
http_req_failed................: 0.00%   ✓ 0         ✗ 300
http_req_receiving.............: avg=1.12ms   min=234µs  med=890µs   max=5.67ms  p(95)=2.34ms  p(99)=4.12ms
http_req_sending...............: avg=234µs    min=89µs   med=198µs   max=1.23ms  p(95)=456µs   p(99)=891µs
http_req_waiting...............: avg=244.32ms min=122ms  med=232ms   max=565ms   p(95)=410ms   p(99)=496ms
http_reqs......................: 300     10/s
iteration_duration.............: avg=1.24s    min=1.12s  med=1.23s   max=1.57s   p(95)=1.41s   p(99)=1.52s
vus............................: 10      min=10      max=10
```

### Baseline Storage

Store baseline results in `results/` directory (not committed to git):

```
load-tests/results/
  baseline-20250124-120000.json   # Initial baseline
  baseline-20250124-150000.json   # After optimization
  .gitkeep                         # Keep directory in git
```

Use `compare-results.ts` to compare baselines (see [Comparing Results](#comparing-results)).

## Comparing Results

After running optimizations, compare performance:

```powershell
# Run comparison script
node compare-results.ts results/baseline-before.json results/baseline-after.json
```

Expected output:
```
Comparing: baseline-before.json vs baseline-after.json

Metric                 Before      After       Change      % Improvement
─────────────────────────────────────────────────────────────────────────
http_req_duration p95  412ms       298ms       -114ms      27.67% ⬇️
http_req_duration p99  498ms       356ms       -142ms      28.51% ⬇️
http_req_failed        0.00%       0.00%       0.00%       -
http_reqs (rps)        10.0        13.2        +3.2        32.00% ⬆️
```

## CI Integration

The nightly workflow (`.github/workflows/k6-nightly.yml`) runs k6 tests on schedule:

- Runs: Every night at 2 AM UTC
- Environment: Seeded test database with 10k expenses
- Artifacts: JSON results uploaded to GitHub Actions artifacts
- Alerts: Fails if p95 > 1000ms or error rate > 5%

## Best Practices

1. **Consistent Environment**: Always use the same dataset size for comparable results
2. **Warm-up**: Run k6 once before capturing baseline to warm caches
3. **Isolation**: Run tests when the system is idle (no concurrent users)
4. **Multiple Runs**: Run 3-5 times and take the median to reduce variance
5. **Version Control**: Tag baselines with commit SHA or version number
6. **Document Changes**: Record any config or DB changes that affect performance

## Troubleshooting

### High Error Rates

- Check backend logs: `docker logs expense-tracker-backend`
- Verify database connection: `docker ps | grep postgres`
- Ensure sufficient resources (CPU/memory)

### Inconsistent Results

- Check for background processes consuming resources
- Verify network stability
- Use Docker resource limits to control variance

### Slow Response Times

- Check database query performance: Enable Prisma query logging
- Profile slow endpoints: Use backend logging interceptor
- Analyze database indices: Run `EXPLAIN ANALYZE` on slow queries

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | API base URL |
| `K6_VUS` | `10` | Virtual users (concurrent connections) |
| `K6_DURATION` | `30s` | Test duration |
| `K6_ITERATIONS` | - | Total iterations (alternative to duration) |

## Further Reading

- k6 Documentation: https://k6.io/docs/
- k6 Metrics Guide: https://k6.io/docs/using-k6/metrics/
- k6 Thresholds: https://k6.io/docs/using-k6/thresholds/
- Performance Testing Best Practices: https://k6.io/docs/testing-guides/

## Notes

- The `BASE_URL` environment variable overrides the default API base URL
- Start the backend (`npm run start:dev`) and populate a realistic dataset before running
- The PowerShell helper script (`run-k6.ps1`) maps environment variables into the k6 Docker container
- For production-like testing, use a staging environment with production data volumes
