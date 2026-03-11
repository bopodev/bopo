"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type RunTrace = {
  command?: string;
  args?: string[] | null;
  cwd?: string | null;
  exitCode?: number | null;
  elapsedMs?: number;
  timedOut?: boolean;
  failureType?: string | null;
  timeoutSource?: "runtime" | "watchdog" | null;
  usageSource?: string | null;
  attemptCount?: number;
  attempts?: Array<{
    attempt: number;
    code: number | null;
    timedOut: boolean;
    elapsedMs: number;
    signal: string | null;
    spawnErrorCode?: string;
    forcedKill: boolean;
  }> | null;
  structuredOutputSource?: "stdout" | "stderr" | null;
  structuredOutputDiagnostics?: {
    stdoutJsonObjectCount?: number;
    stderrJsonObjectCount?: number;
    stderrStructuredUsageDetected?: boolean;
    stdoutBytes?: number;
    stderrBytes?: number;
    hasAnyOutput?: boolean;
    lastStdoutLine?: string;
    lastStderrLine?: string;
    likelyCause?: string | null;
    claudeStopReason?: string | null;
    claudeResultSubtype?: string | null;
    claudeSessionId?: string | null;
  } | null;
  stdoutPreview?: string | null;
  stderrPreview?: string | null;
  session?: {
    currentSessionId?: string | null;
    resumedSessionId?: string | null;
    resumeAttempted?: boolean;
    resumeSkippedReason?: string | null;
    clearedStaleSession?: boolean;
  } | null;
  transcript?: Array<{
    kind?: string | null;
    label?: string | null;
    text?: string | null;
    payload?: string | null;
  }> | null;
};

type RunDetails = {
  status?: string | null;
  message?: string | null;
  errorMessage?: string | null;
  result?: string | null;
  outcome?: {
    kind?: string | null;
    nextSuggestedState?: string | null;
    actions?: Array<{ type?: string | null; status?: string | null; detail?: string | null }> | null;
    blockers?: Array<{ code?: string | null; message?: string | null; retryable?: boolean | null }> | null;
  } | null;
  issueIds?: string[] | null;
  usage?: {
    tokenInput?: number;
    tokenOutput?: number;
    usdCost?: number;
    source?: string | null;
  } | null;
  trace?: RunTrace | null;
  diagnostics?: {
    requestId?: string | null;
    trigger?: string | null;
    stateParseError?: string | null;
  } | null;
};

