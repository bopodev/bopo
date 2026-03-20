export type FormatSmartDateTimeOptions = {
  /** Include seconds in the time portion (useful for dense lists like heartbeat runs). */
  includeSeconds?: boolean;
};

/** Relative-friendly date/time for lists (Today 3:45 PM, Yesterday …, Mar 20, 3:45 PM). */
export function formatSmartDateTime(value: string | null | undefined, options?: FormatSmartDateTimeOptions) {
  if (!value) {
    return "Unknown time";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  const includeSeconds = options?.includeSeconds ?? false;
  const timeFormat = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" as const } : {})
  });
  const now = new Date();
  const isSameYear = date.getFullYear() === now.getFullYear();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const timeText = timeFormat.format(date);
  if (isToday) {
    return `Today ${timeText}`;
  }
  if (isYesterday) {
    return `Yesterday ${timeText}`;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(isSameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" as const } : {})
  }).format(date);
}
