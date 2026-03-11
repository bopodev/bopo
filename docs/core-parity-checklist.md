# BopoDev Core Parity Checklist (Behavioral Baseline)

This checklist tracks whether BopoDev behaves like a usable production-ready control plane, not just whether tables, routes, or placeholders exist.

## What Counts As Parity

A feature is only marked complete when a user can exercise it end-to-end in the app or API and observe the expected state change, audit trail, and UI feedback.

## Platform Foundation

- [x] Workspace boots with a real API + web split on the documented ports.
- [x] Embedded Postgres runtime can initialize a fresh local database automatically.
- [x] Web data loading can recover when the configured default company does not exist by falling back to a real company or a first-run empty state.

## Company / Project / Issue Graph

- [x] A new user can create a company, then create a project inside that company, then create issues scoped to that project.
- [x] Issues preserve assignee, priority, labels, tags, and optional body text through API reads.
- [x] Issue comments support create, update, list, and delete flows end-to-end.
- [x] The issue workspace uses explicit issue selection instead of inferring selection from the first filtered row.

## Goal Alignment

- [x] Goals can be created at company, project, or agent level.
- [x] Goal activation requests can be queued for approval rather than immediately mutating state.
- [x] Approved goal activation requests create an active goal rather than only updating approval status.
- [x] Heartbeat prompt context includes company mission plus active company/project/agent goals.

## Agents / Org Chart / Heartbeats

- [x] Agents persist role, provider, manager, heartbeat cadence, budget, and runtime state.
- [x] Agent creation supports Claude Code, Codex, HTTP, and shell runtime providers.
- [x] Heartbeat sweeps respect per-agent cron cadence instead of blindly running every idle agent.
- [x] Assigned issues are claimed atomically during a heartbeat run.
- [x] Successful heartbeats can move assigned issues into review and record a traceable run.
- [x] Runtime prompt and usage parsing work with real single-line JSON summaries instead of synthetic placeholder accounting.
- [x] Runtime adapters inject shared skills for Codex and Claude Code without writing into agent working directories.

## Governance + Cost Controls

- [x] Governance queue entries are visible with parsed payloads.
- [x] Approving a queued hire request creates the agent.
- [x] Approving a queued goal activation request creates the activated goal.
- [x] Reject and override flows resolve the approval without applying the queued action.
- [x] Budget hard-stops prevent execution and leave an observable skipped heartbeat run.
- [x] Successful runtime executions write cost ledger entries with token and USD data.

## Observability / Traceability

- [x] Audit log responses expose parsed payloads suitable for UI inspection.
- [x] Heartbeat runs expose status, timestamps, and summary messages.
- [x] Cost ledger rows are visible in the workspace and API with normalized numeric USD values.

## Linear / shadcn Style UX

- [x] The workspace shell supports company scoping, dense navigation, and a dedicated right-hand detail pane.
- [x] The issues surface supports list/board views, stable detail context, comments, cost summary, and heartbeat actions.
- [x] Governance is actionable from the UI, not just a passive list.
- [x] Settings exposes real runtime defaults and company-context controls rather than a placeholder panel.
- [x] Shared UI primitives apply the same denser dark treatment across cards, buttons, inputs, and modals.

## Verification

- [x] `pnpm typecheck`
- [x] `pnpm test`
