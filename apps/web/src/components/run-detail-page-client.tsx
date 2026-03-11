"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { subscribeToRealtime } from "@/lib/realtime";
import type { HeartbeatRunDetailData, HeartbeatRunMessageRow } from "@/lib/workspace-data";
import { SectionHeading } from "./workspace/shared";

export function RunDetailPageClient({
  companyId,
  companies,
  runDetail,
  initialMessages,
  nextCursor,
  agentName,
  scopedAgentId,
  recentRuns
}: {
  companyId: string;
  companies: Array<{ id: string; name: string }>;
  runDetail: HeartbeatRunDetailData;
  initialMessages: HeartbeatRunMessageRow[];
  nextCursor: string | null;
  agentName: string;
  scopedAgentId: string | null;
  recentRuns: Array<{
    id: string;
    agentId: string;
    status: string;
    runType: "work" | "no_assigned_work" | "budget_skip" | "overlap_skip" | "other_skip" | "failed" | "running";
    message: string | null;
    startedAt: string;
    finishedAt?: string | null;
  }>;
}) {
  const [run, setRun] = useState(runDetail.run);
  const [messages, setMessages] = useState(initialMessages);
  const [cursor, setCursor] = useState<string | null>(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToRealtime({
      companyId,
      channels: ["heartbeat-runs"],
      onMessage: (message) => {
        if (message.kind !== "event" || message.channel !== "heartbeat-runs") {
          return;
        }
        const event = message.event;
        if (event.type === "runs.snapshot") {
          const runSnapshot = event.runs.find((entry) => entry.runId === runDetail.run.id);
          if (runSnapshot) {
            setRun((prev) => ({
              ...prev,
              status: runSnapshot.status,
              message: runSnapshot.message ?? prev.message,
              startedAt: runSnapshot.startedAt ?? prev.startedAt,
              finishedAt: runSnapshot.finishedAt ?? prev.finishedAt
            }));
          }
          const transcriptSnapshot = event.transcripts.find((entry) => entry.runId === runDetail.run.id);
          if (transcriptSnapshot) {
            setMessages((prev) => {
              const known = new Set(prev.map((entry) => entry.id));
              const appended = transcriptSnapshot.messages
                .filter((entry) => !known.has(entry.id))
                .map((entry) => ({ ...entry, companyId }));
              return [...prev, ...appended];
            });
            setCursor(transcriptSnapshot.nextCursor);
          }
          return;
        }
        if (event.type === "run.status.updated") {
          if (event.runId !== runDetail.run.id) {
            return;
          }
          setRun((prev) => ({
            ...prev,
            status: event.status,
            message: event.message ?? prev.message,
            startedAt: event.startedAt ?? prev.startedAt,
            finishedAt: event.finishedAt ?? prev.finishedAt
          }));
          return;
        }
        if (event.type === "run.transcript.snapshot") {
          if (event.runId !== runDetail.run.id) {
            return;
          }
          setMessages((prev) => {
            const known = new Set(prev.map((entry) => entry.id));
            const appended = event.messages
              .filter((entry) => !known.has(entry.id))
              .map((entry) => ({ ...entry, companyId }));
            return [...prev, ...appended];
          });
          setCursor(event.nextCursor);
          return;
        }
        if (event.type === "run.transcript.append") {
          if (event.runId !== runDetail.run.id) {
            return;
          }
          setMessages((prev) => {
            const known = new Set(prev.map((entry) => entry.id));
            const appended = event.messages
              .filter((entry) => !known.has(entry.id))
              .map((entry) => ({ ...entry, companyId }));
            return [...prev, ...appended];
          });
        }
      }
    });
    return unsubscribe;
  }, [companyId, runDetail.run.id]);

  const sortedMessages = useMemo(() => [...messages].sort((a, b) => a.sequence - b.sequence), [messages]);
  const transcriptRows = useMemo(() => toTranscriptRows(sortedMessages), [sortedMessages]);
  const backHref = scopedAgentId
    ? { pathname: `/agents/${scopedAgentId}`, query: { companyId } }
    : { pathname: "/runs", query: { companyId } };
  const backLabel = scopedAgentId ? "Back to agent" : "Back to runs";

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = transcriptScrollRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [transcriptRows.length]);

  return (
    <AppShell
      activeNav="Runs"
      companies={companies}
      activeCompanyId={companyId}
      secondaryPane={
        <div className="run-sidebar-pane">
          <div className="run-sidebar-list">
            {recentRuns.map((entry) => {
              const isActive = entry.id === run.id;
              return (
                <Link
                  key={entry.id}
                  href={{
                    pathname: `/runs/${entry.id}`,
                    query: { companyId, agentId: scopedAgentId ?? undefined }
                  }}
                  className={`run-sidebar-item${isActive ? " run-sidebar-item--active" : ""}`}
                >
                  <div className="run-sidebar-item-header">
                    <span className="run-sidebar-item-id" title={entry.id}>
                      {entry.id}
                    </span>
                    <Badge variant="outline" className="run-sidebar-item-badge">
                      {formatRunStatusLabel(entry.status)}
                    </Badge>
                  </div>
                  <p className="run-sidebar-item-message">{entry.message ?? "No message"}</p>
                  <p className="run-sidebar-item-time">
                    {formatRelativeTime(entry.startedAt)} ({new Date(entry.startedAt).toLocaleTimeString()})
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      }
      leftPane={
        <div className="run-detail-pane">
          <SectionHeading
              title={`Run ${run.id}`}
              description="Realtime status and summary for this run."
              actions={
                <Button asChild variant="outline" size="sm">
                  <Link href={backHref}>{backLabel}</Link>
                </Button>
              }
            />
          {runDetail.transcript.fallbackFromTrace ? (
            <Alert>
              <AlertTitle>Legacy transcript fallback</AlertTitle>
              <AlertDescription>
                This run does not yet have persisted transcript messages. Data may be partial from trace preview.
              </AlertDescription>
            </Alert>
          ) : null}
          <Card>
            <CardContent className="run-transcript-card-content">
              {transcriptRows.length === 0 ? (
                <p className="run-transcript-empty">No transcript messages yet.</p>
              ) : (
                <div className="run-transcript-outer">
                  <div className="run-transcript-col-header">
                    <span>Timestamp</span>
                    <span>Action</span>
                    <span>Result</span>
                  </div>
                  <div className="run-transcript-scroll" ref={transcriptScrollRef}>
                    {transcriptRows.map((row) => (
                      <div key={row.id} className="run-transcript-row">
                        <span className="run-transcript-time">{row.time}</span>
                        <span className={row.kindClass}>{row.kindLabel}</span>
                        <div className={row.isToolBlock ? "run-transcript-body-tool" : "run-transcript-body"}>
                          {row.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      }
    />
  );
}

function toTranscriptRows(messages: HeartbeatRunMessageRow[]) {
  const visibleMessages = messages.slice(-180);
  const normalized = visibleMessages
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      kind: entry.kind,
      kindLabel: toKindLabel(entry.kind),
      groupKey: entry.groupKey ?? entry.kind,
      kindClass: toKindClass(entry.kind),
      body: formatEventBody(entry),
      isToolBlock: entry.kind === "tool_call" || entry.kind === "tool_result"
    }));

  const rows: Array<{
    id: string;
    startedAt: string;
    endedAt: string;
    kind: HeartbeatRunMessageRow["kind"];
    kindLabel: string;
    groupKey: string;
    kindClass: string;
    body: string;
    isToolBlock: boolean;
  }> = [];

  for (const item of normalized) {
    rows.push({
      id: item.id,
      startedAt: item.createdAt,
      endedAt: item.createdAt,
      kind: item.kind,
      kindLabel: item.kindLabel,
      groupKey: item.groupKey,
      kindClass: item.kindClass,
      body: item.body,
      isToolBlock: item.isToolBlock
    });
  }

  return rows.map((row) => ({
    id: row.id,
    time: formatClock(row.startedAt),
    kindLabel: row.kindLabel,
    kindClass: row.kindClass,
    body: row.body,
    isToolBlock: row.isToolBlock
  }));
}


function formatEventBody(entry: HeartbeatRunMessageRow) {
  const text = (entry.text ?? "").trim();
  const payload = (entry.payload ?? "").trim();
  if (entry.kind === "tool_call" || entry.kind === "tool_result") {
    const lines = [entry.label?.trim(), text, payload].filter((part): part is string => Boolean(part && part.length > 0));
    if (lines.length === 0) {
      return "";
    }
    return lines.join("\n");
  }
  const source = text.length > 0 ? text : payload;
  if (!source) {
    return "";
  }
  const normalized = source.trim();
  return normalized.length > 2000 ? `${normalized.slice(0, 2000)}…` : normalized;
}

function toKindLabel(kind: HeartbeatRunMessageRow["kind"]) {
  if (kind === "tool_call") return "tool_call";
  if (kind === "tool_result") return "tool_result";
  if (kind === "system") return "system";
  if (kind === "thinking") return "thinking";
  if (kind === "stderr") return "error";
  if (kind === "assistant") return "assistant";
  if (kind === "result") return "result";
  return kind;
}

function toKindClass(kind: HeartbeatRunMessageRow["kind"]) {
  if (kind === "stderr") return "run-transcript-kind run-transcript-kind--stderr";
  if (kind === "tool_call") return "run-transcript-kind run-transcript-kind--tool-call";
  if (kind === "tool_result") return "run-transcript-kind run-transcript-kind--tool-result";
  if (kind === "result") return "run-transcript-kind run-transcript-kind--result";
  return "run-transcript-kind run-transcript-kind--default";
}

function formatRunStatusLabel(status: string) {
  return status === "started" ? "running" : status;
}


function formatClock(value: string) {
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const sec = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
}

function formatRelativeTime(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  if (ms < 60_000) return "just now";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
