import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";

export function loadApiEnv() {
  const sourceDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(sourceDir, "../../../../");
  const candidates = [resolve(repoRoot, ".env.local"), resolve(repoRoot, ".env")];
  for (const path of candidates) {
    loadDotenv({ path, override: false, quiet: true });
  }
}

export function normalizeOptionalDbPath(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}
