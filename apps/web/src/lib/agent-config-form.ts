export function parseArgsInput(input: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar: '"' | "'" | null = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if ((char === '"' || char === "'") && (!inQuotes || quoteChar === char)) {
      if (inQuotes) {
        inQuotes = false;
        quoteChar = null;
      } else {
        inQuotes = true;
        quoteChar = char;
      }
      continue;
    }
    if (!inQuotes && /\s/.test(char)) {
      if (current.length > 0) {
        result.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (current.length > 0) {
    result.push(current);
  }
  return result;
}

export function formatArgsInput(args: string[] | null | undefined) {
  if (!args || args.length === 0) {
    return "";
  }
  return args
    .map((value) => (/[\s"']/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value))
    .join(" ");
}

export function parseEnvInput(input: string) {
  const result: Record<string, string> = {};
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator < 1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1);
    if (key.length === 0) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

export function formatEnvInput(env: Record<string, string> | null | undefined) {
  if (!env) {
    return "";
  }
  return Object.entries(env)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}
