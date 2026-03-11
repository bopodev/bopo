# Release Gate Checklist

Use this checklist before creating a release tag.

## Purpose

Define non-negotiable quality gates for shipping Bopo safely.

## Mandatory Gates

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test:coverage`
- [ ] `pnpm test:e2e`
- [ ] `pnpm build`

## Behavioral Gates

- [ ] Core workflow sanity verified:
  - company/project/issue creation and editing
  - agent creation and heartbeat execution
  - governance request resolve flow
- [ ] Realtime sanity verified:
  - governance updates visible
  - office-space state updates visible
- [ ] Observability sanity verified:
  - runs list, trace logs, and costs load correctly

## Configuration Gates

- [ ] `.env.example` matches current required variables.
- [ ] New environment variables are documented in [`docs/developer/configuration-reference.md`](./developer/configuration-reference.md).
- [ ] Runtime provider assumptions are documented.

## Documentation Gates

- [ ] User-facing changes reflected in product docs.
- [ ] Developer-facing API/contract changes reflected in developer docs.
- [ ] Release notes/changelog prepared with upgrade caveats.

## Final Release Readiness

- [ ] Release owner assigned.
- [ ] Rollback/patch plan identified.
- [ ] Version and tag strategy confirmed.

## Related Pages

- Process: [`release-process.md`](./release-process.md)
- Versioning: [`release/versioning-and-changelog.md`](./release/versioning-and-changelog.md)

