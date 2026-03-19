# Daily Workflows

This page describes the default operator loop for running Bopo daily.

## Purpose

Provide an end-to-end operating sequence for projects, issues, and goals.

## Intended Audience

- Team leads and operators managing execution queues.

## Prerequisites

- Bopo instance running locally.
- At least one company exists.
- At least one active agent exists.

## Daily Operating Loop

1. **Triage issues**
   - Review `issues` view by status and priority.
   - Ensure each issue is linked to the right project and has clear acceptance criteria.
2. **Align goals**
   - Check active company/project goals in `goals`.
   - Update goal status to avoid stale planning context.
3. **Prepare execution**
   - Verify issue assignees and dependencies.
   - Confirm agent budget and heartbeat cadence for critical queues.
4. **Run execution**
   - Trigger targeted heartbeats for urgent issues.
   - Run sweeps for broader progress.
5. **Review outcomes**
   - Inspect `runs` and `trace-logs`.
   - Download/inspect run artifacts from run details when output quality needs verification.
   - Move successful issues to review/done, and unblock failures.
6. **Close governance actions**
   - Resolve pending approvals in `governance`/`inbox`.
   - Confirm side effects were applied (or intentionally blocked).
7. **Clear attention queue**
   - Review `inbox` attention items, acknowledge what is understood, dismiss intentional deferrals, and resolve completed board actions.

## Recommended Project Structure

- Keep one project per coherent initiative.
- Keep issues small enough for one or a few heartbeat runs.
- Use issue comments for operator decisions and handoffs.
- Attach relevant artifacts to issues to avoid context drift.

## Failure Handling

- If runs fail repeatedly, check:
  - agent runtime command/model configuration,
  - working directory and environment variables,
  - governance blocks (pending approval),
  - budget or timeout constraints.
- If artifacts are missing from run detail:
  - verify the run finished and produced artifacts,
  - confirm artifact paths remain inside company workspace roots.
- Escalate using operations docs:
  - [`../operations/troubleshooting.md`](../operations/troubleshooting.md)
  - [`../operations/runbooks-index.md`](../operations/runbooks-index.md)

## Related Pages

- Product overview: [`overview.md`](./overview.md)
- Agents and runs: [`agents-and-runs.md`](./agents-and-runs.md)
- Governance: [`governance-and-approvals.md`](./governance-and-approvals.md)

