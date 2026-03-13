import { describe, expect, it } from "vitest";
import {
  ensureRuntimeInsideWorkspace,
  ensureRuntimeWorkspaceCompatible,
  parseProjectExecutionWorkspacePolicy
} from "../apps/api/src/lib/workspace-policy";

describe("workspace policy helpers", () => {
  it("returns null for invalid policy payloads", () => {
    expect(parseProjectExecutionWorkspacePolicy(null)).toBeNull();
    expect(parseProjectExecutionWorkspacePolicy("{ not-json ")).toBeNull();
    expect(parseProjectExecutionWorkspacePolicy("[]")).toEqual({
      mode: undefined,
      strategy: null,
      credentials: null,
      allowRemotes: null,
      allowBranchPrefixes: null
    });
  });

  it("normalizes policy mode, strategy, credentials, and allowlists", () => {
    const parsed = parseProjectExecutionWorkspacePolicy({
      mode: "isolated",
      strategy: {
        type: "git_worktree",
        rootDir: " /tmp/worktrees ",
        branchPrefix: " bopo "
      },
      credentials: {
        mode: "env_token",
        tokenEnvVar: " BOPO_TOKEN ",
        username: " ci "
      },
      allowRemotes: [" github.com/acme/repo ", "", "github.com/acme"],
      allowBranchPrefixes: [" bopo/ ", " "]
    });
    expect(parsed).toEqual({
      mode: "isolated",
      strategy: {
        type: "git_worktree",
        rootDir: " /tmp/worktrees ",
        branchPrefix: " bopo "
      },
      credentials: {
        mode: "env_token",
        tokenEnvVar: " BOPO_TOKEN ",
        username: " ci "
      },
      allowRemotes: ["github.com/acme/repo", "github.com/acme"],
      allowBranchPrefixes: ["bopo/"]
    });
  });

  it("correctly evaluates runtime workspace compatibility", () => {
    expect(ensureRuntimeInsideWorkspace("/tmp/workspace", "/tmp/workspace/agent")).toBe(true);
    expect(ensureRuntimeInsideWorkspace("/tmp/workspace", "/tmp/other")).toBe(false);
    expect(ensureRuntimeWorkspaceCompatible("/tmp/workspace", "/tmp/workspace/agent")).toBe(true);
    expect(ensureRuntimeWorkspaceCompatible("/tmp/workspace/agent", "/tmp/workspace")).toBe(true);
    expect(ensureRuntimeWorkspaceCompatible("/tmp/workspace", "/tmp/other")).toBe(false);
  });
});
