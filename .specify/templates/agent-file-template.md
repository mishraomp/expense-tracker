# [PROJECT NAME] Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

## Active Technologies

[EXTRACTED FROM ALL PLAN.MD FILES]

## Project Structure

```text
[ACTUAL STRUCTURE FROM PLANS]
```

## Commands

[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]

## Code Style

[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE]

**Constitution Requirements:**
- All code must follow linting rules (enforced via pre-commit hooks)
- Functions > 50 lines require justification
- Business logic must be separated from presentation logic
- All dependencies pinned to specific versions

**Testing Requirements:**
- Test-Driven Development mandatory (Red-Green-Refactor)
- Minimum 80% code coverage, 100% for financial calculations
- Test hierarchy: Contract tests → Integration tests → Unit tests

**Performance Standards:**
- Initial load: < 2 seconds on 3G
- API reads: < 500ms p95
- API writes: < 1000ms p95
- UI interactions: < 100ms response

**UX Requirements:**
- Follow design system/component library
- WCAG 2.1 Level AA compliance
- User-friendly error messages (no technical jargon)
- Consistent visual patterns across features

## Recent Changes

[LAST 3 FEATURES AND WHAT THEY ADDED]

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
