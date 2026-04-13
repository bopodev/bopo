import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "packages/cli/README.md");

const rawBase =
  process.env.BOPODEV_NPM_README_RAW_BASE?.trim() ||
  "https://raw.githubusercontent.com/dkrusenstrahle/bopodev/main";
const blobBase =
  process.env.BOPODEV_NPM_README_BLOB_BASE?.trim() ||
  "https://github.com/dkrusenstrahle/bopodev/blob/main";

let text = fs.readFileSync(path.join(root, "README.md"), "utf8");

// Images and static assets: raw URLs work on the npm readme renderer.
text = text.replaceAll("./assets/", `${rawBase}/assets/`);
// Repo-relative markdown links: point at GitHub so they resolve from npm.
text = text.replaceAll("](./", `](${blobBase}/`);
text = text.replaceAll("](docs/", `](${blobBase}/docs/`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, text, "utf8");
console.log("Wrote packages/cli/README.md from root README.md (npm-friendly links).");
