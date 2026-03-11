# Bopo Skill Specification

This document defines how runtime-injected skills must be authored in this repository.

It is intentionally concept-aligned with industry control-plane skill patterns while
remaining original in wording and structure.

## Objectives

- Keep skills actionable in short heartbeat-style executions.
- Encode operational safety rules in plain language.
- Make skill behavior testable through runtime prompts and integration tests.
- Avoid vendor lock-in by describing behavior, not product branding.

## Required Sections

Every `SKILL.md` must include:

1. `name` and `description` in frontmatter.
2. A one-paragraph "When to use" section.
3. Authentication/env requirements.
4. Ordered execution workflow.
5. Critical safety rules.
6. Output/comment style expectations.
7. A compact endpoint/action reference (for API-oriented skills).

## Authoring Rules

- Do not copy third-party skill content verbatim.
- Preserve logic and invariants, but rewrite examples and phrasing.
- Keep examples realistic and executable.
- Prefer concise, operator-friendly language over policy-heavy prose.
- Use ASCII text by default.

## Safety Invariants

Skills that coordinate control-plane work must encode these invariants:

- Checkout/claim before doing task work.
- Never retry lock conflicts (`409`/ownership conflict).
- Always provide a completion or blocked update before exit.
- If blocked, include why and who/what unblocks it.
- Do not perform unassigned work unless explicit handoff rules allow it.

## Environment Gating

Skills may be injected broadly, but runtime behavior is gated by credentials.

- Control-plane actions are allowed only when required env vars are present.
- Missing credentials must result in local-work fallback and concise reporting.
- Skills must explicitly list required and optional env vars.

## Testability Requirements

When skill logic affects runtime behavior, add tests that verify:

- Prompt includes the relevant directives.
- Runtime keeps safe defaults (sandboxed mode, bounded retries).
- Credential gating behavior is represented in diagnostics/trace.

## Versioning Guidance

- Treat skill edits like code changes (review, rationale, changelog entry when needed).
- Preserve backward compatibility for existing automation unless intentionally changed.
