import { describe, expect, it } from "vitest";
import {
  assertValidTimeZone,
  dailyCronAtLocalTime,
  matchesCronInTimeZone,
  nextCronFireAfter,
  validateCronExpression,
  weeklyCronAtLocalTime
} from "../apps/api/src/services/work-loop-service/loop-cron";

describe("work loop cron (timezone-aware)", () => {
  it("validates five-field cron", () => {
    expect(validateCronExpression("0 10 * * *")).toBeNull();
    expect(validateCronExpression("bad")).not.toBeNull();
  });

  it("assertValidTimeZone rejects invalid", () => {
    expect(() => assertValidTimeZone("Not/AZone")).toThrow();
    expect(() => assertValidTimeZone("UTC")).not.toThrow();
  });

  it("daily preset matches expected local wall time in UTC", () => {
    const expr = dailyCronAtLocalTime(10, 30);
    const d = new Date("2026-03-26T10:30:00.000Z");
    expect(matchesCronInTimeZone(expr, "UTC", d)).toBe(true);
    expect(matchesCronInTimeZone(expr, "UTC", new Date("2026-03-26T10:31:00.000Z"))).toBe(false);
  });

  it("weekly preset restricts weekday", () => {
    const expr = weeklyCronAtLocalTime(1, 9, 0); // Monday 09:00
    expect(matchesCronInTimeZone(expr, "UTC", new Date("2024-01-01T09:00:00.000Z"))).toBe(true); // Mon
    expect(matchesCronInTimeZone(expr, "UTC", new Date("2024-01-02T09:00:00.000Z"))).toBe(false); // Tue
  });

  it("nextCronFireAfter returns a tick strictly after anchor", () => {
    const expr = "0 * * * *"; // top of every hour UTC
    const after = new Date("2026-03-26T14:30:00.000Z");
    const next = nextCronFireAfter(expr, "UTC", after);
    expect(next).not.toBeNull();
    expect(next!.toISOString()).toBe("2026-03-26T15:00:00.000Z");
  });
});