export function RunDetailsModal({
  runId,
  agentName,
  details,
  companyId,
  agentId
}: {
  runId: string;
  agentName: string;
  details?: RunDetails;
  companyId?: string | null;
  agentId?: string | null;
}) {
  const trace = details?.trace ?? null;
  const transcriptEvents = trace?.transcript?.length
    ? trace.transcript.slice(0, 120).map((event) => ({
        kind: event.kind ?? "event",
        label: event.label,
        text: event.text ?? "",
        payload: event.payload
      }))
    : toTranscriptEvents(trace?.stdoutPreview ?? "");
  const blockers = details?.outcome?.blockers ?? [];
  const actions = details?.outcome?.actions ?? [];
  const statusLabel = details?.outcome?.kind ?? details?.status ?? "unknown";
  const resultText = formatResultText(details?.result) || formatFallbackResult(details);
  const invocationRows: Array<{ label: string; value: string }> = [
    { label: "exitCode", value: String(trace?.exitCode ?? "n/a") },
    { label: "elapsed", value: trace?.elapsedMs !== undefined ? `${trace.elapsedMs} ms` : "n/a" },
    { label: "timedOut", value: String(trace?.timedOut ?? false) },
    { label: "timeoutSource", value: trace?.timeoutSource ?? "n/a" },
    { label: "failureType", value: trace?.failureType ?? "n/a" },
    { label: "attemptCount", value: String(trace?.attemptCount ?? 0) },
    { label: "cwd", value: trace?.cwd ?? "n/a" },
    { label: "structuredSource", value: trace?.structuredOutputSource ?? "n/a" },
    { label: "requestId", value: details?.diagnostics?.requestId ?? "n/a" },
    { label: "trigger", value: details?.diagnostics?.trigger ?? "n/a" },
    { label: "stateParseError", value: details?.diagnostics?.stateParseError ?? "none" }
  ];
  const usageRows: Array<{ label: string; value: string }> = details?.usage
    ? [
        { label: "input tokens", value: String(details.usage.tokenInput ?? 0) },
        { label: "output tokens", value: String(details.usage.tokenOutput ?? 0) },
        { label: "cost", value: `$${(details.usage.usdCost ?? 0).toFixed(6)}` },
        { label: "source", value: details.usage.source ?? trace?.usageSource ?? "unknown" }
      ]
    : [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="ui-run-details-dialog">
        <DialogHeader>
          <DialogTitle>Run details</DialogTitle>
          <DialogDescription>
            {runId} · {agentName}
          </DialogDescription>
        </DialogHeader>
        <div className="ui-run-details-scroll">
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Result</h4>
            <div className="ui-run-details-pill-row">
              <span className="ui-run-details-pill">status: {statusLabel}</span>
              <span className="ui-run-details-pill">next: {details?.outcome?.nextSuggestedState ?? "n/a"}</span>
              <span className="ui-run-details-pill">issues: {details?.issueIds?.length ?? 0}</span>
            </div>
            <div className="ui-run-details-result-box">
              {resultText ? (
                resultText.split("\n").map((line, index) => (
                  <p key={`result-line-${index}`} className="ui-run-details-text">
                    {line}
                  </p>
                ))
              ) : (
                <p className="ui-run-details-text">No result summary available.</p>
              )}
            </div>
            {usageRows.length > 0 ? (
              <div className="ui-run-details-kv-grid ui-run-details-usage-grid">
                {usageRows.map((row) => (
                  <div className="ui-run-details-kv-item" key={row.label}>
                    <span className="ui-run-details-kv-key">{row.label}</span>
                    <span className="ui-run-details-kv-value">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {blockers.length > 0 ? (
              <div className="ui-run-details-blockers">
                {blockers.map((blocker, index) => (
                  <div key={`${blocker.code ?? "blocker"}-${index}`} className="ui-run-details-blocker-item">
                    <strong>{blocker.code ?? "blocker"}</strong>: {blocker.message ?? "No blocker message."}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Invocation</h4>
            <div className="ui-run-details-command-row">
              <span className="ui-run-details-kv-key">command</span>
              <code className="ui-run-details-code-inline">{trace?.command ?? "n/a"}</code>
            </div>
            <div className="ui-run-details-command-block">
              <span className="ui-run-details-kv-key">args</span>
              <pre className="ui-run-details-code-block">{trace?.args?.join(" ") || "n/a"}</pre>
            </div>
            <div className="ui-run-details-command-row">
              <span className="ui-run-details-kv-key">cwd</span>
              <code className="ui-run-details-code-inline">{trace?.cwd ?? "n/a"}</code>
            </div>
            <div className="ui-run-details-kv-grid">
              {invocationRows.map((row) => (
                <div className="ui-run-details-kv-item" key={row.label}>
                  <span className="ui-run-details-kv-key">{row.label}</span>
                  <span className="ui-run-details-kv-value">{row.value}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Session</h4>
            <div className="ui-run-details-kv-grid">
              {[
                { label: "currentSessionId", value: trace?.session?.currentSessionId ?? "n/a" },
                { label: "resumedSessionId", value: trace?.session?.resumedSessionId ?? "n/a" },
                { label: "resumeAttempted", value: String(trace?.session?.resumeAttempted ?? false) },
                { label: "resumeSkippedReason", value: trace?.session?.resumeSkippedReason ?? "n/a" },
                { label: "clearedStaleSession", value: String(trace?.session?.clearedStaleSession ?? false) }
              ].map((row) => (
                <div className="ui-run-details-kv-item" key={row.label}>
                  <span className="ui-run-details-kv-key">{row.label}</span>
                  <span className="ui-run-details-kv-value">{row.value}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Actions</h4>
            <pre className="ui-run-details-pre">
              {actions.length > 0 ? JSON.stringify(actions, null, 2) : "No action records captured."}
            </pre>
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Structured diagnostics</h4>
            <pre className="ui-run-details-pre">
              {trace?.structuredOutputDiagnostics
                ? JSON.stringify(trace.structuredOutputDiagnostics, null, 2)
                : "No structured diagnostics captured."}
            </pre>
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Transcript</h4>
            {transcriptEvents.length > 0 ? (
              <div className="ui-run-details-transcript">
                {transcriptEvents.map((event, index) => (
                  <div key={`${event.kind}-${index}`} className="ui-run-details-transcript-row">
                    <span className="ui-run-details-transcript-kind">{event.kind}</span>
                    <span className="ui-run-details-transcript-text">
                      {event.label ? `${event.label} - ` : ""}
                      {event.text}
                    </span>
                    {event.payload ? <pre className="ui-run-details-pre">{event.payload}</pre> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="ui-run-details-subtext">No parseable stream transcript events in stdout preview.</p>
            )}
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Attempts</h4>
            <pre className="ui-run-details-pre">
              {trace?.attempts?.length ? JSON.stringify(trace.attempts, null, 2) : "No attempt diagnostics captured."}
            </pre>
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Stdout preview</h4>
            <pre className="ui-run-details-pre">
              {trace?.stdoutPreview?.trim() || "No stdout preview captured."}
            </pre>
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Stderr preview</h4>
            <pre className="ui-run-details-pre">
              {trace?.stderrPreview?.trim() || "No stderr preview captured."}
            </pre>
          </section>
          <section className="ui-run-details-section">
            <h4 className="ui-run-details-heading">Raw payload</h4>
            <details>
              <summary className="ui-run-details-summary">Expand raw payload</summary>
              <pre className="ui-run-details-pre">{JSON.stringify(details ?? {}, null, 2)}</pre>
            </details>
          </section>
        </div>
        <DialogFooter showCloseButton />
        {companyId ? (
          <div className="ui-run-details-section">
            <Button asChild variant="outline" size="sm">
              <Link href={{ pathname: `/runs/${runId}`, query: { companyId, agentId: agentId ?? undefined } }}>
                Open full run page
              </Link>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function toTranscriptEvents(stdoutPreview: string) {
  const events: Array<{ kind: string; label?: string; text: string; payload?: string }> = [];
  for (const rawLine of stdoutPreview.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("{") || !line.endsWith("}")) {
      continue;
    }
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const type = typeof parsed.type === "string" ? parsed.type : "";
      if (type === "system") {
        const model = typeof parsed.model === "string" ? parsed.model : "";
        const mode = typeof parsed.permissionMode === "string" ? parsed.permissionMode : "";
        events.push({ kind: "system", label: "init", text: [model, mode].filter(Boolean).join(" · ") || "session init" });
        continue;
      }
      if (type === "assistant") {
        const message = parsed.message as Record<string, unknown> | undefined;
        const content = Array.isArray(message?.content) ? message?.content : [];
        for (const blockCandidate of content) {
          if (!blockCandidate || typeof blockCandidate !== "object" || Array.isArray(blockCandidate)) {
            continue;
          }
          const block = blockCandidate as Record<string, unknown>;
          if (block.type === "thinking" && typeof block.thinking === "string") {
            events.push({ kind: "thinking", text: clip(block.thinking) });
            continue;
          }
          if (block.type === "text" && typeof block.text === "string") {
            events.push({ kind: "assistant", text: clip(block.text) });
            continue;
          }
          if (block.type === "tool_use") {
            const label = typeof block.name === "string" ? block.name : "tool";
            events.push({
              kind: "tool_call",
              label,
              text: "tool invocation",
              payload: block.input ? clip(JSON.stringify(block.input), 320) : undefined
            });
          }
        }
        continue;
      }
      if (type === "result") {
        const result = typeof parsed.result === "string" ? parsed.result : "result event";
        const stopReason = typeof parsed.stop_reason === "string" ? parsed.stop_reason : undefined;
        events.push({ kind: "result", label: stopReason, text: clip(result) });
      }
    } catch {
      // ignore parse failures in truncated preview lines
    }
  }
  return events.slice(0, 40);
}

function clip(text: string, max = 220) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}...`;
}

function formatResultText(result?: string | null) {
  const input = result?.trim();
  if (!input) {
    return "";
  }
  const normalized = input.replace(/\\n/g, "\n").replace(/\\"/g, "\"").trim();
  const summaryMatch = normalized.match(/\{[\s\S]*"summary"\s*:\s*"([\s\S]*?)"[\s\S]*\}\s*$/);
  const summaryValue = summaryMatch?.[1]
    ?.replace(/\\"/g, "\"")
    .replace(/\\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutJson = summaryMatch ? normalized.slice(0, summaryMatch.index).trim() : normalized;
  const bullets = splitResultSegments(withoutJson);
  if (summaryValue) {
    bullets.push(`Summary: ${summaryValue}`);
  }
  return bullets.join("\n");
}

function formatFallbackResult(details?: RunDetails) {
  if (!details) {
    return "";
  }
  const lines: string[] = [];
  if (typeof details.message === "string" && details.message.trim().length > 0) {
    lines.push(details.message.trim());
  }
  if (typeof details.errorMessage === "string" && details.errorMessage.trim().length > 0) {
    lines.push(details.errorMessage.trim());
  }
  const blockers = details.outcome?.blockers ?? [];
  const actions = details.outcome?.actions ?? [];
  const firstBlocker = blockers.find((blocker) => typeof blocker?.message === "string" && blocker.message.trim().length > 0);
  if (firstBlocker?.message) {
    lines.push(`Blocker: ${firstBlocker.message.trim()}`);
  }
  const firstAction = actions.find((action) => typeof action?.detail === "string" && action.detail.trim().length > 0);
  if (firstAction?.detail) {
    lines.push(firstAction.detail.trim());
  }
  if (details.trace?.timedOut) {
    lines.push(
      details.trace?.timeoutSource === "watchdog"
        ? "Run timed out in the outer watchdog before the adapter returned."
        : "Run timed out before completion."
    );
  }
  if (details.trace?.failureType) {
    lines.push(`Failure type: ${details.trace.failureType}`);
  }
  if (details.trace?.command) {
    lines.push(`Command: ${details.trace.command}`);
  }
  if (details.trace?.cwd) {
    lines.push(`cwd: ${details.trace.cwd}`);
  }
  if (details.trace?.session?.resumeSkippedReason) {
    lines.push(`Resume skipped: ${details.trace.session.resumeSkippedReason}`);
  }
  if (details.trace?.session?.clearedStaleSession) {
    lines.push("Cleared stale saved session before continuing.");
  }
  const stderrHint = firstNonEmptyLine(details.trace?.stderrPreview);
  if (stderrHint) {
    lines.push(`stderr: ${stderrHint}`);
  }
  const stdoutHint = firstNonEmptyLine(details.trace?.stdoutPreview);
  if (stdoutHint && lines.length < 2) {
    lines.push(`stdout: ${stdoutHint}`);
  }
  return lines.join("\n");
}

function splitResultSegments(text: string) {
  const compact = text
    .replace(/\s+-\s+/g, "\n- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!compact) {
    return [];
  }
  const lines = compact
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const result: string[] = [];
  for (const line of lines) {
    if (line.startsWith("-")) {
      result.push(line);
      continue;
    }
    if (/^\d+\./.test(line)) {
      result.push(line);
      continue;
    }
    result.push(line);
  }
  return result;
}

function firstNonEmptyLine(value?: string | null) {
  if (!value) {
    return "";
  }
  return (
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}
