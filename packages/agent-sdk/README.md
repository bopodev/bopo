# `packages/agent-sdk`

Runtime orchestration SDK for adapter resolution, execution integration, and runtime health checks.

## Responsibilities

- Resolve and register adapter modules.
- Provide shared execution/runtime helpers used by API heartbeat workflows.
- Expose runtime command health checks used at API startup and health endpoints.

## Usage

Primary consumers:

- `apps/api` heartbeat and startup paths.
- `packages/adapters/*` through adapter module contracts.

## Commands

- `pnpm --filter bopodev-agent-sdk build`
- `pnpm --filter bopodev-agent-sdk typecheck`

## Related Docs

- `docs/adapters/overview.md`
- `docs/adapter-authoring.md`
- `docs/developer/architecture.md`
