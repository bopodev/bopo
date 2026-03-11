# Contributing

This page defines the expected workflow for contributing changes to Bopo.

## Purpose

Keep implementation quality and release safety consistent across contributors.

## Intended Audience

- Internal contributors and external maintainers submitting PRs.

## Prerequisites

- Complete local setup from [`../getting-started-and-dev.md`](../getting-started-and-dev.md).
- Validate environment health with `pnpm doctor`.

## Workflow

1. Create a focused branch per change.
2. Keep PR scope small and behavior-driven.
3. Update docs when behavior or contracts change.
4. Include tests for new workflows, failure paths, or regressions.

## Quality Gates

Run before opening a PR:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm build`

Release-specific gate details: [`../release-gate-checklist.md`](../release-gate-checklist.md)

## Testing Guidelines

- Prefer unit/integration tests for repository, route, and runtime logic.
- Add end-to-end coverage for critical user journeys and governance behavior.
- For adapter/runtime changes, include failure-handling tests (timeouts, retries, parse failures).

## Documentation Guidelines

- Link new pages from [`../index.md`](../index.md).
- Reuse canonical terms from [`../glossary.md`](../glossary.md).
- Include operational failure notes for anything that can page operators.

## Review Expectations

- Highlight migration or config impacts.
- Call out security-sensitive changes (`full_access`, runtime env handling, approvals).
- Provide reproducible verification notes in PR description.

## Related Pages

- Architecture: [`architecture.md`](./architecture.md)
- API reference: [`api-reference.md`](./api-reference.md)
- Release process: [`../release-process.md`](../release-process.md)

