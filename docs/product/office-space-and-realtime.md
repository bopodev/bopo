# Office Space and Realtime

This page documents Bopo realtime behavior and the office-space model.

## Purpose

Explain how live updates are delivered and how to interpret office occupancy state.

## Intended Audience

- Operators monitoring live execution flow.
- Developers working on websocket or event consistency.

## Prerequisites

- API server running with realtime hub enabled.
- Client connected to `/realtime`.

## Realtime Channels

Current channel families include:

- governance updates (approval lifecycle),
- office-space updates (occupancy and status),
- heartbeat-runs updates (live execution status),
- attention updates (board action queue lifecycle).

Channel behavior:

1. client subscribes with company scope,
2. server sends snapshot event,
3. server emits incremental update events.

## Office Space Model

Rooms:

- `waiting_room`
- `work_space`
- `security`

Occupants include:

- `agent`
- `hire_candidate`

Occupant status includes:

- `idle`
- `working`
- `waiting_for_approval`
- `paused`

## Consistency Expectations

- Snapshot state should fully represent current room occupancy at subscription time.
- Incremental events should converge client state without manual refresh.
- Reconnect should rehydrate from a fresh snapshot before applying new increments.

## Common Pitfalls

- Company scope mismatch in websocket headers or query params.
- Client filtering events before snapshot application.
- Dismiss/seen inbox race conditions when multiple operators act concurrently.
- Missing actor token in authenticated modes causing websocket subscription rejection.

## Related Pages

- Governance model: [`governance-and-approvals.md`](./governance-and-approvals.md)
- Troubleshooting: [`../operations/troubleshooting.md`](../operations/troubleshooting.md)
- Domain model: [`../developer/domain-model.md`](../developer/domain-model.md)

