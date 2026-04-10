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
- **Marketing site (bopo.dev, Astro, separate repo)** — `https://bopo.dev/install.sh` must live in that site’s **`public/install.sh`**. Astro serves everything under `public/` at the domain root. When you change the bootstrap script here, copy [`scripts/install.sh`](./scripts/install.sh) into the Astro repo’s `public/install.sh` and deploy; this monorepo does not host that URL.
- `apps/api` — Express API, realtime, scheduler
- `packages/contracts` — Shared Zod schemas
- `packages/db` — Drizzle schema and migrations
- `packages/agent-sdk` — Adapter registry and runtime helpers
- `packages/adapters/*` — Provider-specific adapters (`server` / `ui` / `cli` per package)
- `packages/cli` — Published `bopodev` CLI (`onboard`, `doctor`, `issue shell-env`, …)

## API: company export

**Zip folder export** (recommended) — human-readable tree (`.bopo.yaml`, markdown, `agents/`, `projects/`, `tasks/`, optional `skills/`):

- Manifest: `GET /companies/YOUR_COMPANY_ID/export/files/manifest`
- Download zip: `POST /companies/YOUR_COMPANY_ID/export/files/zip` with JSON `{ "includeAgentMemory": false }` (optional `paths` to subset). Response is `application/zip`.
- Import new company: `POST /companies/import/files` with form field `archive` (board actor).
- Import preview (parse-only): `POST /companies/import/files/preview` with the same multipart field `archive` (board actor). Returns counts and validation errors without writing to the database.
- Starters for **Create company**: `GET /companies/starter-packs` (board) lists builtin **template** slugs (full org) plus any optional zip-only packs. `POST /companies` with `starterPackId` applies that template (or zip) and wires the form’s CEO provider/model to the lead agent (`ceo` / `cmo` / first hiring-capable).

The workspace **Templates** page includes a file picker, optional import preview summary, and zip download when a company is selected.

**Legacy JSON snapshot** (`GET /companies/:companyId/export`) was removed; the API returns **410**. Use the zip export above for portable backups.

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

## API: scheduler and routines

The API process runs periodic sweeps when `BOPO_SCHEDULER_ROLE` is `auto` or `leader` (see `apps/api/src/startup/scheduler-config.ts`).

- `BOPO_LOOP_SWEEP_MS` — interval for **work loop** trigger processing (default `60000`). Set to `0` is invalid; use `BOPO_LOOP_SWEEP_ENABLED=0` to disable.
- `BOPO_LOOP_SWEEP_ENABLED` — set to `0` to turn off work loop sweeps on this instance.

## Further reading

- Setup and env details: [`docs/getting-started-and-dev.md`](./docs/getting-started-and-dev.md)
- Architecture: [`docs/developer/architecture.md`](./docs/developer/architecture.md)
- Adapters: [`docs/adapters/overview.md`](./docs/adapters/overview.md)
