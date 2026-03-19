# `packages/contracts`

Shared schemas and TypeScript contracts used across API, web, SDK, and adapters.

## Responsibilities

- Define canonical request/response and domain data shapes.
- Provide shared Zod validation schemas for runtime boundaries.
- Keep cross-package type contracts consistent.

## Usage

Used by:

- `apps/api` for request/response validation.
- `apps/web` for client-side type safety.
- `packages/agent-sdk` and adapter packages for runtime contracts.

## Commands

- `pnpm --filter bopodev-contracts build`
- `pnpm --filter bopodev-contracts typecheck`

## Related Docs

- `docs/developer/domain-model.md`
- `docs/developer/api-reference.md`
