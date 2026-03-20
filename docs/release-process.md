# Release Process

This page defines the standard workflow for shipping a Bopo release.

## Purpose

Provide a repeatable release flow with explicit quality and publication steps.

## Intended Audience

- Release owners and maintainers.

## Prerequisites

- All release gates pass in local or CI verification.
- Working tree is clean or changes are intentionally scoped.
- Version/changelog updates are prepared.

Gate reference: [`docs/release-gate-checklist.md`](./release-gate-checklist.md)

## Release Steps

1. **Prepare branch**
   - Pull latest main branch.
   - Ensure no pending migration or contract break is undocumented.
2. **Run release gates**
   - Execute full gate commands in checklist.
   - If the release includes schema changes, verify `pnpm db:migrate` succeeds locally.
3. **Finalize release notes**
   - Summarize user-facing and operator-impacting changes.
   - Highlight breaking or config-affecting changes.
4. **Version and tag**
   - Apply semver bump according to policy.
   - Ensure workspace package versions are synchronized.
   - Create annotated release tag.
5. **Publish artifacts**
   - Dry-run publish sequence: `pnpm publish:all:dry`.
   - Publish packages/artifacts: `pnpm publish:all`.
6. **Post-release validation**
   - Verify install/start flow.
   - Run `pnpm upgrade:local -- --no-start` against a local instance to confirm migrations verify cleanly.
   - Verify critical routes and heartbeat behavior.
7. **Announce and follow up**
   - Share release summary and known caveats.
   - Track regressions in first 24h window.

## Rollback Guidance

- If publication is partial or broken:
  - stop further publishing,
  - document what shipped vs failed,
  - prepare patch release rather than force-overwriting history.

## Related Pages

- Gate checklist: [`release-gate-checklist.md`](./release-gate-checklist.md)
- Versioning policy: [`release/versioning-and-changelog.md`](./release/versioning-and-changelog.md)
- Changelog: [`../CHANGELOG.md`](../CHANGELOG.md)

