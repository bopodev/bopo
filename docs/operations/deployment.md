# Deployment

This page defines the supported VPS deployment model, startup sequence, and hardening controls for Bopo.

## Purpose

Provide a repeatable operator runbook for private-network and public-internet deployments.

## Intended Audience

- Platform engineers owning production uptime and security.
- Operators running Bopo on a VPS or container host.

## Supported Profiles

Deployment modes are configured with `BOPO_DEPLOYMENT_MODE`:

- `local`:
  - localhost-first development behavior with optional local board fallback.
- `authenticated_private`:
  - login/identity required;
  - intended for VPN/Tailscale/private networks.
- `authenticated_public`:
  - internet-facing profile with explicit public URL requirement.

For non-local modes, configure:

- `BOPO_ALLOWED_ORIGINS` (CORS allowlist),
- `BOPO_ALLOWED_HOSTNAMES` (trusted hostnames),
- either `BOPO_AUTH_TOKEN_SECRET` (signed actor token flow) or `BOPO_TRUST_ACTOR_HEADERS=1` (trusted proxy-injected actor headers).

`authenticated_public` additionally requires:

- `BOPO_PUBLIC_BASE_URL`.

## Deployment Topology

Minimum services:

- `apps/api` process
- `apps/web` process
- durable storage path for embedded DB and workspace artifacts

Reference container artifacts:

- `Dockerfile`
- `docker-compose.quickstart.yml`
- `docker-compose.yml`

## Quickstart (Container)

Single-container quickstart (API + web):

```bash
export BOPO_AUTH_TOKEN_SECRET="$(openssl rand -hex 32)"
docker compose -f docker-compose.quickstart.yml up --build
```

Default endpoints:

- web: `http://localhost:4010`
- api: `http://localhost:4020`

## Split Services (Container)

Run API and web as separate services:

```bash
export BOPO_AUTH_TOKEN_SECRET="$(openssl rand -hex 32)"
docker compose up --build
```

Use this profile when you want to place a reverse proxy/load balancer in front of both services.

## Environment Baseline

Configure at minimum:

- `NEXT_PUBLIC_API_URL` (web client target)
- `PORT` (api)
- `BOPO_DB_PATH` and/or `BOPO_HOME` for durable storage
- `BOPO_DEPLOYMENT_MODE`
- `BOPO_ALLOWED_ORIGINS`
- `BOPO_ALLOWED_HOSTNAMES`
- `BOPO_AUTH_TOKEN_SECRET` or `BOPO_TRUST_ACTOR_HEADERS=1`
- provider credentials (`BOPO_OPENAI_API_KEY`, `BOPO_ANTHROPIC_API_KEY`) as needed

Provider runtime notes:

- `codex` / `claude_code` adapters require local CLI availability in the API host environment.
- `openai_api` / `anthropic_api` adapters call provider HTTPS APIs directly and do not require local coding CLIs.

Reference: [`../developer/configuration-reference.md`](../developer/configuration-reference.md)

## Startup Sequence

1. Start API service.
2. Verify API health: `GET /health`.
3. Start web service.
4. Verify web section load and browser API requests.
5. Verify websocket connectivity on `/realtime`.
6. Validate one manual heartbeat run.

## Scheduler Ownership

`BOPO_SCHEDULER_ROLE` controls sweep ownership:

- `auto`: default single-instance behavior.
- `leader`: this instance executes scheduler sweeps.
- `follower`: this instance does not execute scheduler sweeps.
- `off`: scheduler disabled.

For multi-instance deployment, set exactly one API instance to `leader` (or `auto`) and all others to `follower`.

## Horizontal Scaling Notes

- Realtime fanout is process-local today.
- In multi-instance API deployments, clients only receive events from the instance they are connected to unless you add a shared pub/sub backplane.
- Recommended near-term deployment model is a single API leader with sticky websocket routing.

## Reverse Proxy Reference

When exposing to users, terminate TLS at a reverse proxy and forward:

- HTTP API traffic to `apps/api`,
- websocket upgrades for `/realtime`,
- web app traffic to `apps/web`.

Operational requirements:

- preserve websocket upgrade headers,
- restrict allowed origins/hosts to your deployment domains,
- do not expose admin/bootstrap secrets in client-visible responses.

## Persistence and Backup

- Persist `BOPO_DB_PATH` on durable storage.
- Persist instance workspace roots when artifacts/transcripts are required after restart.
- Back up DB and workspace directories on a schedule.
- Perform restore drills periodically (at least monthly).

## Upgrade and Rollback

Upgrade:

1. Back up DB + workspace volumes.
2. Pull/build new image.
3. Restart API then web.
4. Run health + websocket + heartbeat smoke checks.

Rollback:

1. Stop services.
2. Re-deploy previous image tag.
3. Restore DB/workspaces if schema/data regressions are observed.
4. Re-run smoke checks.

## Acceptance Smoke Checks

Use these checks for every new VPS environment:

- `curl -sS http://<api-host>:<api-port>/health`
- web page load at configured URL
- websocket handshake to `/realtime` and snapshot event receipt
- one API request with actor identity in authenticated mode
- one successful heartbeat run using the intended adapter profile

Convenience command:

```bash
pnpm smoke:vps
```

## Security Baseline

- Keep `BOPO_ALLOW_LOCAL_BOARD_FALLBACK=0` in authenticated modes.
- Treat `full_access` run policy as privileged and auditable.
- Limit host permissions available to runtime commands.
- Restrict environment variable exposure to required provider keys.
- Rotate `BOPO_AUTH_TOKEN_SECRET` and provider credentials on a fixed cadence.

## Related Pages

- Troubleshooting: [`troubleshooting.md`](./troubleshooting.md)
- Runbooks index: [`runbooks-index.md`](./runbooks-index.md)
- Release process: [`../release-process.md`](../release-process.md)

