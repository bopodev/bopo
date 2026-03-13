# Attachments Storage Runbook

Use this runbook to diagnose attachment read/write/delete path issues.

## Storage Model

Attachments are materialized under project workspace paths:

- `<projectWorkspace>/.bopo/issues/<issueId>/attachments/<storedFile>`

Project workspace resolution follows managed root policy. Attachment file paths are guarded by inside-root checks.

## Symptoms

- upload succeeds but file is not accessible
- download/delete returns path validation errors
- attachment paths appear outside project workspace roots

## Triage Steps

1. Confirm project primary workspace `cwd` and company root.
2. Inspect attachment metadata (`relativePath`, `fileName`, `issueId`) for malformed values.
3. Verify the resolved absolute path stays inside project workspace root.
4. Check file existence and permissions at the expected storage path.

## Validation Commands

Run doctor checks first:

```bash
pnpm doctor
```

If workspace drift is reported, fix that before attachment-specific debugging.

## Common Root Causes

- project workspace `cwd` misconfigured or migrated incorrectly
- legacy metadata with malformed `relativePath`
- stale files moved manually outside managed workspace
- permissions mismatch on workspace directories

## Recovery

- correct project workspace `cwd` to managed root path
- run backfill dry-run/apply if legacy paths exist
- re-upload affected attachments if metadata points to missing files
- remove invalid attachment metadata rows only after confirming they are unrecoverable

## Prevention

- keep primary workspace paths under company managed root
- avoid manual edits inside `.bopo/issues/...` paths
- run `pnpm doctor` after migrations and before releases

## Related

- [`./workspace-migration-and-backfill-runbook.md`](./workspace-migration-and-backfill-runbook.md)
- [`./workspace-path-surface.md`](./workspace-path-surface.md)
- [`../developer/api-reference.md`](../developer/api-reference.md)
