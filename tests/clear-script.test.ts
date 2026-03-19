import { describe, expect, it } from "vitest";
import {
  collectDescendantPids,
  collectWorkspaceRuntimePids,
  isPathInside,
  parseListeningPidsOutput,
  parseProcessTableOutput,
  resolveRuntimePorts
} from "../scripts/clear.mjs";

describe("clear script helpers", () => {
  it("resolves runtime ports with sensible fallbacks", () => {
    expect(resolveRuntimePorts({})).toEqual([4010, 4020]);
    expect(resolveRuntimePorts({ WEB_PORT: "5000", API_PORT: "5001" })).toEqual([5000, 5001]);
    expect(resolveRuntimePorts({ WEB_PORT: "5000", API_PORT: "5000" })).toEqual([5000]);
    expect(resolveRuntimePorts({ PORT: "7000" })).toEqual([4010, 7000]);
  });

  it("parses listening PID output and filters invalid values", () => {
    expect(parseListeningPidsOutput("123\n456\n")).toEqual([123, 456]);
    expect(parseListeningPidsOutput("123\nx\n-4\n0\n")).toEqual([123]);
    expect(parseListeningPidsOutput("   ")).toEqual([]);
  });

  it("parses ps output into process table entries", () => {
    const parsed = parseProcessTableOutput([
      "123 1 /Users/me/repo/node scripts/dev-runner.mjs",
      "200 123 /usr/bin/node child.js",
      "bad line",
      "201 nope /usr/bin/node invalid-parent"
    ].join("\n"));
    expect(parsed).toEqual([
      { pid: 123, ppid: 1, command: "/Users/me/repo/node scripts/dev-runner.mjs" },
      { pid: 200, ppid: 123, command: "/usr/bin/node child.js" }
    ]);
  });

  it("collects only workspace runtime processes that match markers", () => {
    const workspaceRoot = "/Users/me/repo";
    const processTable = [
      { pid: 101, ppid: 1, command: "/Users/me/repo/node scripts/dev-runner.mjs" },
      { pid: 102, ppid: 1, command: "/Users/me/repo/pnpm --filter bopodev-api dev" },
      { pid: 103, ppid: 1, command: "/Users/me/repo/node unrelated-script.js" },
      { pid: 104, ppid: 1, command: "/tmp/node scripts/dev-runner.mjs" }
    ];
    const pids = Array.from(collectWorkspaceRuntimePids(workspaceRoot, processTable)).sort((a, b) => a - b);
    expect(pids).toEqual([101, 102]);
  });

  it("collects descendants recursively for selected root pids", () => {
    const processTable = [
      { pid: 10, ppid: 1, command: "parent" },
      { pid: 11, ppid: 10, command: "child-a" },
      { pid: 12, ppid: 11, command: "grandchild" },
      { pid: 13, ppid: 10, command: "child-b" },
      { pid: 20, ppid: 1, command: "outside" }
    ];
    const descendants = Array.from(collectDescendantPids(processTable, new Set([10]))).sort((a, b) => a - b);
    expect(descendants).toEqual([10, 11, 12, 13]);
  });

  it("checks whether a path is contained within a parent", () => {
    expect(isPathInside("/workspace/root", "/workspace/root")).toBe(true);
    expect(isPathInside("/workspace/root", "/workspace/root/child/file.txt")).toBe(true);
    expect(isPathInside("/workspace/root", "/workspace/root-sibling/file.txt")).toBe(false);
  });
});
