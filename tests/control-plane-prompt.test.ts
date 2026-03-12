import { describe, expect, it } from "vitest";
import { createPrompt } from "../packages/agent-sdk/src/adapters";
import type { HeartbeatContext } from "../packages/agent-sdk/src/types";

describe("control-plane prompt directives", () => {
  it("includes a safe direct-header curl template", () => {
    const context: HeartbeatContext = {
      companyId: "company-1",
      agentId: "agent-1",
      providerType: "gemini_cli",
      heartbeatRunId: "run-1",
      company: { name: "Demo Co", mission: "Ship safely." },
      agent: { name: "Gemini Worker", role: "Engineer" },
      workItems: [{ issueId: "issue-1", projectId: "project-1", title: "Do work" }],
      state: {},
      runtime: {
        env: {
          BOPODEV_API_BASE_URL: "http://localhost:4020",
          BOPODEV_COMPANY_ID: "company-1",
          BOPODEV_ACTOR_TYPE: "agent",
          BOPODEV_ACTOR_ID: "agent-1",
          BOPODEV_ACTOR_COMPANIES: "company-1",
          BOPODEV_ACTOR_PERMISSIONS: "issues:write"
        }
      }
    };

    const prompt = createPrompt(context);
    expect(prompt).toContain('curl -sS -H "x-company-id: $BOPODEV_COMPANY_ID"');
    expect(prompt).toContain('"$BOPODEV_API_BASE_URL/agents"');
    expect(prompt).toContain("Safe example command (copy and edit path only)");
  });
});
