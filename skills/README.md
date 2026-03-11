# Runtime-Injected Skills

This directory contains shared agent skills that are injected at runtime for local adapters.

- `codex`: symlinked into `$CODEX_HOME/skills` (or `~/.codex/skills`).
- `claude_code`: mounted through a temporary `--add-dir` path containing `.claude/skills`.

These files are loaded by the agent runtime on demand and are not copied into project working directories.

Skill authoring and safety conventions are defined in `skills/SKILL_SPEC.md`.
