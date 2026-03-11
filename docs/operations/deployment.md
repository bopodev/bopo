# Deployment

This page outlines deployment patterns and production readiness concerns for Bopo.

## Purpose

Provide an operational baseline for running Bopo outside local development.

## Intended Audience

- Platform engineers owning environments and reliability.

## Deployment Topology

Minimum services:

- `apps/api` process
- `apps/web` process
- persistent storage path for embedded DB and workspace artifacts

Recommended network assumptions:

- web can reach API base URL,
- clients can reach web and websocket endpoint,
- API can execute configured runtime commands in host environment.

## Environment Baseline

Configure at minimum:

- `NEXT_PUBLIC_API_URL` (web)
- `PORT` (api)
- `BOPO_DB_PATH` or instance-root variables for durable storage
- provider credentials (`BOPO_OPENAI_API_KEY`, `BOPO_ANTHROPIC_API_KEY`) as needed

Provider runtime notes:

- `codex` / `claude_code` adapters require corresponding local CLI availability in the API host environment.
- `openai_api` / `anthropic_api` adapters call provider HTTPS APIs directly and do not require local Codex/Claude CLI binaries.

Reference: [`../developer/configuration-reference.md`](../developer/configuration-reference.md)

## Persistence and Backup

- Persist `BOPO_DB_PATH` on durable storage.
- Persist instance workspace roots when artifacts/transcripts are required after restart.
- Back up DB file and workspace directories on a scheduled cadence.

## Startup and Health Checks

- Start API first and verify `GET /health`.
- Start web and verify initial section load.
- Confirm runtime command readiness for enabled providers.
- Validate websocket connectivity on `/realtime`.

## Security and Access

- Protect API behind trusted network boundary or auth proxy.
- Treat `full_access` run policy as privileged and audited.
- Limit host permissions of runtime commands where possible.
- Restrict environment variable exposure to only required provider keys.

## Scaling Notes

- API process currently hosts scheduler and realtime; horizontal scaling should account for single-writer/event-coordination semantics.
- If running multiple API instances, define clear ownership for scheduler sweeps and realtime fanout.

## Related Pages

- Troubleshooting: [`troubleshooting.md`](./troubleshooting.md)
- Runbooks index: [`runbooks-index.md`](./runbooks-index.md)
- Release process: [`../release-process.md`](../release-process.md)

