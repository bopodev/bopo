# `apps/api`

Express API, websocket hub, and heartbeat scheduler runtime for Bopo.

## Responsibilities

- Serve HTTP routes for planning, execution, governance, observability, plugins, and templates.
- Attach websocket hub on `/realtime` for company-scoped live updates.
- Run heartbeat scheduler/queue worker based on `BOPO_SCHEDULER_ROLE`.

## Runtime Entry Points

- `src/server.ts` - startup, env loading, realtime bootstrap, scheduler ownership.
- `src/app.ts` - middleware, route mounting, error handling.
- `src/routes/*.ts` - route groups.
- `src/worker/scheduler.ts` - periodic sweep orchestration.

## Local Development

From repository root (recommended):

- `pnpm dev` or `pnpm start`

From this package directly:

- `pnpm --filter bopodev-api dev`
- `pnpm --filter bopodev-api start`
- `pnpm --filter bopodev-api db:init`
- `pnpm --filter bopodev-api onboard:seed`
- `pnpm --filter bopodev-api workspaces:backfill`

Default port is `4020` (`API_PORT`/`PORT`).

## Key Route Groups

- `/auth`, `/attention`, `/companies`, `/projects`, `/issues`, `/goals`
- `/agents`, `/governance`, `/heartbeats`, `/observability`
- `/plugins`, `/templates`

## Related Docs

- `docs/developer/api-reference.md`
- `docs/developer/configuration-reference.md`
- `docs/operations/deployment.md`
