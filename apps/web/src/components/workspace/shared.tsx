"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export const goalStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" }
] as const;

export function MetricCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="ui-feature-metric-card">
      <CardHeader className="ui-feature-metric-header">
        <CardDescription className="ui-feature-metric-label">{label}</CardDescription>
      </CardHeader>
      <CardContent className="ui-feature-metric-content">
        <div className="ui-feature-metric-value">{value}</div>
        {hint ? <p className="ui-feature-metric-hint">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="ui-feature-empty-state">{children}</div>;
}

export function SectionHeading({
  title,
  description,
  actions
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="ui-feature-section-row">
      <div>
        <h2 className="ui-feature-section-title">{title}</h2>
        <p className="ui-feature-section-description">{description}</p>
      </div>
      {actions ? <div className="ui-feature-section-actions">{actions}</div> : null}
    </div>
  );
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

export function formatDuration(startedAt: string, finishedAt?: string | null) {
  if (!finishedAt) {
    return "running";
  }
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return "n/a";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}
