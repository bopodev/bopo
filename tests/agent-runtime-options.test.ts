import { describe, expect, it } from "vitest";
import { getModelOptionsForProvider } from "../apps/web/src/lib/agent-runtime-options";

describe("agent runtime options", () => {
  it("keeps OpenCode empty by default and preserves custom current models", () => {
    const base = getModelOptionsForProvider("opencode");
    expect(base.some((option) => option.value === "openai/gpt-5")).toBe(false);

    const withCustom = getModelOptionsForProvider("opencode", "anthropic/claude-sonnet-4-5");
    expect(withCustom.some((option) => option.value === "anthropic/claude-sonnet-4-5")).toBe(true);
  });
});
