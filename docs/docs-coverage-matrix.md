# Documentation Coverage Matrix

This matrix tracks how Bopo functionality maps to documentation areas and where coverage still needs to expand.

## Product Surface Coverage

| Functional area | Primary UI sections | Current docs | Coverage status | Planned docs |
| --- | --- | --- | --- | --- |
| Company and project setup | Dashboard, Projects, Issues | `README.md`, `docs/getting-started-and-dev.md` | Partial | `docs/product/overview.md`, `docs/product/daily-workflows.md` |
| Issue planning and execution | Issues, Runs | `README.md` | Partial | `docs/product/daily-workflows.md`, `docs/product/agents-and-runs.md` |
| Goal alignment | Goals | `docs/core-parity-checklist.md` | Partial | `docs/product/daily-workflows.md`, `docs/developer/domain-model.md` |
| Agent lifecycle and runtime config | Agents, Organization, Settings | `README.md`, `docs/adapters/overview.md` | Partial | `docs/product/agents-and-runs.md`, `docs/developer/configuration-reference.md` |
| Governance and approval inbox | Governance, Inbox | `docs/core-parity-checklist.md` | Partial | `docs/product/governance-and-approvals.md` |
| Realtime office coordination | Office Space, Inbox | none dedicated | Missing | `docs/product/office-space-and-realtime.md` |
| Observability and costs | Runs, Logs, Costs | `README.md`, `docs/codex-connection-debugging.md` | Partial | `docs/product/agents-and-runs.md`, `docs/operations/troubleshooting.md` |

## Developer and Platform Coverage

| Platform area | Current docs | Coverage status | Planned docs |
| --- | --- | --- | --- |
| Local onboarding and commands | `docs/getting-started-and-dev.md` | Good | Keep and cross-link |
| Adapter architecture and authoring | `docs/adapters/overview.md`, `docs/adapter-authoring.md` | Good | Keep and cross-link |
| System architecture overview | `docs/getting-started-and-dev.md` | Partial | `docs/developer/architecture.md` |
| Domain model and canonical terms | `packages/contracts/src/index.ts` (code only) | Missing | `docs/glossary.md`, `docs/developer/domain-model.md` |
| API endpoint reference | route code only | Missing | `docs/developer/api-reference.md` |
| Environment and runtime configuration | partial in `docs/getting-started-and-dev.md`, `.env.example` | Partial | `docs/developer/configuration-reference.md` |
| Contribution workflow | none dedicated | Missing | `docs/developer/contributing.md` |

## Operations and Release Coverage

| Operations area | Current docs | Coverage status | Planned docs |
| --- | --- | --- | --- |
| Codex-specific runbook | `docs/codex-connection-debugging.md` | Good (narrow scope) | Keep and link from runbooks index |
| General troubleshooting and incident triage | none central | Missing | `docs/operations/troubleshooting.md`, `docs/operations/runbooks-index.md` |
| Deployment guidance | none dedicated | Missing | `docs/operations/deployment.md` |
| Release workflow | `docs/getting-started-and-dev.md` references only | Missing | `docs/release-process.md`, `docs/release-gate-checklist.md` |
| Versioning and changelog policy | none dedicated | Missing | `docs/release/versioning-and-changelog.md` |

