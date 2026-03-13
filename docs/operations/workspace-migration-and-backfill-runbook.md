# Workspace Migration and Backfill Runbook

Use this runbook when workspace paths are missing, relative, or outside managed roots.

## When to Run

- doctor reports workspace path drift
- projects fail due to runtime cwd validation
- legacy installs contain relative workspace paths
- post-upgrade verification requires path normalization checks

## Safety Model

Managed workspace root:

- `<instanceRoot>/workspaces`

Managed company root:

- `<instanceRoot>/workspaces/<companyId>`

Backfill rewrites legacy workspace `cwd` values into deterministic managed-root paths.

## Preconditions

1. Snapshot/backup the local DB file.
2. Ensure API/worker processes are not concurrently mutating workspace records.
3. Confirm `BOPO_INSTANCE_ROOT`, `BOPO_HOME`, and `BOPO_INSTANCE_ID` values used by the process.

## Step 1: Dry Run

```bash
BOPO_BACKFILL_DRY_RUN=1 pnpm --filter bopodev-api workspaces:backfill
```

Expected output is JSON including:

- `scannedProjects`
- `missingWorkspaceLocalPath`
- `relativeWorkspaceLocalPath`
- `updatedProjects` (should be `0` in dry-run)

## Step 2: Apply

```bash
BOPO_BACKFILL_DRY_RUN=0 pnpm --filter bopodev-api workspaces:backfill
```

Expected:

- missing workspaces are created under managed root
- relative workspace paths are normalized to managed-root absolute paths

## Step 3: Verify

Run doctor:

```bash
pnpm doctor
```

Check these lines:

- `Workspace path drift` is `ok`
- `Project workspace coverage` is `ok`

## Remediation Cases

- **Drift detected outside managed root**
  - inspect suspicious directory contents
  - move or archive only after confirming no active dependency
  - rerun doctor

- **Backfill reports invalid/failed updates**
  - inspect DB rows for malformed workspace IDs or paths
  - correct rows and rerun dry-run, then apply

- **Runtime still fails with path-boundary errors**
  - check agent `runtimeCwd` and project primary workspace `cwd` values
  - ensure both are under company managed root

## Rollback

If apply mode causes unexpected behavior:

1. stop API/runtime processes
2. restore DB from backup
3. restore any moved workspace directories
4. rerun dry-run and validate before reapplying

## Related

- [`./workspace-path-surface.md`](./workspace-path-surface.md)
- [`../developer/workspace-resolution-reference.md`](../developer/workspace-resolution-reference.md)
- [`./attachments-storage-runbook.md`](./attachments-storage-runbook.md)
