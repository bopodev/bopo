import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

/**
 * Load the same env files as `apps/api` (`loadApiEnv`), so `db:migrate` targets the DB
 * the API uses when developers run migrations from the shell without exporting variables.
 */
export function loadMigrateEnv() {
  const roots = resolveCandidateRepoRoots();
  for (const root of roots) {
    for (const name of [".env.local", ".env"] as const) {
      loadDotenv({ path: join(root, name), override: false, quiet: true });
    }
  }
}

function resolveCandidateRepoRoots(): string[] {
  const fromPackage = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const ordered: string[] = [fromPackage];
  const fromCwd = findRepoRootWalkingFromCwd();
  if (fromCwd && resolve(fromCwd) !== resolve(fromPackage)) {
    ordered.push(fromCwd);
  }
  return ordered;
}

function findRepoRootWalkingFromCwd(): string | null {
  let dir = resolve(process.cwd());
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}
