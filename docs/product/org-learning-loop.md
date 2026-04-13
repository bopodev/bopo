# Organization Learning Loop

This document describes the policy-bounded learning loop that converts recurring execution signals into actionable recommendations.

## What it does

- Generates attention suggestions for:
  - manager span-of-control overload (`org_suggestion`)
  - recurring run-failure patterns (`learning_suggestion`)
- Publishes a weekly learning summary audit event (`org_learning.weekly_summary_published`) from scheduler sweeps.

## Governance model

- Suggestions are recommendations only, not automatic structural mutations.
- Structural changes are expected to flow through governance approvals (for example `reassign_agent_manager`).
- Operators can review suggestions in Inbox and Org Chart surfaces before acting.

## Configuration

- `BOPO_FEATURE_ORG_LEARNING`
- `BOPO_ORG_LEARNING_SWEEP_MS`

## Related

- `docs/product/governance-and-approvals.md`
- `docs/product/agent-memory-workflow.md`
