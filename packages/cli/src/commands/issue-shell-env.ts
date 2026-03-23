import process from "node:process";

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error?: string };

function readEnv(name: string, fallback = "") {
  return (process.env[name] ?? fallback).trim();
}

function buildActorHeaders(): Record<string, string> {
  const token = readEnv("BOPO_ACTOR_TOKEN") || readEnv("BOPODEV_ACTOR_TOKEN");
  if (token) {
    return { authorization: `Bearer ${token}` };
  }
  return {
    "x-actor-type": "board",
    "x-actor-id": "bopodev-cli",
    "x-actor-companies": "",
    "x-actor-permissions": ""
  };
}

export async function runIssueShellEnvCommand(
  issueId: string,
  options: { apiUrl: string; companyId: string; json: boolean }
) {
  const base = options.apiUrl.replace(/\/$/, "");
  const headers: Record<string, string> = {
    "x-company-id": options.companyId,
    ...buildActorHeaders()
  };

  const issueRes = await fetch(`${base}/issues/${encodeURIComponent(issueId)}`, { headers });
  const issueRaw = (await issueRes.json()) as ApiEnvelope<{
    id: string;
    projectId: string;
    companyId: string;
    title: string;
  }>;
  if (!issueRes.ok || !issueRaw.ok) {
    throw new Error(
      !issueRaw.ok && "error" in issueRaw ? String(issueRaw.error) : `Failed to load issue (${issueRes.status})`
    );
  }
  const issue = issueRaw.data;

  const wsRes = await fetch(`${base}/projects/${encodeURIComponent(issue.projectId)}/workspaces`, { headers });
  const wsRaw = (await wsRes.json()) as ApiEnvelope<
    Array<{ isPrimary: boolean; cwd: string | null; name: string; id: string }>
  >;
  if (!wsRes.ok || !wsRaw.ok) {
    throw new Error(
      !wsRaw.ok && "error" in wsRaw ? String(wsRaw.error) : `Failed to load workspaces (${wsRes.status})`
    );
  }
  const workspaces = wsRaw.data;
  const primary = workspaces.find((w) => w.isPrimary) ?? workspaces[0];
  const cwd = primary?.cwd?.trim() || "";

  const env = {
    BOPODEV_API_BASE_URL: base,
    BOPODEV_COMPANY_ID: options.companyId,
    BOPODEV_ISSUE_ID: issue.id,
    BOPODEV_PROJECT_ID: issue.projectId
  };

  if (options.json) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ...env, suggestedCwd: cwd || null, issueTitle: issue.title }, null, 2));
    return;
  }

  const lines = [
    `# Issue: ${issue.title}`,
    `export BOPODEV_API_BASE_URL=${shellQuote(base)}`,
    `export BOPODEV_COMPANY_ID=${shellQuote(options.companyId)}`,
    `export BOPODEV_ISSUE_ID=${shellQuote(issue.id)}`,
    `export BOPODEV_PROJECT_ID=${shellQuote(issue.projectId)}`
  ];
  if (cwd) {
    lines.push(`cd ${shellQuote(cwd)}`);
  } else {
    lines.push("# No primary workspace cwd set for this project; set cwd in project workspaces in the UI.");
  }
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
}

function shellQuote(value: string) {
  if (!/[\s'"\\$`!]/.test(value)) {
    return value;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
