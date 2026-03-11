import { describe, expect, it } from "vitest";
import {
  isNoAssignedWorkRun,
  isStoppedRun,
  resolveWindowStart,
  selectedProjectNameFor,
  summarizeCosts
} from "../apps/web/src/lib/workspace-logic";

describe("workspace logic helpers", () => {
  it("summarizes cost totals across entries", () => {
    const summary = summarizeCosts([
      { tokenInput: 3, tokenOutput: 5, usdCost: 0.1 },
      { tokenInput: 7, tokenOutput: 11, usdCost: 0.25 }
    ]);

    expect(summary).toEqual({ input: 10, output: 16, usd: 0.35 });
  });

  it("resolves rolling time windows", () => {
    expect(resolveWindowStart("all")).toBe(null);
    const today = resolveWindowStart("today");
    expect(today).toBeInstanceOf(Date);
    expect(today?.getHours()).toBe(0);
    expect(resolveWindowStart("7d")).toBeInstanceOf(Date);
    expect(resolveWindowStart("30d")).toBeInstanceOf(Date);
    expect(resolveWindowStart("90d")).toBeInstanceOf(Date);
  });

  it("detects stop-requested failed runs", () => {
    expect(isStoppedRun({ status: "completed", message: null })).toBe(false);
    expect(
      isStoppedRun(
        { status: "failed", message: "Agent run cancelled by stop request while running." },
        { errorType: "runtime" }
      )
    ).toBe(true);
    expect(isStoppedRun({ status: "failed", message: "Failure" }, { errorType: "cancelled" })).toBe(true);
  });

  it("identifies no-assigned-work skipped runs", () => {
    expect(isNoAssignedWorkRun({ status: "completed", runType: "no_assigned_work", message: null })).toBe(true);
    expect(isNoAssignedWorkRun({ status: "skipped", runType: "other_skip", message: "No assigned work found." })).toBe(false);
    expect(isNoAssignedWorkRun({ status: "completed", message: "No assigned work found." })).toBe(false);
    expect(isNoAssignedWorkRun({ status: "skipped", message: "Heartbeat skipped due to budget hard-stop." })).toBe(false);
  });

  it("resolves selected project names with fallback", () => {
    const projects = [
      { id: "p1", name: "Core Platform" },
      { id: "p2", name: "Release Prep" }
    ];
    expect(selectedProjectNameFor("p2", projects)).toBe("Release Prep");
    expect(selectedProjectNameFor("missing", projects)).toBe("Unknown");
  });
});
