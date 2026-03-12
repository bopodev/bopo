import { describe, expect, it } from "vitest";
import { resolveCodexRuntimeUsage } from "../packages/adapters/codex/src/server/parse";
import { resolveCursorRuntimeUsage } from "../packages/adapters/cursor/src/server/parse";
import { resolveGeminiRuntimeUsage } from "../packages/adapters/gemini-cli/src/server/parse";
import { resolveClaudeRuntimeUsage } from "../packages/adapters/claude-code/src/server/parse";

describe("adapter usage resolution", () => {
  it("uses codex stderr usage when stdout is summary-only", () => {
    const resolved = resolveCodexRuntimeUsage({
      stdout: "{\"summary\":\"completed work\"}\n",
      stderr: "{\"type\":\"result\",\"usage\":{\"input_tokens\":900,\"cache_read_input_tokens\":100,\"output_tokens\":250},\"total_cost_usd\":0.0042}\n",
      parsedUsage: { summary: "completed work" },
      structuredOutputSource: "stdout"
    });

    expect(resolved.structuredOutputSource).toBe("stderr");
    expect(resolved.parsedUsage?.summary).toBe("completed work");
    expect(resolved.parsedUsage?.inputTokens).toBe(900);
    expect(resolved.parsedUsage?.cachedInputTokens).toBe(100);
    expect(resolved.parsedUsage?.outputTokens).toBe(250);
    expect(resolved.parsedUsage?.tokenInput).toBe(1000);
    expect(resolved.parsedUsage?.usdCost).toBe(0.0042);
  });

  it("parses cursor stream usage into normalized contract", () => {
    const resolved = resolveCursorRuntimeUsage({
      stdout:
        "{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"done\"}]}}\n" +
        "{\"type\":\"result\",\"usage\":{\"input_tokens\":123,\"output_tokens\":45},\"total_cost_usd\":0.001}\n",
      stderr: "",
      parsedUsage: undefined,
      structuredOutputSource: undefined
    });

    expect(resolved.structuredOutputSource).toBe("stdout");
    expect(resolved.parsedUsage?.summary).toBe("done");
    expect(resolved.parsedUsage?.inputTokens).toBe(123);
    expect(resolved.parsedUsage?.cachedInputTokens).toBe(0);
    expect(resolved.parsedUsage?.outputTokens).toBe(45);
    expect(resolved.parsedUsage?.tokenInput).toBe(123);
    expect(resolved.parsedUsage?.tokenOutput).toBe(45);
    expect(resolved.parsedUsage?.usdCost).toBe(0.001);
  });

  it("parses gemini nested usage payloads", () => {
    const resolved = resolveGeminiRuntimeUsage({
      stdout:
        "{\"type\":\"result\",\"response\":{\"usageMetadata\":{\"promptTokenCount\":700,\"cachedContentTokenCount\":80,\"candidatesTokenCount\":120}},\"total_cost_usd\":0.0031}\n",
      stderr: "",
      parsedUsage: undefined,
      structuredOutputSource: undefined
    });

    expect(resolved.structuredOutputSource).toBe("stdout");
    expect(resolved.parsedUsage?.inputTokens).toBe(780);
    expect(resolved.parsedUsage?.cachedInputTokens).toBe(0);
    expect(resolved.parsedUsage?.outputTokens).toBe(120);
    expect(resolved.parsedUsage?.tokenInput).toBe(780);
    expect(resolved.parsedUsage?.usdCost).toBe(0.0031);
  });

  it("parses claude result usage into normalized contract", () => {
    const resolved = resolveClaudeRuntimeUsage({
      stdout:
        "{\"type\":\"assistant\",\"message\":{\"content\":[{\"type\":\"text\",\"text\":\"all set\"}]}}\n" +
        "{\"type\":\"result\",\"usage\":{\"input_tokens\":320,\"output_tokens\":64},\"total_cost_usd\":0.0024}\n",
      stderr: "",
      parsedUsage: undefined,
      structuredOutputSource: undefined
    });

    expect(resolved.structuredOutputSource).toBe("stdout");
    expect(resolved.parsedUsage?.summary).toBe("all set");
    expect(resolved.parsedUsage?.inputTokens).toBe(320);
    expect(resolved.parsedUsage?.cachedInputTokens).toBe(0);
    expect(resolved.parsedUsage?.outputTokens).toBe(64);
    expect(resolved.parsedUsage?.tokenInput).toBe(320);
    expect(resolved.parsedUsage?.tokenOutput).toBe(64);
    expect(resolved.parsedUsage?.usdCost).toBe(0.0024);
  });
});
