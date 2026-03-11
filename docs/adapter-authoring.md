# Adapter Authoring Guide

This guide describes how to add a new first-class runtime adapter.

## 1) Register provider contract

- Add the provider value to `ProviderTypeSchema` in `packages/contracts/src/index.ts`.
- Ensure DB repository input types accept the provider in `packages/db/src/repositories.ts`.

## 2) Implement adapter behavior

Add implementation in `packages/agent-sdk/src/adapters.ts`:

- adapter class implementing `AgentAdapter`
- metadata entry in `listAdapterMetadata()`
- model discovery or static model options in `listAdapterModels()`
- environment checks in `testAdapterEnvironment()`

## 3) Runtime integration

If the adapter needs provider-specific runtime behavior:

- update `packages/agent-sdk/src/runtime.ts`
- add provider-specific command args and skill injection behavior

## 4) API and UI integration

- API: expose metadata/models and preflight support in `apps/api/src/routes/agents.ts`
- UI: include provider in configuration screens and model selectors:
  - `apps/web/src/components/modals/create-agent-modal.tsx`
  - `apps/web/src/components/agent-runtime-defaults-card.tsx`
  - `apps/web/src/lib/agent-runtime-options.ts`

## 5) Validation checklist

- `pnpm typecheck` passes
- `pnpm test` passes
- runtime preflight returns actionable checks
- adapter appears in metadata and create/edit agent flow
- model list endpoint returns stable options

## Related docs

- Domain entities and terminology: [`docs/developer/domain-model.md`](./developer/domain-model.md)
- Route-level API details: [`docs/developer/api-reference.md`](./developer/api-reference.md)
- Runtime config/env variables: [`docs/developer/configuration-reference.md`](./developer/configuration-reference.md)
