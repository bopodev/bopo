export function buildAdapterConfig(values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (typeof values.cwd === "string" && values.cwd.trim()) out.cwd = values.cwd.trim();
  if (typeof values.model === "string" && values.model.trim()) out.model = values.model.trim();
  if (typeof values.command === "string" && values.command.trim()) out.command = values.command.trim();
  if (typeof values.timeoutMs === "number" && values.timeoutMs > 0) out.timeoutMs = values.timeoutMs;
  if (typeof values.timeoutSec === "number" && values.timeoutSec > 0) out.timeoutSec = values.timeoutSec;
  if (Array.isArray(values.args)) out.args = values.args.filter((a): a is string => typeof a === "string");
  if (typeof values.env === "object" && values.env !== null && !Array.isArray(values.env)) {
    out.env = values.env as Record<string, string>;
  }
  return out;
}
