# `apps/web`

Next.js web client for the Bopo control plane.

## Responsibilities

- Render operator workflows (issues, projects, goals, agents, governance, runs, inbox).
- Consume API routes from `apps/api`.
- Subscribe to realtime updates via `/realtime`.

## Key Routes

- `/dashboard`, `/issues`, `/projects`, `/goals`, `/agents`, `/org-chart`, `/governance`, `/inbox`
- `/office-space`, `/runs`, `/trace-logs`, `/costs`
- `/plugins`, `/templates`, `/models`
- `/settings`, `/settings/templates`, `/settings/plugins`, `/settings/models`

Route notes:

- `/` redirects to `/issues`.
- Detail routes include `/issues/[issueId]`, `/projects/[projectId]`, `/runs/[runId]`, and `/agents/[agentId]`.

## Local Development

From repository root (recommended):

- `pnpm dev` (auto port selection and `NEXT_PUBLIC_API_URL` wiring via root wrapper)
- `pnpm start` (production-mode run via root wrapper)

From this package directly:

- `pnpm --filter bopodev-web dev`
- `pnpm --filter bopodev-web build`
- `pnpm --filter bopodev-web start`

Default port is `4010` (`WEB_PORT`).

## Configuration

- `NEXT_PUBLIC_API_URL` - API base URL used by browser requests.
- `NEXT_PUBLIC_DEFAULT_COMPANY_ID` - optional preferred initial company.
- `NEXT_PUBLIC_BOPO_ACTOR_TOKEN` - optional token auth for authenticated deployments.

See:

- `docs/getting-started-and-dev.md`
- `docs/developer/configuration-reference.md`
