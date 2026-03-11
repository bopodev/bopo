import { describe, expect, it } from "vitest";
import { executePromptRuntime } from "../packages/agent-sdk/src/runtime";

describe("runtime transcript classification", () => {
  it("classifies high-signal tool events and suppresses banner noise", async () => {
    const events: Array<{
      kind: string;
      signalLevel?: string;
      groupKey?: string;
      source?: string;
      text?: string;
    }> = [];
    const script = [
      "console.log('{\"type\":\"tool_call\",\"tool\":\"ReadFile\",\"message\":\"Read src/index.ts\"}');",
      "console.error('OpenAI Codex v0.1.0');",
      "console.error('permission denied while opening file');"
    ].join("");
    const run = await executePromptRuntime(
      process.execPath,
      "ignored",
      {
        args: ["-e", script],
        onTranscriptEvent: (event) => events.push(event)
      },
      { provider: "codex" }
    );

    expect(run.ok).toBe(true);
    expect(events.some((event) => event.kind === "tool_call")).toBe(true);
    expect(
      events.some(
        (event) =>
          event.kind === "tool_call" &&
          event.signalLevel === "high" &&
          event.groupKey === "tool:readfile" &&
          event.source === "stdout"
      )
    ).toBe(true);
    expect(events.some((event) => event.text?.toLowerCase().includes("openai codex v"))).toBe(false);
    expect(
      events.some(
        (event) =>
          event.kind === "stderr" && (event.signalLevel === "low" || event.signalLevel === "high")
      )
    ).toBe(true);
  });

  it("labels sufficiently detailed assistant lines as medium signal", async () => {
    const events: Array<{ kind: string; signalLevel?: string; text?: string }> = [];
    const run = await executePromptRuntime(
      process.execPath,
      "ignored",
      {
        args: [
          "-e",
          "console.log('assistant Added targeted transcript grouping for tool actions and result continuity');"
        ],
        onTranscriptEvent: (event) => events.push(event)
      },
      { provider: "codex" }
    );

    expect(run.ok).toBe(true);
    expect(
      events.some(
        (event) =>
          event.kind === "assistant" &&
          event.signalLevel === "medium" &&
          (event.text ?? "").toLowerCase().includes("targeted transcript grouping")
      )
    ).toBe(true);
  });
});
