import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const srcStarter = join(root, "../src/assets/starter-packs");
const distStarter = join(root, "../dist/assets/starter-packs");

if (existsSync(srcStarter)) {
  mkdirSync(distStarter, { recursive: true });
  for (const name of readdirSync(srcStarter)) {
    if (!name.endsWith(".zip")) {
      continue;
    }
    const srcPath = join(srcStarter, name);
    if (statSync(srcPath).isFile()) {
      copyFileSync(srcPath, join(distStarter, name));
    }
  }
}
