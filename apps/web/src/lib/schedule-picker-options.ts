export function formatHour12Label(h24: number): string {
  if (h24 === 0) {
    return "12 AM";
  }
  if (h24 === 12) {
    return "12 PM";
  }
  if (h24 < 12) {
    return `${h24} AM`;
  }
  return `${h24 - 12} PM`;
}

export const SCHEDULE_HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: formatHour12Label(h)
}));

export const SCHEDULE_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => ({
  value: String(m),
  label: m.toString().padStart(2, "0")
}));

/** Common IANA zones for shadcn Select; users can pick “Other” and type a zone. */
export const COMMON_IANA_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "Pacific/Auckland"
] as const;
