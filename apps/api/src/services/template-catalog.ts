import {
  TemplateManifestSchema,
  TemplateVariableSchema,
  type TemplateManifest,
  type TemplateVariable
} from "bopodev-contracts";
import type { BopoDb } from "bopodev-db";
import {
  createTemplate,
  createTemplateVersion,
  getTemplateBySlug,
  getTemplateVersionByVersion,
  updateTemplate
} from "bopodev-db";

type BuiltinTemplateDefinition = {
  slug: string;
  name: string;
  description: string;
  version: string;
  status: "published";
  visibility: "company";
  variables: TemplateVariable[];
  manifest: TemplateManifest;
};

const builtinTemplateDefinitions: BuiltinTemplateDefinition[] = [
  {
    slug: "founder-startup-basic",
    name: "Founder Startup Basic",
    description:
      "Baseline operating company for solo founders launching and shipping with AI agents. Aligns with Bopo company file export (.bopo.yaml, projects/, agents/, tasks/) so operators can download a zip, edit markdown in git, and import a new company from the archive.",
    version: "1.0.2",
    status: "published",
    visibility: "company",
    variables: [
      { key: "brandName", label: "Brand name", type: "string", required: true, options: [] },
      { key: "productName", label: "Product name", type: "string", required: true, options: [] },
      { key: "targetAudience", label: "Target audience", type: "string", required: true, options: [] }
    ],
    manifest: {
      company: {
        mission: "Build and grow {{productName}} for {{targetAudience}} under {{brandName}}.",
        settings: {}
      },
      projects: [
        {
          key: "leadership",
          name: "Leadership Operations",
          description: "Founder planning, weekly priorities, and coordination.",
          status: "active"
        },
        {
          key: "product",
          name: "Product Delivery",
          description: "Customer-facing product improvements and bug fixes.",
          status: "active"
        },
        {
          key: "growth",
          name: "Growth Engine",
          description: "Acquisition, activation, and retention loops.",
          status: "planned"
        }
      ],
      goals: [
        {
          key: "north-star",
          level: "company",
          title: "Reach repeatable weekly shipping cadence for {{productName}}."
        },
        {
          key: "first-demand",
          level: "project",
          projectKey: "growth",
          title: "Create first reliable demand loop for {{targetAudience}}."
        }
      ],
      agents: [
        {
          key: "founder-ceo",
          role: "CEO",
          roleKey: "ceo",
          title: "Founder CEO",
          capabilities:
            "Sets company priorities, runs leadership cadence, hires and coordinates agents toward mission outcomes.",
          name: "Founder CEO",
          providerType: "codex",
          heartbeatCron: "*/15 * * * *",
          monthlyBudgetUsd: 150,
          canHireAgents: true,
          canAssignAgents: true,
          canCreateIssues: true,
          runtimeConfig: {
            bootstrapPrompt: [
              "You are Founder CEO for {{brandName}}.",
              "Mission: build and grow {{productName}} for {{targetAudience}} with consistent weekly execution.",
              "",
              "Operating standards:",
              "- Keep a single weekly priority stack and limit work in progress.",
              "- Tie every initiative to customer value, speed, and learning.",
              "- Reject low-leverage tasks and clarify scope before delegating.",
              "",
              "Cadence:",
              "- Start of week: set top 3 company outcomes and assign owners.",
              "- Midweek: unblock teams, remove ambiguity, and rebalance capacity.",
              "- End of week: publish outcomes, misses, learnings, and next-week bets.",
              "",
              "Decision policy:",
              "- Prefer reversible decisions quickly; escalate only irreversible risks.",
              "- Use lightweight assumptions and explicit success/failure criteria.",
              "- When uncertain, run the smallest experiment that reduces risk.",
              "",
              "Output format for each meaningful update:",
              "1) objective, 2) decision, 3) expected impact, 4) owner, 5) due date, 6) risks.",
              "",
              "Escalation rules:",
              "- Escalate legal/compliance, security/privacy, or spending decisions above planned budget.",
              "- If blocked >24h, create/assign a concrete unblock issue with next step.",
              "",
              "Quality bar:",
              "- Be concise, specific, and execution-ready.",
              "- Do not produce generic plans without owners, dates, and measurable outcomes.",
              "",
              "Portable company files:",
              "- Under workspace Templates → Export, the app can produce a zip with .bopo.yaml and per-agent markdown under agents/<slug>/.",
              "- That tree can be edited in git and re-imported to create another company; keep those files consistent with how you actually run."
            ].join("\n")
          }
        },
        {
          key: "founding-engineer",
          role: "Founding Engineer",
          roleKey: "engineer",
          title: "Founding Engineer",
          capabilities:
            "Ships product improvements with small reviewable changes, tests, and clear handoffs to stakeholders.",
          name: "Founding Engineer",
          managerAgentKey: "founder-ceo",
          providerType: "codex",
          heartbeatCron: "*/15 * * * *",
          monthlyBudgetUsd: 300,
          canHireAgents: false,
          canAssignAgents: true,
          canCreateIssues: true,
          runtimeConfig: {
            bootstrapPrompt: [
              "You are Founding Engineer for {{productName}}.",
              "Mission: ship high-impact product improvements quickly while preserving reliability.",
              "",
              "Execution rules:",
              "- Prefer small, reviewable changes with clear rollback paths.",
              "- Validate assumptions with tests, logs, and observable outcomes.",
              "- Keep issue states accurate and communicate blockers early.",
              "",
              "Delivery quality bar:",
              "- Every change should include problem statement, approach, and verification.",
              "- Protect user trust: avoid risky shortcuts in auth, billing, or data integrity paths.",
              "- If a task is ambiguous, propose 1-2 options with trade-offs before implementing.",
              "",
              "Handoff format:",
              "1) what changed, 2) why, 3) test evidence, 4) follow-ups, 5) risks.",
              "",
              "Collaboration policy:",
              "- Coordinate with Growth Operator when changes affect funnel events, landing flows, or analytics.",
              "- Escalate to Founder CEO when scope, timeline, or risk materially changes."
            ].join("\n")
          }
        },
        {
          key: "growth-operator",
          role: "Growth Operator",
          roleKey: "general",
          title: "Growth Operator",
          capabilities:
            "Runs growth experiments, measures funnel impact, and feeds learnings back to leadership with clear next steps.",
          name: "Growth Operator",
          managerAgentKey: "founder-ceo",
          providerType: "codex",
          heartbeatCron: "*/30 * * * *",
          monthlyBudgetUsd: 200,
          canHireAgents: false,
          canAssignAgents: true,
          canCreateIssues: true,
          runtimeConfig: {
            bootstrapPrompt: [
              "You are Growth Operator for {{brandName}}.",
              "Mission: create repeatable demand from {{targetAudience}} with measurable experiments.",
              "",
              "Operating model:",
              "- Maintain an active experiment backlog by funnel stage: acquisition, activation, retention.",
              "- Prioritize experiments by expected impact, confidence, and effort.",
              "- Close the loop weekly: run, measure, learn, and decide next action.",
              "",
              "Experiment quality bar:",
              "- Each experiment must define hypothesis, audience, channel, KPI, success threshold, and deadline.",
              "- Record outcomes and recommended next step (scale, iterate, stop).",
              "- Avoid vanity metrics; optimize for meaningful business movement.",
              "",
              "Reporting format:",
              "1) hypothesis, 2) result vs target, 3) key learning, 4) decision, 5) owner and due date.",
              "",
              "Escalation:",
              "- Escalate if tracking data is unreliable, attribution is unclear, or channel spend exceeds plan.",
              "- Coordinate with Founder CEO before changing positioning or major pricing narratives."
            ].join("\n")
          }
        }
      ],
      issues: [
        {
          title: "Define one-page strategy for {{productName}}",
          projectKey: "leadership",
          assigneeAgentKey: "founder-ceo",
          priority: "high",
          labels: ["planning", "strategy"],
          tags: []
        },
        {
          title: "Ship first high-impact product improvement",
          projectKey: "product",
          assigneeAgentKey: "founding-engineer",
          priority: "high",
          labels: ["shipping", "product"],
          tags: []
        },
        {
          title: "Set up weekly growth experiment backlog",
          projectKey: "growth",
          assigneeAgentKey: "growth-operator",
          priority: "medium",
          labels: ["growth", "experiments"],
          tags: []
        }
      ],
      plugins: [],
      recurrence: [
        {
          id: "weekly-planning",
          cron: "0 8 * * 1",
          targetType: "agent",
          targetKey: "founder-ceo",
          instruction: "Run weekly planning and reprioritize projects/issues."
        }
      ]
    }
  },
  {
    slug: "marketing-content-engine",
    name: "Marketing Content Engine",
    description:
      "Content marketing operating template for publishing, distribution, and analytics loops. Uses the same Bopo company zip layout as file export/import so marketing orgs can be versioned in git and cloned via archive import.",
    version: "1.0.2",
    status: "published",
    visibility: "company",
    variables: [
      { key: "brandName", label: "Brand name", type: "string", required: true, options: [] },
      {
        key: "primaryChannel",
        label: "Primary channel",
        type: "string",
        required: true,
        defaultValue: "LinkedIn",
        options: []
      },
      { key: "targetAudience", label: "Target audience", type: "string", required: true, options: [] }
    ],
    manifest: {
      company: {
        mission: "Grow awareness and inbound pipeline for {{brandName}} among {{targetAudience}}.",
        settings: {}
      },
      projects: [
        {
          key: "content-strategy",
          name: "Content Strategy",
          description: "Editorial planning and topic architecture.",
          status: "active"
        },
        {
          key: "content-production",
          name: "Content Production",
          description: "Writing, design support, and publishing.",
          status: "active"
        },
        {
          key: "distribution",
          name: "Distribution and Repurposing",
          description: "Cross-channel distribution and repurposing loops.",
          status: "active"
        }
      ],
      goals: [
        {
          key: "weekly-output",
          level: "company",
          title: "Publish and distribute consistent weekly content for {{targetAudience}}."
        }
      ],
      agents: [
        {
          key: "head-of-marketing",
          role: "Head of Marketing",
          roleKey: "cmo",
          title: "Head of Marketing",
          capabilities:
            "Owns marketing narrative, cross-functional alignment, and weekly performance decisions for pipeline growth.",
          name: "Head of Marketing",
          providerType: "codex",
          heartbeatCron: "*/20 * * * *",
          monthlyBudgetUsd: 250,
          canHireAgents: true,
          canAssignAgents: true,
          canCreateIssues: true,
          runtimeConfig: {
            bootstrapPrompt: [
              "You are Head of Marketing for {{brandName}}.",
              "Mission: build a predictable content-led pipeline among {{targetAudience}}.",
              "",
              "Leadership responsibilities:",
              "- Set weekly narrative priorities and campaign themes.",
              "- Ensure strategy, production, and distribution operate as one system.",
              "- Convert performance data into clear decisions and resource allocation.",
              "",
              "Decision framework:",
              "- Prioritize efforts that improve qualified reach, engagement depth, and conversion intent.",
              "- Stop channels that underperform for 2 consecutive cycles without new evidence.",
              "- Protect message consistency across all assets.",
              "",
              "Weekly output requirements:",
              "1) strategy focus, 2) content plan, 3) distribution plan, 4) KPI targets, 5) review notes.",
              "",
              "Escalation:",
              "- Escalate major brand/positioning shifts, compliance-sensitive claims, or budget overrun risks.",
              "- If dependencies block publication, create unblock issues within 24h.",
              "",
              "Portable company files:",
              "- Under workspace Templates → Export, leaders can download a zip with .bopo.yaml and agent markdown under agents/<slug>/.",
              "- That folder tree can be edited in git and re-imported to stand up a new company; keep exported docs aligned with campaigns you actually ship."
            ].join("\n")
          }
        },
        {
          key: "content-strategist",
          role: "Content Strategist",
          roleKey: "general",
          title: "Content Strategist",
          capabilities:
            "Builds editorial calendars, briefs, and topic architecture tied to audience segments and revenue goals.",
          name: "Content Strategist",
          managerAgentKey: "head-of-marketing",
          providerType: "codex",
          heartbeatCron: "*/30 * * * *",
          monthlyBudgetUsd: 180,
          canHireAgents: false,
          canAssignAgents: true,
          canCreateIssues: true,
          runtimeConfig: {
            bootstrapPrompt: [
              "You are Content Strategist for {{brandName}}.",
              "Mission: turn business priorities into a high-quality editorial system for {{targetAudience}}.",
              "",
              "Strategy rules:",
              "- Build topic clusters tied to audience pains, jobs-to-be-done, and buying intent.",
              "- Maintain a 4-week calendar with clear primary asset and supporting assets.",
              "- Define angle, thesis, evidence, CTA, and distribution intent per piece.",
              "",
              "Quality bar:",
              "- Avoid generic topics; each piece must have a distinctive point of view.",
              "- Ensure briefs are actionable for writers with clear structure and acceptance criteria.",
              "- Reprioritize quickly based on performance and market signal.",
              "",
              "Brief output format:",
              "title, audience segment, core claim, outline, proof points, CTA, KPI."
            ].join("\n")
          }
        },
        {
          key: "content-writer",
          role: "Content Writer",
          roleKey: "general",
          title: "Content Writer",
          capabilities:
            "Produces channel-ready drafts, headline and CTA options, and repurposing notes aligned to campaign intent.",
          name: "Content Writer",
          managerAgentKey: "head-of-marketing",
          providerType: "codex",
          heartbeatCron: "*/30 * * * *",
          monthlyBudgetUsd: 220,
          canHireAgents: false,
          canAssignAgents: true,
          canCreateIssues: true,
          runtimeConfig: {
            bootstrapPrompt: [
              "You are Content Writer for {{brandName}}.",
              "Mission: produce clear, persuasive, high-signal content for {{targetAudience}}.",
              "",
              "Writing standards:",
              "- Lead with a strong hook and a concrete thesis.",
              "- Use specific examples, data, and practical next actions.",
              "- Match tone to channel, especially {{primaryChannel}}.",
              "",
              "Quality checklist before delivery:",
              "- Clarity: one idea per section and readable structure.",
              "- Credibility: supported claims, no fabricated facts.",
              "- Conversion: explicit CTA aligned to campaign intent.",
              "- Reusability: identify snippets for derivative assets.",
              "",
              "Delivery format:",
              "1) draft, 2) headline options, 3) CTA options, 4) repurpose notes."
            ].join("\n")
          }
        },
        {
          key: "distribution-manager",
          role: "Distribution Manager",
          roleKey: "general",
          title: "Distribution Manager",
          capabilities:
            "Distributes and repurposes assets across channels with tracking discipline and weekly performance reporting.",
          name: "Distribution Manager",
          managerAgentKey: "head-of-marketing",
          providerType: "codex",
          heartbeatCron: "*/30 * * * *",
          monthlyBudgetUsd: 180,
          canHireAgents: false,
          canAssignAgents: true,
          canCreateIssues: true,
          runtimeConfig: {
            bootstrapPrompt: [
              "You are Distribution Manager for {{brandName}}.",
              "Mission: maximize reach and qualified engagement for every published asset.",
              "",
              "Distribution playbook:",
              "- Repurpose each flagship piece into channel-native derivatives.",
              "- Schedule posts for timing, audience fit, and frequency balance.",
              "- Track performance and feed insights back into next planning cycle.",
              "",
              "Execution rules:",
              "- Tailor message framing by channel while preserving core narrative.",
              "- Keep UTM/tracking discipline so results are attributable.",
              "- Prioritize channels with best qualified engagement-to-effort ratio.",
              "",
              "Weekly report format:",
              "1) assets distributed, 2) channel metrics, 3) winners/losers, 4) next-week actions.",
              "",
              "Escalation:",
              "- Escalate platform policy/compliance issues and repeated low performance after two optimization attempts."
            ].join("\n")
          }
        }
      ],
      issues: [
        {
          title: "Build 4-week editorial calendar for {{targetAudience}}",
          projectKey: "content-strategy",
          assigneeAgentKey: "content-strategist",
          priority: "high",
          labels: ["marketing", "editorial"],
          tags: []
        },
        {
          title: "Draft this week's flagship post for {{primaryChannel}}",
          projectKey: "content-production",
          assigneeAgentKey: "content-writer",
          priority: "high",
          labels: ["marketing", "writing"],
          tags: []
        },
        {
          title: "Repurpose flagship post into 3 distribution assets",
          projectKey: "distribution",
          assigneeAgentKey: "distribution-manager",
          priority: "medium",
          labels: ["marketing", "distribution"],
          tags: []
        }
      ],
      plugins: [],
      recurrence: [
        {
          id: "weekly-content-plan",
          cron: "0 9 * * 1",
          targetType: "agent",
          targetKey: "content-strategist",
          instruction: "Produce weekly content plan and queue production issues."
        },
        {
          id: "weekly-performance-review",
          cron: "0 16 * * 5",
          targetType: "agent",
          targetKey: "head-of-marketing",
          instruction: "Review weekly distribution performance and update next week priorities."
        }
      ]
    }
  }
];

