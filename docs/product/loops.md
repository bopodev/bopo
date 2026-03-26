# Work loops (scheduled recurring work)

**Work loops** are named, recurring definitions that **create an issue** for an assignee agent and **wake a heartbeat** focused on that issue. They complement the agent’s own **heartbeat schedule** (`heartbeatCron`), which is a general “poll and work the queue” cadence.

## When to use a loop

- You want a **calendar-style** job (“every weekday at 9:00 in `Europe/Stockholm`”) with an auditable **run history**.
- You need **delivery rules** when a previous run is still open: **coalesce**, **skip**, or **always enqueue** another issue.
- You need **catch-up** behavior after downtime: **skip missed** windows vs **enqueue missed** up to a **cap**.

## How it runs

1. A **schedule trigger** (cron + timezone, or a daily/weekly preset) becomes due.
2. The system applies **concurrency** and **catch-up** policies.
3. When it creates work, it opens an issue (tagged `work-loop`, with `loopId` / `loopRunId` on the issue row) and enqueues a **manual** heartbeat job with `wakeContext.issueIds` so the assignee focuses on that issue.

## UI

Under **Loops** in the sidebar: list, create, toggle **Active**, **Run now**, and a detail page with **Triggers**, **Runs**, and **Activity** (audit events for that loop).

## API and permissions

See [`../developer/api-reference.md`](../developer/api-reference.md) — routes under `/loops` require `loops:read`, `loops:write`, and `loops:run` (manual run) as documented.

## Templates

When applying a company template, entries in `manifest.recurrence` with `targetType: "agent"` create a work loop plus a cron trigger for the resolved agent, using the first project in the manifest as scope.
