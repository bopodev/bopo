# Adapters Overview

Adapters connect heartbeat orchestration to a specific runtime provider.

## Built-in adapter types

- `claude_code`
- `codex`
- `cursor`
- `opencode`
- `openai_api`
- `anthropic_api`
- `http`
- `shell`

`openai_api` and `anthropic_api` are first-class direct API adapters for server environments where local Codex/Claude CLIs are unavailable.

## Provider selection quick guide

- Use `codex` / `claude_code` when you want CLI-native behavior on hosts where those CLIs are installed.
- Use `opencode` when you want OpenCode CLI execution; configure `runtimeModel` in `provider/model` format.
- Use `openai_api` / `anthropic_api` for direct provider API execution with API keys only.
- Use `http` / `shell` for custom worker commands or bespoke runtime wrappers.

## Runtime contract

Each adapter should provide:

- execution (`execute(context) -> AdapterExecutionResult`)
- model listing (`listModels`) when model selection is relevant
- environment diagnostics (`testEnvironment`) with `info|warn|error` checks

## Reliability expectations

- run in configured `cwd` and surface command health failures clearly
- produce structured usage and summary when possible
- preserve stable retry and timeout behavior
- keep adapter output bounded in traces for observability

## API endpoints

- `GET /agents/adapter-metadata`
- `GET /agents/adapter-models/:providerType`
- `POST /agents/runtime-preflight`

## Related docs

- Runtime and architecture context: [`docs/developer/architecture.md`](../developer/architecture.md)
- API route details: [`docs/developer/api-reference.md`](../developer/api-reference.md)
- Config and environment variables: [`docs/developer/configuration-reference.md`](../developer/configuration-reference.md)
- Adapter implementation steps: [`docs/adapter-authoring.md`](../adapter-authoring.md)
