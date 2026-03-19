import { describe, expect, it } from "vitest";
import { containsProviderUsageLimitFailure } from "../packages/agent-sdk/src/runtime";

describe("provider usage limit classifier", () => {
  it("detects OpenAI usage-limit payload text", () => {
    const text =
      'API Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits. You will regain access on 2026-04-01 at 00:00 UTC."}}';
    expect(containsProviderUsageLimitFailure(text)).toBe(true);
  });

  it("keeps generic request errors from matching by default", () => {
    const text = 'API Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"Malformed input payload."}}';
    expect(containsProviderUsageLimitFailure(text)).toBe(false);
  });
});
