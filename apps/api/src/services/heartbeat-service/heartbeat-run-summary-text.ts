const AGENT_COMMENT_EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;

export function sanitizeAgentSummaryCommentBody(body: string) {
  const sanitized = body.replace(AGENT_COMMENT_EMOJI_REGEX, "").trim();
  return sanitized.length > 0 ? sanitized : "Run update.";
}

function extractSummaryFromJsonLikeText(input: string) {
  const fencedMatch = input.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? input.match(/\{[\s\S]*\}\s*$/)?.[0]?.trim();
  if (!candidate) {
    return null;
  }
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    const summary = parsed.summary;
    if (typeof summary === "string" && summary.trim().length > 0) {
      return summary.trim();
    }
  } catch {
    // Fall through to regex extraction for loosely-formatted JSON.
  }
  const summaryMatch = candidate.match(/"summary"\s*:\s*"([\s\S]*?)"/);
  const summary = summaryMatch?.[1]
    ?.replace(/\\"/g, "\"")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return summary && summary.length > 0 ? summary : null;
}

export function extractNaturalRunUpdate(executionSummary: string) {
  const normalized = executionSummary.trim();
  const jsonSummary = extractSummaryFromJsonLikeText(normalized);
  const source = jsonSummary ?? normalized;
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith("{") && !line.startsWith("}"));
  const compact = (lines.length > 0 ? lines.slice(0, 2).join(" ") : source)
    .replace(/^run (failure )?summary\s*:\s*/i, "")
    .replace(/^completed all assigned issue steps\s*:\s*/i, "")
    .replace(/^issue status\s*:\s*/i, "")
    .replace(/`+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const bounded = compact.length > 260 ? `${compact.slice(0, 257).trimEnd()}...` : compact;
  if (!bounded) {
    return "Run update.";
  }
  return /[.!?]$/.test(bounded) ? bounded : `${bounded}.`;
}
