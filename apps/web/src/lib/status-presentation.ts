type StatusPresentation = {
  badgeClassName: string;
  chartColor: string;
};

/** Brighter fills/borders on dark so status pills read clearly (tables, runs, etc.). */
const BADGE_EMERALD =
  "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-400/28 dark:text-emerald-100";
const BADGE_SKY =
  "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:border-sky-400/55 dark:bg-sky-500/30 dark:text-sky-100";
const BADGE_AMBER =
  "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:border-amber-400/55 dark:bg-amber-400/28 dark:text-amber-100";
const BADGE_VIOLET =
  "border-violet-500/40 bg-violet-500/15 text-violet-700 dark:border-violet-400/55 dark:bg-violet-500/30 dark:text-violet-100";
const BADGE_SLATE =
  "border-slate-500/40 bg-slate-500/15 text-slate-700 dark:border-slate-400/50 dark:bg-slate-400/22 dark:text-slate-100";
const BADGE_ROSE =
  "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:border-rose-400/60 dark:bg-rose-500/32 dark:text-rose-100";

const STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  active: {
    badgeClassName: BADGE_EMERALD,
    chartColor: "var(--color-chart-2)"
  },
  approved: {
    badgeClassName: BADGE_EMERALD,
    chartColor: "var(--color-chart-2)"
  },
  done: {
    badgeClassName: BADGE_EMERALD,
    chartColor: "var(--color-chart-2)"
  },
  completed: {
    badgeClassName: BADGE_EMERALD,
    chartColor: "var(--color-chart-2)"
  },
  success: {
    badgeClassName: BADGE_EMERALD,
    chartColor: "var(--color-chart-2)"
  },
  running: {
    badgeClassName: BADGE_SKY,
    chartColor: "var(--color-chart-1)"
  },
  started: {
    badgeClassName: BADGE_SKY,
    chartColor: "var(--color-chart-1)"
  },
  in_progress: {
    badgeClassName: BADGE_SKY,
    chartColor: "var(--color-chart-1)"
  },
  pending: {
    badgeClassName: BADGE_AMBER,
    chartColor: "var(--color-chart-4)"
  },
  todo: {
    badgeClassName: BADGE_AMBER,
    chartColor: "var(--color-chart-4)"
  },
  draft: {
    badgeClassName: BADGE_AMBER,
    chartColor: "var(--color-chart-4)"
  },
  in_review: {
    badgeClassName: BADGE_VIOLET,
    chartColor: "var(--color-chart-3)"
  },
  overridden: {
    badgeClassName: BADGE_VIOLET,
    chartColor: "var(--color-chart-3)"
  },
  paused: {
    badgeClassName: BADGE_SLATE,
    chartColor: "var(--color-chart-4)"
  },
  skipped: {
    badgeClassName: BADGE_SLATE,
    chartColor: "var(--color-chart-4)"
  },
  failed: {
    badgeClassName: BADGE_ROSE,
    chartColor: "var(--color-chart-5)"
  },
  rejected: {
    badgeClassName: BADGE_ROSE,
    chartColor: "var(--color-chart-5)"
  },
  blocked: {
    badgeClassName: BADGE_ROSE,
    chartColor: "var(--color-chart-5)"
  },
  canceled: {
    badgeClassName: BADGE_ROSE,
    chartColor: "var(--color-chart-5)"
  },
  archived: {
    badgeClassName: BADGE_ROSE,
    chartColor: "var(--color-chart-5)"
  },
  terminated: {
    badgeClassName: BADGE_ROSE,
    chartColor: "var(--color-chart-5)"
  }
};

function normalizeStatus(status: string) {
  return status.toLowerCase().replace(/[\s-]+/g, "_");
}

export function getStatusBadgeClassName(status: string) {
  const normalized = normalizeStatus(status);
  return STATUS_PRESENTATION[normalized]?.badgeClassName ?? "border-border bg-muted/40 text-foreground";
}

export function getStatusChartColor(status: string, fallback = "var(--color-chart-1)") {
  const normalized = normalizeStatus(status);
  return STATUS_PRESENTATION[normalized]?.chartColor ?? fallback;
}
