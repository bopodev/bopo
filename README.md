# Bopo

![Bopo - run your AI company from one control plane](./assets/readme-header.png)

**Bopo is a local-first execution hub for people who run serious coding agents** (Claude Code, Codex, Cursor, OpenCode, and more)—not just another chat window. It is the place where work stays tied to **projects, issues, approvals, runs, and cost**, with **workspace-aware** execution and **file-backed agent memory** you can govern.

If a coding agent is an employee, Bopo is the operating system around that employee.

## Who Bopo Is For

- Builders who juggle **multiple agents and repos** and want work to stay structured.
- Teams that care about **ownership, approvals, and an audit trail** of what ran and what it cost.
- Operators who want **disciplined heartbeats**: right folder, clear task context, optional compact prompts for heavy issues (see [agent heartbeat protocol](docs/guides/agent-heartbeat-protocol.md)).

## Supported agents and runtimes

Bopo connects to the tools you already use. Examples include:

| Runtime | Notes |
| --- | --- |
| Claude Code | |
| Codex | |
| Cursor | Agent CLI with session-oriented execution |
| OpenCode | |
| Gemini CLI | |
| OpenAI API / Anthropic API | Direct API agents |
| HTTP | Generic HTTP heartbeat targets |
| Shell | Scripts and bootstrap flows |

Icons (subset):

| CLI | Brand |
| --- | --- |
| Claude Code | <img src="./assets/icon_claude.svg" alt="Claude Code icon" width="28" /> |
| Codex | <img src="./assets/icon_codex.svg" alt="Codex icon" width="28" /> |
| OpenCode | <img src="./assets/icon_opencode.png" alt="OpenCode icon" width="28" /> |
| Bash | <img src="./assets/icon_bash.svg" alt="Bash icon" width="28" /> |

## How teams use Bopo

1. Turn goals into **projects** and **issues** (optional **PR / external link** on each issue).
2. Hire and configure **agents** with clear roles, budgets, and runtime.
3. **Review approvals**, run **heartbeats**, and watch **runs, traces, and costs** in one place.
4. Use **`bopodev issue shell-env`** to jump from an issue to the right folder and `BOPODEV_*` env in your terminal ([DEVELOPING.md](./DEVELOPING.md)).
5. **Export** a redacted company snapshot via the API for backup or templates (`GET /companies/:id/export` — see [DEVELOPING.md](./DEVELOPING.md)).

## What you get

| Capability | What it does |
| --- | --- |
| Company onboarding | Seeded CEO, starter project, and first issue. |
| Agent lifecycle | Create, configure, pause, resume, terminate. |
| Projects and issues | Assign work, comments, attachments; optional external (e.g. PR) link. |
| Heartbeats | Manual or sweep runs with stop/resume; compact prompt mode for large issues. |
| Governance | Approvals for high-impact actions. |
| Observability | Runs, trace logs, cost signals. |
| Realtime | Governance, office-space, heartbeat status streams. |
| Plugins | Extend heartbeats with capability-governed plugins. |
| Local-first | Embedded Postgres and instance-local workspaces by default. |

## What Bopo is not

- **Not a chat wrapper** — structured execution, not ad hoc prompting.
- **Not a single-agent toy** — built for multi-agent accountability.
- **Not a generic workflow builder** — opinionated “company” model for agent ops.
- **Not a replacement for your coding agent** — Bopo coordinates; agents still do the work.

## Quickstart

```bash
npx bopodev onboard
```

Then open `http://localhost:4010`, create a project, assign an issue, and run your first heartbeat.

## Contributing / development

- **[DEVELOPING.md](./DEVELOPING.md)** — install, dev servers, tests, DB, CLI, export API.
- **[AGENTS.md](./AGENTS.md)** — pointers for AI-assisted contributors.

## Documentation

- Docs home: [`docs/index.md`](./docs/index.md)
- Getting started: [`docs/getting-started-and-dev.md`](./docs/getting-started-and-dev.md)
- Product guides: [`docs/product/index.md`](./docs/product/index.md)
- Developer references: [`docs/developer/index.md`](./docs/developer/index.md)
- Operations runbooks: [`docs/operations/index.md`](./docs/operations/index.md)
- Release docs: [`docs/release/index.md`](./docs/release/index.md)
- Workspace/path canonical model: [`docs/developer/workspace-resolution-reference.md`](./docs/developer/workspace-resolution-reference.md)
- Workspace migration/backfill runbook: [`docs/operations/workspace-migration-and-backfill-runbook.md`](./docs/operations/workspace-migration-and-backfill-runbook.md)
