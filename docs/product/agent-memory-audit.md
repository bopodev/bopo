# Agent Memory Baseline Audit

This audit captures current memory behavior in production code before introducing memory upgrades.

## Storage Model

- Memory is file-backed under a deterministic company+agent path:
  - `<instance-root>/workspaces/<companyId>/agents/<agentId>/memory`
- Core files:
  - `MEMORY.md` (tacit memory)
  - `memory/YYYY-MM-DD.md` (episodic daily notes)
  - `life/items.yaml` and optional `life/summary.md` (durable memory)
- There is no dedicated SQL memory table in the main schema. SQL is used for run state, governance actions, plugin runs, and audit trails.

## Runtime Flow

1. Heartbeat claims work and resolves runtime context.
2. Memory context is loaded before adapter execution:
   - tacit notes from `MEMORY.md`
   - durable facts from `life/summary.md` and `life/items.yaml`
   - recent daily notes from latest daily files
3. Prompt assembly injects memory with company mission, goals, and work items.
4. After adapter execution:
   - daily episodic note is appended
   - candidate fact(s) are derived from run summary
   - successful runs promote candidate facts to durable memory
5. Governance approvals can separately promote durable facts via `promote_memory_fact`.

## Guardrails And Limits

- Memory read injection caps:
  - tacit notes: 1,500 chars
  - durable facts: 12 lines
  - daily notes: 12 lines from up to 3 recent daily files
- Observability memory API caps:
  - list max files: 200
  - read max file size: 512 KB
  - read path constrained to memory root

## Current Risks

- Durable promotions are append-only and currently allow duplicates.
- Durable fact reads are line-based, so YAML metadata lines can leak into prompt facts.
- Candidate extraction is summary-slice based and can promote noisy or unstable statements.
- Daily and durable files have no retention/compaction policy.
- Hard failure paths can skip episodic capture.
- Web app has no first-class memory management UI (mission and prompts are adjacent but not memory-native).

## Observability Surfaces

- `GET /observability/memory` lists memory files.
- `GET /observability/memory/:agentId/file?path=...` reads memory file content.
- Audit events include memory lifecycle events such as:
  - `heartbeat.memory_updated`
  - `heartbeat.memory_fact_promoted`
