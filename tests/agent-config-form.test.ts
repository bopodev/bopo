import { describe, expect, it } from "vitest";
import { formatEnvInput, parseArgsInput, parseEnvInput } from "../apps/web/src/lib/agent-config-form";

describe("agent config form helpers", () => {
  it("parses quoted runtime args", () => {
    const parsed = parseArgsInput('--model gpt-5.3-codex --note "hello world" --flag');
    expect(parsed).toEqual(["--model", "gpt-5.3-codex", "--note", "hello world", "--flag"]);
  });

  it("parses multiline environment variables", () => {
    const parsed = parseEnvInput(
      `
# comment
FOO=bar
BAR=baz qux
`
    );
    expect(parsed).toEqual({ FOO: "bar", BAR: "baz qux" });
  });

  it("formats environment variables deterministically", () => {
    const formatted = formatEnvInput({ Z: "2", A: "1" });
    expect(formatted).toBe("A=1\nZ=2");
  });
});
