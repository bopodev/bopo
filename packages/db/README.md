# `packages/db`

Database schema and repository layer for Bopo, backed by Drizzle + PGlite.

## Responsibilities

- Define schema models and migrations/bootstrap behavior.
- Expose repository functions used by API services/routes.
- Provide typed DB access primitives for shared business logic.

## Usage

Primary consumer is `apps/api`.

## Commands

- `pnpm --filter bopodev-db build`
- `pnpm --filter bopodev-db typecheck`

## Notes

- Default DB path is managed by app/runtime config; see configuration docs before overriding.
- API startup bootstraps DB and registers built-in plugins/templates.

## Related Docs

- `docs/developer/architecture.md`
- `docs/developer/configuration-reference.md`
- `docs/operations/deployment.md`
