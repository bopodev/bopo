import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { AgentMemoryContext } from "bopodev-agent-sdk";
import {
  isInsidePath,
  resolveAgentDailyMemoryPath,
  resolveAgentDurableMemoryPath,
  resolveAgentMemoryRootPath
} from "../lib/instance-paths";

const MAX_DAILY_LINES = 12;
const MAX_DURABLE_FACTS = 12;
const MAX_TACIT_NOTES_CHARS = 1_500;
const MAX_OBSERVABILITY_FILES = 200;
const MAX_OBSERVABILITY_FILE_BYTES = 512 * 1024;

export type PersistedHeartbeatMemory = {
  memoryRoot: string;
  dailyNotePath: string;
  dailyEntry: string;
  candidateFacts: string[];
};

export async function loadAgentMemoryContext(input: {
  companyId: string;
  agentId: string;
}): Promise<AgentMemoryContext> {
  const memoryRoot = resolveAgentMemoryRootPath(input.companyId, input.agentId);
  const durableRoot = resolveAgentDurableMemoryPath(input.companyId, input.agentId);
  const dailyRoot = resolveAgentDailyMemoryPath(input.companyId, input.agentId);
  await ensureMemoryDirs(memoryRoot, durableRoot, dailyRoot);
  const tacitNotes = await readTacitNotes(memoryRoot);
  const durableFacts = await readDurableFacts(durableRoot, MAX_DURABLE_FACTS);
  const dailyNotes = await readRecentDailyNotes(dailyRoot, MAX_DAILY_LINES);
  return {
    memoryRoot,
    tacitNotes,
    durableFacts,
    dailyNotes
  };
}

export async function persistHeartbeatMemory(input: {
  companyId: string;
  agentId: string;
  runId: string;
  status: string;
  summary: string;
  outcomeKind?: string | null;
}): Promise<PersistedHeartbeatMemory> {
  const memoryRoot = resolveAgentMemoryRootPath(input.companyId, input.agentId);
  const durableRoot = resolveAgentDurableMemoryPath(input.companyId, input.agentId);
  const dailyRoot = resolveAgentDailyMemoryPath(input.companyId, input.agentId);
  await ensureMemoryDirs(memoryRoot, durableRoot, dailyRoot);
  const now = new Date();
  const dailyFileName = `${now.toISOString().slice(0, 10)}.md`;
  const dailyNotePath = join(dailyRoot, dailyFileName);
  const summary = collapseWhitespace(input.summary);
  const dailyEntry = [
    `## ${now.toISOString()}`,
    `- run: ${input.runId}`,
    `- status: ${input.status}`,
    `- outcome: ${input.outcomeKind ?? "unknown"}`,
    `- summary: ${summary || "No summary provided."}`,
    ""
  ].join("\n");
  await writeFile(dailyNotePath, dailyEntry, { encoding: "utf8", flag: "a" });
  const candidateFacts = deriveCandidateFacts(summary);
  return {
    memoryRoot,
    dailyNotePath,
    dailyEntry,
    candidateFacts
  };
}

export async function appendDurableFact(input: {
  companyId: string;
  agentId: string;
  fact: string;
  sourceRunId?: string | null;
}) {
  const durableRoot = resolveAgentDurableMemoryPath(input.companyId, input.agentId);
  await mkdir(durableRoot, { recursive: true });
  const targetFile = join(durableRoot, "items.yaml");
  const normalizedFact = collapseWhitespace(input.fact);
  if (!normalizedFact) {
    return null;
  }
  const row = `- fact: "${escapeYamlString(normalizedFact)}"\n  sourceRunId: "${escapeYamlString(input.sourceRunId ?? "")}"\n`;
  await writeFile(targetFile, row, { encoding: "utf8", flag: "a" });
  return targetFile;
}

export async function listAgentMemoryFiles(input: {
  companyId: string;
  agentId: string;
  maxFiles?: number;
}) {
  const root = resolveAgentMemoryRootPath(input.companyId, input.agentId);
  await mkdir(root, { recursive: true });
  const maxFiles = Math.max(1, Math.min(MAX_OBSERVABILITY_FILES, input.maxFiles ?? 100));
  const files = await walkFiles(root, maxFiles);
  return files.map((filePath) => ({
    path: filePath,
    relativePath: relative(root, filePath),
    memoryRoot: root
  }));
}

export async function readAgentMemoryFile(input: {
  companyId: string;
  agentId: string;
  relativePath: string;
}) {
  const root = resolveAgentMemoryRootPath(input.companyId, input.agentId);
  await mkdir(root, { recursive: true });
  const candidate = resolve(root, input.relativePath);
  if (!isInsidePath(root, candidate)) {
    throw new Error("Requested memory path is outside of memory root.");
  }
  const info = await stat(candidate);
  if (!info.isFile()) {
    throw new Error("Requested memory path is not a file.");
  }
  if (info.size > MAX_OBSERVABILITY_FILE_BYTES) {
    throw new Error("Requested memory file exceeds size limit.");
  }
  const content = await readFile(candidate, "utf8");
  return {
    path: candidate,
    relativePath: relative(root, candidate),
    content,
    sizeBytes: info.size
  };
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function deriveCandidateFacts(summary: string) {
  if (!summary || summary.length < 18) {
    return [];
  }
  return [summary.slice(0, 400)];
}

async function ensureMemoryDirs(memoryRoot: string, durableRoot: string, dailyRoot: string) {
  await mkdir(memoryRoot, { recursive: true });
  await mkdir(durableRoot, { recursive: true });
  await mkdir(dailyRoot, { recursive: true });
}

async function readTacitNotes(memoryRoot: string) {
  const tacitPath = join(memoryRoot, "MEMORY.md");
  try {
    const text = await readFile(tacitPath, "utf8");
    const trimmed = text.trim();
    if (!trimmed) {
      return undefined;
    }
    return trimmed.slice(0, MAX_TACIT_NOTES_CHARS);
  } catch {
    return undefined;
  }
}

async function readDurableFacts(durableRoot: string, limit: number) {
  const candidates = [join(durableRoot, "summary.md"), join(durableRoot, "items.yaml")];
  const facts: string[] = [];
  for (const candidate of candidates) {
    try {
      const content = await readFile(candidate, "utf8");
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
      for (const line of lines) {
        if (facts.length >= limit) {
          return facts;
        }
        facts.push(line.slice(0, 300));
      }
    } catch {
      // best effort
    }
  }
  return facts;
}

async function readRecentDailyNotes(dailyRoot: string, limit: number) {
  try {
    const entries = await readdir(dailyRoot, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort()
      .reverse()
      .slice(0, 3);
    const notes: string[] = [];
    for (const fileName of files) {
      const content = await readFile(join(dailyRoot, fileName), "utf8");
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      for (const line of lines.reverse()) {
        if (notes.length >= limit) {
          return notes;
        }
        notes.push(line.slice(0, 300));
      }
    }
    return notes;
  } catch {
    return [];
  }
}

async function walkFiles(root: string, maxFiles: number) {
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
      if (entry.isFile()) {
        collected.push(absolutePath);
        if (collected.length >= maxFiles) {
          break;
        }
      }
    }
  }
  return collected.sort();
}

function escapeYamlString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
