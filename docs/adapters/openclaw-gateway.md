# OpenClaw Gateway adapter (`openclaw_gateway`)

This adapter lets Bopo **heartbeats** drive work through a self-hosted [OpenClaw](https://docs.openclaw.ai/) **gateway** using the documented WebSocket protocol ([Gateway](https://docs.openclaw.ai/gateway), [protocol](https://docs.openclaw.ai/gateway/protocol)).

Package: `packages/adapters/openclaw-gateway/`.

## When to use it

Use `openclaw_gateway` when OpenClaw already runs your agent loop, tools, and model routing, and you want Bopo to:

- send each heartbeat prompt as an `agent` request,
- wait for completion via `agent.wait`,
- record **runs, costs, and token usage** in Bopo like other adapters.

Do **not** use it when you only need a local CLI subprocess; prefer `codex`, `claude_code`, `opencode`, or direct API adapters (`openai_api`, `anthropic_api`).

## Configuration (agent runtime)

All settings are on the **agent**: runtime **command** (or env) plus **runtime environment**. There are no dedicated API-process env vars for OpenClaw.

| Input | Required | Description |
| --- | --- | --- |
| **Command** or `OPENCLAW_GATEWAY_URL` | yes | Gateway WebSocket URL (`ws://` or `wss://`). Example local default: `ws://127.0.0.1:18789` (confirm with your OpenClaw install). |
| `OPENCLAW_GATEWAY_TOKEN` or `OPENCLAW_GATEWAY_PASSWORD` | yes | Must match gateway auth configuration. |
| `OPENCLAW_AGENT_ID` | no | Target assistant/agent id on the gateway. |
| `OPENCLAW_SESSION_KEY_STRATEGY` | no | `issue` (default), `run`, or `fixed`. Controls how Bopo builds the OpenClaw `sessionKey` for continuity across heartbeats. |
| `OPENCLAW_SESSION_KEY` | no | Used when strategy is `fixed`. |
| `OPENCLAW_AGENT_WAIT_MS` | no | Upper bound for `agent.wait` in milliseconds (defaults to a large value derived from runtime timeout). |
| `OPENCLAW_DEVICE_PRIVATE_KEY_PEM` | no | Stable Ed25519 private key (PEM). Use `\\n` for newlines in env text. If omitted, an ephemeral identity is generated each run (pairing may be required). |
| `BOPO_OPENCLAW_DISABLE_DEVICE_AUTH` | no | When `1` / `true` / `yes`, omit `device` on `connect`. Only if the gateway explicitly allows that mode. |

Full table with defaults context: [`docs/developer/configuration-reference.md`](../developer/configuration-reference.md#openclaw-gateway-adapter-per-agent-runtime).

## Session keys

Bopo derives `sessionKey` passed to OpenClaw so the gateway can associate turns with a stable session:

| Strategy | Session key pattern |
| --- | --- |
| `issue` (default) | `bopo:issue:<first-work-item-issue-id>` |
| `run` | `bopo:run:<heartbeatRunId>` |
| `fixed` | Value of `OPENCLAW_SESSION_KEY` |

If the strategy is `issue` but the heartbeat has **no** work item id, no session key is sent; usage lookup after the run will be limited.

## Execution flow (summary)

1. **Connect** over WebSocket with operator scopes and gateway auth (and device identity unless disabled).
2. **`agent`**: send the heartbeat prompt, `idempotencyKey` (= Bopo heartbeat run id), optional `sessionKey`, optional model override, optional OpenClaw `timeout` (seconds).
3. **`agent.wait`**: block until the run finishes (or timeout).
4. **Usage and model** (best-effort, same WebSocket):
   - Prefer **`sessions.list`** with `search` matching the session key, then take the row with an exact `key` match (`inputTokens`, `outputTokens`, `estimatedCostUsd`, `model`, `modelProvider`).
   - If token totals are still zero, call **`sessions.usage`** for that key over a short recent date range (transcript-derived totals, includes cache read tokens when present).

OpenClaw’s `agent.wait` payload alone does **not** include token counts; the adapter relies on the session APIs above so Bopo can persist costs like other adapters.

## Cost and pricing fields

The adapter fills the standard `AdapterExecutionResult` fields (`tokenInput`, `tokenOutput`, `usdCost`, `usage`, `pricingModelId`, `trace.usageSource`).

- **`usdCost`**: taken from OpenClaw `estimatedCostUsd` or `sessions.usage` totals when available.
- **`pricingProviderType`**: when OpenClaw reports a known upstream provider on the session row (`modelProvider`), Bopo maps it to `anthropic_api`, `openai_api`, or `gemini_cli` so internal catalog pricing can estimate cost when the gateway did not supply USD. Otherwise this stays `null` and heartbeat logic uses provider `openclaw_gateway` as usual.

## Final run output

OpenClaw does not return Bopo’s `AgentFinalRunOutput` JSON over the gateway protocol. On success the adapter still returns `status: "ok"` with a **synthetic** `finalRunOutput` derived from the completion summary so heartbeats can complete the orchestration path; interpret detailed artifacts from OpenClaw’s own session/transcript UIs if needed.

## Environment preflight

`server/testEnvironment` opens a WebSocket to the configured URL and checks reachability. It does **not** validate token/password or device pairing; those are checked on the first real heartbeat.

## Tests and implementation notes

- Parsing helpers and pricing mapping: `packages/adapters/openclaw-gateway/src/server/parse.ts`
- WebSocket client and session usage fetch: `packages/adapters/openclaw-gateway/src/server/gateway-client.ts`
- Vitest coverage: `tests/openclaw-gateway.test.ts` (parse + minimal mock gateway integration)

## Related docs

- Adapter overview: [`overview.md`](./overview.md)
- Adapter authoring checklist: [`../adapter-authoring.md`](../adapter-authoring.md)
- Agents and runs (product): [`../product/agents-and-runs.md`](../product/agents-and-runs.md)
