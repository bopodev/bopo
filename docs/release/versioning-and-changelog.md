# Versioning and Changelog

This page defines how Bopo versions are incremented and how release notes are written.

## Purpose

Keep release semantics predictable for users and contributors.

## Versioning Policy

Use semantic versioning:

- **Patch**: bug fixes and non-breaking behavior improvements.
- **Minor**: new backward-compatible features.
- **Major**: breaking API/config/runtime behavior changes.

## What Counts as Breaking

- Removed or changed API fields/endpoints used by current clients.
- Changed required headers or control-plane runtime env contracts.
- Removed adapter/provider behavior without compatibility path.
- Config changes requiring manual migration with no fallback.

## Changelog Content Standard

Each release note should include:

1. user-facing product changes,
2. developer/API/runtime changes,
3. operational and config impacts,
4. migration or rollback notes if relevant.

## Recommended Release Note Structure

- **Summary**
- **What changed**
- **Upgrade notes**
- **Validation notes**

## Source Inputs for Changelog

- merged PRs since last stable tag,
- commit history in release branch,
- changesets or package version diffs,
- issue/goal references for user-visible impact.

## Related Pages

- Release process: [`../release-process.md`](../release-process.md)
- Release gates: [`../release-gate-checklist.md`](../release-gate-checklist.md)

