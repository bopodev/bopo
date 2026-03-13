# Getting Started and Developer Guide

This page contains developer-focused details that are intentionally kept out of the top-level `README.md`.

For the full docs map, start at [`docs/index.md`](./index.md).

## Architecture

### Monorepo Layout

- `apps/web`: Next.js 16 web client.
- `apps/api`: Express API and realtime websocket hub.
- `packages/contracts`: shared schemas and realtime contracts.
- `packages/db`: PGlite/Drizzle schema and repositories.
- `packages/agent-sdk`: runtime adapters and execution plumbing.
- `packages/ui` and `packages/config`: shared UI/config.

### Runtime Flow

1. The web app requests data/actions over HTTP from the API.
2. The API persists state via `bopodev-db`.
3. Heartbeat and governance workflows publish realtime updates.
4. The web app subscribes to `/realtime` channels for live status.

### Workspace and Path Model

Use [`docs/developer/workspace-resolution-reference.md`](./developer/workspace-resolution-reference.md) as the canonical source for workspace root derivation, runtime cwd selection precedence, and path boundary invariants.

## Tech Stack

- Monorepo: pnpm workspaces and Turbo
- API: Express and TypeScript
- Web: Next.js 16 and Turbopack with shadcn/ui patterns
- Database: embedded Postgres via PGlite and Drizzle ORM
- Tests: Vitest, Supertest, and Playwright

## Setup Paths

### One-Command Onboarding

```bash
npx bopodev onboard --yes
```

First-run behavior:

- You are prompted for a required default company name, even with `--yes`.
- You choose a required primary agent framework (for example `codex`, `openai_api`, or `anthropic_api`) used for the bootstrapped `CEO` agent.
- Onboarding persists the company name for future runs.
- Onboarding creates the first agent automatically: `CEO` with `role: "CEO"` and hiring enabled.
- Onboarding seeds a CEO startup issue under the `Leadership Setup` project.
- If an older demo/bootstrap CEO (`echo` runtime) is detected, onboarding migrates that agent to your selected framework.

### Local Workspace Shortcut

```bash
pnpm onboard
```

### Manual Fallback

1. Copy env template:
   - `cp .env.example .env`
2. Install dependencies:
   - `pnpm install`
3. Start all apps:
   - `pnpm start`

### VPS/Container Shortcut

```bash
export BOPO_AUTH_TOKEN_SECRET="$(openssl rand -hex 32)"
docker compose -f docker-compose.quickstart.yml up --build
```

For full VPS guidance, see [`operations/deployment.md`](./operations/deployment.md).

### Default Local Ports

- Web: `http://localhost:4010`
- API: `http://localhost:4020`

## Environment and Runtime Details

- The web app reads API URL from `NEXT_PUBLIC_API_URL`.
- Deployment profile is controlled by `BOPO_DEPLOYMENT_MODE` (`local`, `authenticated_private`, `authenticated_public`).
- Agent runtime working directories are resolved from each project's primary workspace `cwd` when available.
- `NEXT_PUBLIC_DEFAULT_RUNTIME_CWD` is an optional fallback.
- Embedded DB defaults to `~/.bopodev/instances/default/db/bopodev.db`; set `BOPO_DB_PATH` only to override.
- Projects can hold multiple workspaces; exactly one workspace should be marked primary for deterministic runtime path selection.
- If no primary workspace `cwd` exists, runtime falls back to the agent runtime cwd or an agent fallback workspace path.
- If a primary workspace defines `repoUrl`, heartbeat bootstraps the local repo path (clone/fetch/checkout) before adapter execution.
- `isolated + git_worktree` policy mode is available behind `BOPO_ENABLE_GIT_WORKTREE_ISOLATION`.
- Override workspace root with `BOPO_INSTANCE_ROOT`.
- Agent fallback workspaces are created under `~/.bopodev/instances/default/workspaces/<companyId>/agents/<agentId>` when project paths are unavailable.
- Full path sink inventory and guardrail mapping: [`docs/operations/workspace-path-surface.md`](./operations/workspace-path-surface.md).

## Command Reference

- `pnpm dev` - run workspace dev tasks
- `pnpm start` - run workspace apps in production mode
- `pnpm onboard` - run local onboarding flow with defaults plus required company naming on first run
- `pnpm doctor` - run local environment checks
- `pnpm typecheck` - run TypeScript checks
- `pnpm lint` - run lint/type lint tasks
- `pnpm test` - run unit/integration suite
- `pnpm test:coverage` - run tests with coverage thresholds
- `pnpm test:e2e` - run Playwright smoke tests
- `pnpm build` - build all packages/apps

## Core Routes

- `/issues`
- `/dashboard`
- `/goals`
- `/agents`
- `/org-chart`
- `/governance`
- `/inbox`
- `/trace-logs`
- `/costs`
- `/settings`

`/` redirects to `/issues`.

## First-Run Notes

Issue creation requires a real project in the selected company:

1. Create a project via `New Project`.
2. Create issues and assign that project in the issue modal.

## Testing and Release Gates

Open-source beta release requires all of:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm build`

See [`docs/release-gate-checklist.md`](./release-gate-checklist.md) for details and critical workflow matrix.
Release/tag workflow is documented in [`docs/release-process.md`](./release-process.md).

## Additional References

- Product docs: [`docs/product/index.md`](./product/index.md)
- Developer docs: [`docs/developer/index.md`](./developer/index.md)
- Operations docs: [`docs/operations/index.md`](./operations/index.md)
- Release docs: [`docs/release/index.md`](./release/index.md)

## Troubleshooting

- API health endpoint: `GET /health` includes DB readiness and runtime command readiness.
- Codex troubleshooting runbook: `docs/codex-connection-debugging.md`.
- Agent runtime execution supports local CLI commands for Claude Code and Codex.
- Direct API execution is also supported via `openai_api` and `anthropic_api` when local CLIs are not installed.
