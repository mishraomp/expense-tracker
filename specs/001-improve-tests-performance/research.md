# Research: Improve test coverage & performance

This file lists the unknowns and the results for Phase 0 research. Decisions and rationale are here to guide the implementation.

## Decision: Use existing unit/integration tooling

- Rationale: The repository already uses Vitest for both backend and frontend unit tests and contract tests. Introducing a new tool would require significant rework and is unnecessary.

## Decision: Use k6 for performance/load testing

- Rationale: k6 is a widely used, reliable load testing tool with Docker support. Per user's directive, we will add k6-based load tests under a new `load-tests/` folder at the repo root.

## Unknowns and follow-ups

- What is the current coverage percentage for backend and frontend? (ACTION: Compute and record baseline)
- Which endpoints are the slowest in production? (ACTION: Generate production-like baseline with k6 targeted at Reports, Expenses List, Attachments and Search/Export) 
- Dataset sizes for local benchmarking: default to 10k expenses and 2k attachments as specs suggest — we will parameterize this in k6's environment variables.
- CI: We'll use GitHub Actions for coverage and scheduled nightly k6 runs unless you prefer a different CI provider.

## Alternatives considered

- Alternative: Use `autocannon` for quick Node-based benches; rejected because user specifically asked for k6.

## Next steps

1. Create `load-tests/` with initial k6 script for Reports; parameterize baseURL and concurrency/iterations.
2. Measure baseline on local dev stack or a stable test environment (not real prod) and store results.
3. Create a benchmark harness for quick runs and a daily CI job for nightly runs.
4. Start with targeted code-level optimizations for reports & the expense-list queries based on query profiler and Prisma explain plans.
