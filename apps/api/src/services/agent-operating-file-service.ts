import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { isInsidePath, resolveAgentOperatingPath } from "../lib/instance-paths";

const MAX_OBSERVABILITY_FILES = 200;
const MAX_OBSERVABILITY_FILE_BYTES = 512 * 1024;

function isMarkdownFileName(name: string) {
  return name.toLowerCase().endsWith(".md");
}

async function walkMarkdownFiles(root: string, maxFiles: number) {
  const collected: string[] = [];
  const queue = [root];
  while (queue.length > 0 && collected.length < maxFiles) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(absolutePath);
        continue;
      }
      if (entry.isFile() && isMarkdownFileName(entry.name)) {
        collected.push(absolutePath);
        if (collected.length >= maxFiles) {
          break;
        }
      }
    }
  }
  return collected.sort();
}

export async function listAgentOperatingMarkdownFiles(input: {
  companyId: string;
  agentId: string;
  maxFiles?: number;
}) {
  const root = resolveAgentOperatingPath(input.companyId, input.agentId);
  await mkdir(root, { recursive: true });
  const maxFiles = Math.max(1, Math.min(MAX_OBSERVABILITY_FILES, input.maxFiles ?? 100));
  const files = await walkMarkdownFiles(root, maxFiles);
  return files.map((filePath) => ({
    path: filePath,
    relativePath: relative(root, filePath),
    operatingRoot: root
  }));
}

export async function readAgentOperatingFile(input: {
  companyId: string;
  agentId: string;
  relativePath: string;
}) {
  const root = resolveAgentOperatingPath(input.companyId, input.agentId);
  await mkdir(root, { recursive: true });
  const candidate = resolve(root, input.relativePath);
  if (!isInsidePath(root, candidate)) {
    throw new Error("Requested operating path is outside of operating root.");
  }
  const info = await stat(candidate);
  if (!info.isFile()) {
    throw new Error("Requested operating path is not a file.");
  }
  if (info.size > MAX_OBSERVABILITY_FILE_BYTES) {
    throw new Error("Requested operating file exceeds size limit.");
  }
  const content = await readFile(candidate, "utf8");
  return {
    path: candidate,
    relativePath: relative(root, candidate),
    content,
    sizeBytes: info.size
  };
}

export async function writeAgentOperatingFile(input: {
  companyId: string;
  agentId: string;
  relativePath: string;
  content: string;
}) {
  const root = resolveAgentOperatingPath(input.companyId, input.agentId);
  await mkdir(root, { recursive: true });
  const normalizedRel = input.relativePath.trim();
  if (!normalizedRel || normalizedRel.includes("..")) {
    throw new Error("Invalid relative path.");
  }
  if (!isMarkdownFileName(normalizedRel)) {
    throw new Error("Only .md files can be written under the operating directory.");
  }
  const candidate = resolve(root, normalizedRel);
  if (!isInsidePath(root, candidate)) {
    throw new Error("Requested operating path is outside of operating root.");
  }
  const bytes = Buffer.byteLength(input.content, "utf8");
  if (bytes > MAX_OBSERVABILITY_FILE_BYTES) {
    throw new Error("Content exceeds size limit.");
  }
  const parent = dirname(candidate);
  if (!isInsidePath(root, parent)) {
    throw new Error("Invalid parent directory.");
  }
  await mkdir(parent, { recursive: true });
  await writeFile(candidate, input.content, { encoding: "utf8" });
  const info = await stat(candidate);
  return {
    path: candidate,
    relativePath: relative(root, candidate),
    sizeBytes: info.size
  };
}
