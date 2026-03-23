# Contributing to BopoDev

Thanks for contributing.

## Development Setup

See **[DEVELOPING.md](./DEVELOPING.md)** for ports, migrations, CLI helpers, and API export notes.

Preferred one-shot setup:

1. Run onboarding: `pnpm onboard`

Manual setup:

1. Install dependencies: `pnpm install`
2. Copy environment file: `cp .env.example .env`
3. Start apps: `pnpm start`
4. Run checks before opening a PR:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test:coverage`
   - `pnpm test:e2e`
   - `pnpm build`

## Branch and PR Guidelines

- Create focused branches with a single concern.
- Keep PRs small enough to review.
- Include tests for behavior changes.
- Update docs when workflows, setup, or public interfaces change.
- Use clear PR descriptions with:
  - problem statement
  - approach
  - test plan

## Commit Guidance

- Write imperative commit subjects (e.g. `add governance inbox e2e smoke test`).
- Reference issues when relevant.

## Definition of Done

- Release gates pass locally and in CI.
- New behavior has automated coverage.
- No secrets are committed.
- User-facing or contributor-facing changes are documented.
