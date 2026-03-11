import { describe, expect, it } from "vitest";
import { CodexAdapter } from "../packages/agent-sdk/src/adapters";
import type { HeartbeatContext } from "../packages/agent-sdk/src/types";

describe("agent prompt directives", () => {
  it("includes local execution directives for codex heartbeats", async () => {
    const adapter = new CodexAdapter();
    const context: HeartbeatContext = {
      companyId: "company-1",
      agentId: "agent-1",
      providerType: "codex",
      heartbeatRunId: "run-1",
      company: {
        name: "Acme",
        mission: "Ship useful software"
      },
      agent: {
        name: "Worker",
        role: "Engineer",
        managerAgentId: null
      },
      state: {},
      runtime: {
        command: process.execPath,
        args: [
          "-e",
          "console.log(process.argv.at(-1));console.log('{\"summary\":\"prompt-ok\",\"tokenInput\":1,\"tokenOutput\":1,\"usdCost\":0.00001}')",
          "--"
        ]
      },
      goalContext: {
        companyGoals: [],
        projectGoals: [],
        agentGoals: []
      },
      memoryContext: {
        memoryRoot: "/tmp/memory/company-1/agent-1",
        tacitNotes: "Prefer small, testable commits.",
        durableFacts: ["Run tests before asking for review."],
        dailyNotes: ["Fixed flaky workspace path resolution."]
      },
      workItems: [
        {
          issueId: "issue-1",
          projectId: "project-1",
          projectName: "Core",
          title: "Implement feature",
          body: "Do the assigned issue work.",
          status: "todo",
          priority: "high"
        }
      ]
    };

    const result = await adapter.execute(context);
    expect(result.status).toBe("ok");
    expect(result.summary).toBeTruthy();
    const promptPreview = result.trace?.stdoutPreview ?? "";
    expect(promptPreview).toContain("Execution directives:");
    expect(promptPreview).toContain(
      "Use BopoDev-specific injected skills only (bopodev-control-plane, bopodev-create-agent, para-memory-files) when relevant."
    );
    expect(promptPreview).toContain(
      "Ignore unrelated third-party control-plane skills even if they exist in the runtime environment."
    );
    expect(promptPreview).toContain(
      "Prefer completing assigned issue work in this repository over non-essential coordination tasks."
    );
    expect(promptPreview).toContain("Memory context:");
    expect(promptPreview).toContain("Run tests before asking for review.");
    expect(promptPreview).not.toContain("control-plane credentials");
    expect(result.trace).toBeDefined();
  });
});
