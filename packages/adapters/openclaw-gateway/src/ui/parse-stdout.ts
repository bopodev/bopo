const EVENT_PREFIX = "[bopo-openclaw:event]";

export function parseStdoutLine(line: string, timestampIso: string) {
  const trimmed = line.trimEnd();
  if (trimmed.startsWith(EVENT_PREFIX)) {
    const payload = trimmed.slice(EVENT_PREFIX.length).trim();
    return [
      {
        kind: "assistant",
        label: "openclaw:event",
        text: payload,
        timestampIso
      }
    ];
  }
  if (trimmed.startsWith("[bopo-openclaw]")) {
    return [
      {
        kind: "system",
        label: "openclaw",
        text: trimmed.replace(/^\[bopo-openclaw\]\s*/, ""),
        timestampIso
      }
    ];
  }
  return [];
}
