# Troubleshooting

This page provides a general triage framework for Bopo incidents.

## Purpose

Reduce mean time to diagnose failures across API, runtime, and UI surfaces.

## Intended Audience

- Contributors and operators debugging broken workflows.

## First Response Checklist

1. Verify API health: `GET /health`.
2. Confirm request scoping:
   - `x-company-id`
   - actor headers (`x-actor-*`)
3. Capture identifiers:
   - `x-request-id`
   - `runId` / `approvalId` / `issueId`
4. Inspect latest `runs`, `trace-logs`, and governance inbox.
5. Verify environment config did not regress.

## Symptom -> Likely Cause

- **Heartbeat fails before execution**
  - runtime preflight, command availability, or control-plane communication settings.
- **Run stuck in `started`**
  - scheduler overlap, worker interruption, or stale-run recovery threshold too high.
- **Governance action appears unresolved**
  - inbox state (`dismissed`/`seen`) vs actual approval status mismatch.
- **Missing realtime updates**
  - websocket reconnect gaps, snapshot application ordering, or company scope mismatch.
- **Attachment upload errors**
  - file count/size/mime/extension limits exceeded.

## Focused Checks

- Runtime configuration:
  - provider type, command, args, cwd, env, timeout.
- Policy and security:
  - sandbox mode, web-search allowance, approval defaults.
- Data integrity:
  - invalid runtime state blobs, malformed JSON payloads.
- Startup warnings:
  - codex preflight warnings and default-company resolution warnings.

## Recovery Patterns

- Re-run heartbeat with corrected runtime config.
- Clear malformed state env values and retry.
- Resolve pending approvals blocking expected side effects.
- Use `redo` only after root cause is understood.

## Related Runbooks

- Codex-specific: [`../codex-connection-debugging.md`](../codex-connection-debugging.md)
- Index: [`runbooks-index.md`](./runbooks-index.md)

