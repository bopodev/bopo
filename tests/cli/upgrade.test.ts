import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

const runCommandCapture = vi.fn();
const resolveWorkspaceRootOrManaged = vi.fn();
const runStartCommand = vi.fn();

vi.mock("../../packages/cli/src/lib/process", () => ({
  runCommandCapture,
  resolveWorkspaceRootOrManaged
}));

vi.mock("../../packages/cli/src/commands/start", () => ({
  runStartCommand
}));

describe("bopo upgrade flow", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("stops runtime, migrates, and restarts by default", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "bopo-upgrade-test-"));
    await writeFile(join(workspace, ".env"), "BOPO_DB_PATH=/tmp/upgrade-bopo/postgres\n", "utf8");
    resolveWorkspaceRootOrManaged.mockResolvedValue(workspace);
    runCommandCapture
      .mockResolvedValueOnce({ ok: true, code: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ ok: true, code: 0, stdout: "Database migrated and verified.\n", stderr: "" });

    const { runUpgradeCommand } = await import("../../packages/cli/src/commands/upgrade");
    await runUpgradeCommand(workspace, { start: true, quiet: true });

    expect(runCommandCapture).toHaveBeenNthCalledWith(
      1,
      "pnpm",
      ["unstick"],
      expect.objectContaining({ cwd: workspace })
    );
    expect(runCommandCapture).toHaveBeenNthCalledWith(
      2,
      "pnpm",
      ["db:migrate"],
      expect.objectContaining({
        cwd: workspace,
        env: expect.objectContaining({
          BOPO_DB_PATH: "/tmp/upgrade-bopo/postgres"
        })
      })
    );
    expect(runStartCommand).toHaveBeenCalledWith(workspace, { quiet: true });
  });

  test("skips restart when --no-start is requested", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "bopo-upgrade-test-"));
    resolveWorkspaceRootOrManaged.mockResolvedValue(workspace);
    runCommandCapture
      .mockResolvedValueOnce({ ok: true, code: 0, stdout: "", stderr: "" })
      .mockResolvedValueOnce({ ok: true, code: 0, stdout: "Database migrated and verified.\n", stderr: "" });

    const { runUpgradeCommand } = await import("../../packages/cli/src/commands/upgrade");
    await runUpgradeCommand(workspace, { start: false });

    expect(runStartCommand).not.toHaveBeenCalled();
  });
});
