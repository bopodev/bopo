const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

export function assertValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    throw new Error(`Invalid timezone: ${timeZone}`);
  }
}

export function floorToUtcMinute(date: Date) {
  const d = new Date(date.getTime());
  d.setUTCSeconds(0, 0);
  return d;
}

function getZonedCalendarParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short"
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const weekday = WEEKDAY_INDEX[map.weekday ?? ""];
  if (weekday == null) {
    throw new Error(`Unable to resolve weekday for timezone ${timeZone}`);
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday
  };
}

function matchesCronField(field: string, value: number, min: number, max: number) {
  return field.split(",").some((part) => matchesCronPart(part.trim(), value, min, max));
}

function matchesCronPart(part: string, value: number, min: number, max: number): boolean {
  if (part === "*") {
    return true;
  }
  const stepMatch = part.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    const step = Number(stepMatch[1]);
    return Number.isInteger(step) && step > 0 ? (value - min) % step === 0 : false;
  }
  const rangeMatch = part.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    return start <= value && value <= end;
  }
  const exact = Number(part);
  return Number.isInteger(exact) && exact >= min && exact <= max && exact === value;
}

export type ParsedCron = {
  minutes: number[];
  hours: number[];
  daysOfMonth: number[];
  months: number[];
  daysOfWeek: number[];
};

function expandField(field: string, min: number, max: number): number[] {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const p = part.trim();
    if (p === "*") {
      for (let v = min; v <= max; v += 1) {
        out.add(v);
      }
      continue;
    }
    const stepMatch = p.match(/^\*\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[1]);
      if (Number.isInteger(step) && step > 0) {
        for (let v = min; v <= max; v += 1) {
          if ((v - min) % step === 0) {
            out.add(v);
          }
        }
      }
      continue;
    }
    const rangeMatch = p.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      for (let v = start; v <= end; v += 1) {
        if (v >= min && v <= max) {
          out.add(v);
        }
      }
      continue;
    }
    const exact = Number(p);
    if (Number.isInteger(exact) && exact >= min && exact <= max) {
      out.add(exact);
    }
  }
  return [...out].sort((a, b) => a - b);
}

export function parseCronExpression(expression: string): ParsedCron | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return null;
  }
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [string, string, string, string, string];
  return {
    minutes: expandField(minute, 0, 59),
    hours: expandField(hour, 0, 23),
    daysOfMonth: expandField(dayOfMonth, 1, 31),
    months: expandField(month, 1, 12),
    daysOfWeek: expandField(dayOfWeek, 0, 6)
  };
}

export function matchesCronInTimeZone(expression: string, timeZone: string, date: Date) {
  const cron = parseCronExpression(expression);
  if (!cron) {
    return false;
  }
  const z = getZonedCalendarParts(date, timeZone);
  return (
    cron.minutes.includes(z.minute) &&
    cron.hours.includes(z.hour) &&
    cron.daysOfMonth.includes(z.day) &&
    cron.months.includes(z.month) &&
    cron.daysOfWeek.includes(z.weekday)
  );
}

/** First minute strictly after `after` (UTC floored) where the cron matches in `timeZone`. */
export function nextCronFireAfter(expression: string, timeZone: string, after: Date): Date | null {
  const trimmed = expression.trim();
  assertValidTimeZone(timeZone);
  if (!parseCronExpression(trimmed)) {
    return null;
  }
  const cursor = new Date(floorToUtcMinute(after).getTime() + 60_000);
  const limit = 366 * 24 * 60 + 10;
  for (let i = 0; i < limit; i += 1) {
    if (matchesCronInTimeZone(trimmed, timeZone, cursor)) {
      return new Date(cursor.getTime());
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return null;
}

export function validateCronExpression(expression: string): string | null {
  const trimmed = expression.trim();
  if (!parseCronExpression(trimmed)) {
    return "Cron must have five space-separated fields (minute hour day-of-month month day-of-week).";
  }
  return null;
}

/** Build cron for "every day at HH:MM" in the given timezone (wall-clock). */
export function dailyCronAtLocalTime(hour24: number, minute: number) {
  if (!Number.isInteger(hour24) || hour24 < 0 || hour24 > 23) {
    throw new Error("hour must be 0–23");
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("minute must be 0–59");
  }
  return `${minute} ${hour24} * * *`;
}

/** Build cron for "weekly on weekday (0=Sun..6=Sat) at HH:MM". */
export function weeklyCronAtLocalTime(dayOfWeek: number, hour24: number, minute: number) {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("dayOfWeek must be 0–6 (Sun–Sat)");
  }
  return `${minute} ${hour24} * * ${dayOfWeek}`;
}
