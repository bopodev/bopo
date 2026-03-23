# Developing Bopo

Quick reference for running and changing this monorepo. For the full map (product, operations, deep dives), start at [`docs/index.md`](./docs/index.md).

## Prerequisites

- Node.js 20+
- pnpm 9+ (see root `package.json` `packageManager`)

## Install and run locally

```bash
pnpm install
pnpm dev
```

- Web UI: `http://localhost:4010`
- API: `http://localhost:4020`

The dev script uses `scripts/dev-runner.mjs` (see [`docs/getting-started-and-dev.md`](./docs/getting-started-and-dev.md) for alternatives like `pnpm dev:full`, `pnpm start`, and embedded Postgres paths).

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm typecheck` | TypeScript across workspaces (Turbo) |
| `pnpm lint` | Lint tasks |
| `pnpm test` | Vitest unit/integration |
| `pnpm test:e2e` | Playwright |
| `pnpm build` | Production build |
| `pnpm onboard` | Local onboarding / seed |
| `pnpm doctor` | Environment checks |
| `pnpm db:migrate` | Apply Drizzle migrations (`packages/db`) |

## Layout

- `apps/web` — Next.js client
- `apps/api` — Express API, realtime, scheduler
- `packages/contracts` — Shared Zod schemas
- `packages/db` — Drizzle schema and migrations
- `packages/agent-sdk` — Adapter registry and runtime helpers
- `packages/adapters/*` — Provider-specific adapters (`server` / `ui` / `cli` per package)
- `packages/cli` — Published `bopodev` CLI (`onboard`, `doctor`, `issue shell-env`, …)

## API: company export (portable snapshot)

Actors who can access a company may download a **redacted** JSON snapshot (agent env and prompts stripped):

```bash
curl -sS -H "x-company-id: YOUR_COMPANY_ID" \
  -H "x-actor-type: board" -H "x-actor-id: local" \
  -H "x-actor-companies:" -H "x-actor-permissions:" \
  "http://localhost:4020/companies/YOUR_COMPANY_ID/export"
```

In authenticated deployments, use a Bearer actor token instead of `x-actor-*` headers.

## CLI: issue shell environment

From a machine that can reach the API:

```bash
export BOPODEV_COMPANY_ID="your-company-id"
# Optional: export BOPO_ACTOR_TOKEN="..."  # when not using local board fallback
npx bopodev issue shell-env YOUR_ISSUE_ID
```

Prints `export BOPODEV_*=…` and a suggested `cd` to the project’s primary workspace when configured.

- `--api-url` — default `http://localhost:4020` or `BOPODEV_API_URL`
- `--company-id` — overrides `BOPODEV_COMPANY_ID`
- `--json` — machine-readable JSON instead of shell exports

## Further reading

- Setup and env details: [`docs/getting-started-and-dev.md`](./docs/getting-started-and-dev.md)
- Architecture: [`docs/developer/architecture.md`](./docs/developer/architecture.md)
- Adapters: [`docs/adapters/overview.md`](./docs/adapters/overview.md)
