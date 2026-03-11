import type {
  ApprovalRow,
  AgentRow,
  AuditRow,
  CompanyRow,
  CostRow,
  GoalRow,
  GovernanceInboxRow,
  HeartbeatRunRow,
  IssueRow,
  ProjectRow
} from "@/components/workspace/types";

export interface WorkspacePageProps {
  companyId: string | null;
  activeCompany: CompanyRow | null;
  companies: CompanyRow[];
  issues: IssueRow[];
  agents: AgentRow[];
  heartbeatRuns: HeartbeatRunRow[];
  goals: GoalRow[];
  approvals: ApprovalRow[];
  governanceInbox?: GovernanceInboxRow[];
  auditEvents: AuditRow[];
  costEntries: CostRow[];
  projects: ProjectRow[];
}
