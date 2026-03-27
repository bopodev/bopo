export function formatRelativeAgeCompact(timestamp: string | null) {
  if (!timestamp) {
    return "n/a";
  }
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ageMs)) {
    return "n/a";
  }
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 1) {
    return `${Math.max(Math.round(ageHours * 60), 1)}m`;
  }
  if (ageHours < 24) {
    return `${ageHours.toFixed(1)}h`;
  }
  return `${(ageHours / 24).toFixed(1)}d`;
}

export function monthKeyFromDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

/** Instants delimiting the user's local calendar month (same basis as {@link monthKeyFromDate} for ledger rows). */
export function localCalendarMonthUtcRange(monthKey: string): { fromIso: string; toExclusiveIso: string } | null {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    return null;
  }
  const startLocal = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endExclusiveLocal = new Date(year, month, 1, 0, 0, 0, 0);
  return { fromIso: startLocal.toISOString(), toExclusiveIso: endExclusiveLocal.toISOString() };
}

export function formatMonthLabel(monthKey: string) {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return monthKey;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  return new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

export function dayKeyFromDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Local calendar day (1–31) for `createdAt` when it falls in `monthKey` (YYYY-MM); aligns with {@link dayKeyFromDate} for bucketing. */
export function localCalendarDayInMonthKey(createdAt: string, monthKey: string): number | null {
  if (monthKeyFromDate(createdAt) !== monthKey) {
    return null;
  }
  const dk = dayKeyFromDate(createdAt);
  if (!dk || !dk.startsWith(`${monthKey}-`)) {
    return null;
  }
  const day = Number(dk.slice(8, 10));
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : null;
}

export function buildRecentDayKeys(days: number) {
  const now = new Date();
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    dayKeys.push(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`);
  }
  return dayKeys;
}
