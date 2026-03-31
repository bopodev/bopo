#!/usr/bin/env node
/**
 * Zips each folder under apps/api/src/assets/starter-packs/sources/<id>/
 * to apps/api/src/assets/starter-packs/<id>.zip
 * Run from repo root: node scripts/zip-starter-packs.mjs
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourcesDir = join(root, "apps/api/src/assets/starter-packs/sources");
const outDir = join(root, "apps/api/src/assets/starter-packs");

async function collectFiles(dir, base) {
  /** @type {Record<string, Uint8Array>} */
  const out = {};
  const ents = await readdir(dir, { withFileTypes: true });
  for (const e of ents) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      Object.assign(out, await collectFiles(full, base));
    } else {
      const rel = relative(base, full).replace(/\\/g, "/");
      const buf = await readFile(full);
      out[rel] = new Uint8Array(buf);
    }
  }
  return out;
}

async function main() {
  let packNames;
  try {
    packNames = await readdir(sourcesDir);
  } catch {
    console.error("No sources directory:", sourcesDir);
    process.exit(1);
  }
  for (const name of packNames) {
    if (name.startsWith(".")) {
      continue;
    }
    const src = join(sourcesDir, name);
    const st = await stat(src);
    if (!st.isDirectory()) {
      continue;
    }
    const files = await collectFiles(src, src);
    const zipped = zipSync(files, { level: 9 });
    const outPath = join(outDir, `${name}.zip`);
    await import("node:fs/promises").then(({ writeFile }) => writeFile(outPath, zipped));
    console.log("Wrote", outPath, `(${Object.keys(files).length} files)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