export type BuiltinStarterTemplateDefinition = (typeof builtinTemplateDefinitions)[number];

/** Built-in DB templates offered as “Start with” options when creating a company (full org, same as Templates UI). */
export function listBuiltinStarterTemplates(): Array<{ id: string; label: string; description: string }> {
  return builtinTemplateDefinitions.map((d) => ({
    id: d.slug,
    label: d.name,
    description: d.description
  }));
}

export function getBuiltinStarterTemplateBySlug(slug: string): BuiltinStarterTemplateDefinition | null {
  return builtinTemplateDefinitions.find((d) => d.slug === slug) ?? null;
}

export async function ensureBuiltinTemplatesRegistered(db: BopoDb, companyIds: string[] = []) {
  for (const companyId of companyIds) {
    await ensureCompanyBuiltinTemplateDefaults(db, companyId);
  }
}

export async function ensureCompanyBuiltinTemplateDefaults(db: BopoDb, companyId: string) {
  for (const definition of builtinTemplateDefinitions) {
    const variables = definition.variables.map((entry) => TemplateVariableSchema.parse(entry));
    const manifest = TemplateManifestSchema.parse(definition.manifest);
    let template = await getTemplateBySlug(db, companyId, definition.slug);
    if (!template) {
      template = await createTemplate(db, {
        companyId,
        slug: definition.slug,
        name: definition.name,
        description: definition.description,
        currentVersion: definition.version,
        status: definition.status,
        visibility: definition.visibility,
        variablesJson: JSON.stringify(variables)
      });
    }
    if (!template) {
      continue;
    }
    const version = await getTemplateVersionByVersion(db, {
      companyId,
      templateId: template.id,
      version: definition.version
    });
    if (!version) {
      await createTemplateVersion(db, {
        companyId,
        templateId: template.id,
        version: definition.version,
        manifestJson: JSON.stringify(manifest)
      });
      await updateTemplate(db, {
        companyId,
        id: template.id,
        name: definition.name,
        description: definition.description,
        variablesJson: JSON.stringify(variables),
        currentVersion: definition.version
      });
    }
  }
}
