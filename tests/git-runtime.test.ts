import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  bootstrapRepositoryWorkspace,
  cleanupStaleWorktrees,
  ensureIsolatedGitWorktree,
  GitRuntimeError
} from "../apps/api/src/lib/git-runtime";

describe("git runtime path and allowlist policy", () => {
  const cleanupPaths: string[] = [];
  const originalInstanceRoot = process.env.BOPO_INSTANCE_ROOT;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(async () => {
    process.env.BOPO_INSTANCE_ROOT = originalInstanceRoot;
    process.env.NODE_ENV = originalNodeEnv;
    await Promise.all(cleanupPaths.map((path) => rm(path, { recursive: true, force: true })));
    cleanupPaths.length = 0;
  });

  it("rejects strategy rootDir outside managed company workspace root", async () => {
    const root = await mkdtemp(join(tmpdir(), "bopodev-git-runtime-"));
    cleanupPaths.push(root);
    process.env.BOPO_INSTANCE_ROOT = root;
    process.env.NODE_ENV = "development";

    await expect(
      ensureIsolatedGitWorktree({
        companyId: "acme",
        projectId: "proj",
        agentId: "agent1",
        repoCwd: join(root, "workspaces", "acme", "projects", "proj"),
        policy: {
          strategy: {
            type: "git_worktree",
            rootDir: join(tmpdir(), "outside-worktrees")
          }
        }
      })
    ).rejects.toThrow("must be inside");
  });

  it("rejects project workspace cwd outside managed root before git operations", async () => {
    const root = await mkdtemp(join(tmpdir(), "bopodev-git-runtime-"));
    cleanupPaths.push(root);
    process.env.BOPO_INSTANCE_ROOT = root;
    process.env.NODE_ENV = "development";

    await expect(
      bootstrapRepositoryWorkspace({
        companyId: "acme",
        projectId: "proj",
        cwd: join(tmpdir(), "external-workspace"),
        repoUrl: "https://github.com/acme/project.git"
      })
    ).rejects.toThrow("must be inside");
  });

  it("uses strict host/path matching for allowRemotes", async () => {
    const root = await mkdtemp(join(tmpdir(), "bopodev-git-runtime-"));
    cleanupPaths.push(root);
    process.env.BOPO_INSTANCE_ROOT = root;
    process.env.NODE_ENV = "development";

    try {
      await bootstrapRepositoryWorkspace({
        companyId: "acme",
        projectId: "proj",
        cwd: join(root, "workspaces", "acme", "projects", "proj"),
        repoUrl: "https://github.com/acme/project.git",
        policy: {
          allowRemotes: ["hub.com/acme"]
        }
      });
      throw new Error("expected policy_violation");
    } catch (error) {
      expect(error).toBeInstanceOf(GitRuntimeError);
      expect((error as GitRuntimeError).code).toBe("policy_violation");
    }
  });

  it("rejects allowRemotes candidates that do not match parsed remote identity", async () => {
    const root = await mkdtemp(join(tmpdir(), "bopodev-git-runtime-"));
    cleanupPaths.push(root);
    process.env.BOPO_INSTANCE_ROOT = root;
    process.env.NODE_ENV = "development";

    try {
      await bootstrapRepositoryWorkspace({
        companyId: "acme",
        projectId: "proj",
        cwd: join(root, "workspaces", "acme", "projects", "proj"),
        repoUrl: "https://github.com/acme/project.git",
        policy: {
          allowRemotes: ["github.acme.invalid"]
        }
      });
      throw new Error("expected policy_violation");
    } catch (error) {
      expect(error).toBeInstanceOf(GitRuntimeError);
      expect((error as GitRuntimeError).code).toBe("policy_violation");
    }
  });

  it("rejects disallowed branch prefix before attempting worktree creation", async () => {
    const root = await mkdtemp(join(tmpdir(), "bopodev-git-runtime-"));
    cleanupPaths.push(root);
    process.env.BOPO_INSTANCE_ROOT = root;
    process.env.NODE_ENV = "development";

    try {
      await ensureIsolatedGitWorktree({
        companyId: "acme",
        projectId: "proj",
        agentId: "agent1",
        repoCwd: join(root, "workspaces", "acme", "projects", "proj"),
        policy: {
          strategy: {
            type: "git_worktree",
            branchPrefix: "feature"
          },
          allowBranchPrefixes: ["bopo/"]
        }
      });
      throw new Error("expected policy_violation");
    } catch (error) {
      expect(error).toBeInstanceOf(GitRuntimeError);
      expect((error as GitRuntimeError).code).toBe("policy_violation");
    }
  });

  it("fails env_token auth when token env var is missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "bopodev-git-runtime-"));
    cleanupPaths.push(root);
    process.env.BOPO_INSTANCE_ROOT = root;
    process.env.NODE_ENV = "development";

    try {
      await bootstrapRepositoryWorkspace({
        companyId: "acme",
        projectId: "proj",
        cwd: join(root, "workspaces", "acme", "projects", "proj"),
        repoUrl: "https://github.com/acme/project.git",
        policy: {
          credentials: {
            mode: "env_token",
            tokenEnvVar: "BOPO_MISSING_TOKEN"
          }
        }
      });
      throw new Error("expected auth_missing");
    } catch (error) {
      expect(error).toBeInstanceOf(GitRuntimeError);
      expect((error as GitRuntimeError).code).toBe("auth_missing");
    }
  });

  it("cleans up only stale directories in worktree root", async () => {
    const root = await mkdtemp(join(tmpdir(), "bopodev-git-runtime-"));
    cleanupPaths.push(root);
    const staleDir = join(root, "stale-dir");
    const freshDir = join(root, "fresh-dir");
    const fileEntry = join(root, "note.txt");
    await mkdir(staleDir, { recursive: true });
    await mkdir(freshDir, { recursive: true });
    await writeFile(fileEntry, "keep", "utf8");
    const staleTimestamp = new Date(Date.now() - 60 * 60 * 1000);
    await utimes(staleDir, staleTimestamp, staleTimestamp);

    const result = await cleanupStaleWorktrees({
      rootDir: root,
      ttlMs: 30_000
    });
    expect(result.removed).toBe(1);
    await expect(stat(freshDir)).resolves.toBeDefined();
    await expect(stat(fileEntry)).resolves.toBeDefined();
    await expect(stat(staleDir)).rejects.toBeDefined();
  });
});
