CREATE TABLE "companies" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "mission" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'planned' NOT NULL,
  "planned_start_at" timestamp,
  "monthly_budget_usd" numeric(12, 4) DEFAULT 100 NOT NULL,
  "used_budget_usd" numeric(12, 4) DEFAULT 0 NOT NULL,
  "budget_window_start_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "execution_workspace_policy" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_workspaces" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "cwd" text,
  "repo_url" text,
  "repo_ref" text,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" text REFERENCES "projects"("id") ON DELETE SET NULL,
  "parent_goal_id" text,
  "level" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "manager_agent_id" text,
  "role" text NOT NULL,
  "role_key" text,
  "title" text,
  "name" text NOT NULL,
  "provider_type" text NOT NULL,
  "status" text DEFAULT 'idle' NOT NULL,
  "heartbeat_cron" text NOT NULL,
  "monthly_budget_usd" numeric(12, 4) DEFAULT 0 NOT NULL,
  "used_budget_usd" numeric(12, 4) DEFAULT 0 NOT NULL,
  "token_usage" integer DEFAULT 0 NOT NULL,
  "can_hire_agents" boolean DEFAULT false NOT NULL,
  "avatar_seed" text DEFAULT '' NOT NULL,
  "runtime_command" text,
  "runtime_args_json" text DEFAULT '[]' NOT NULL,
  "runtime_cwd" text,
  "runtime_env_json" text DEFAULT '{}' NOT NULL,
  "runtime_model" text,
  "runtime_thinking_effort" text DEFAULT 'auto' NOT NULL,
  "bootstrap_prompt" text,
  "runtime_timeout_sec" integer DEFAULT 0 NOT NULL,
  "interrupt_grace_sec" integer DEFAULT 15 NOT NULL,
  "run_policy_json" text DEFAULT '{}' NOT NULL,
  "state_blob" text DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "parent_issue_id" text,
  "title" text NOT NULL,
  "body" text,
  "status" text DEFAULT 'todo' NOT NULL,
  "priority" text DEFAULT 'none' NOT NULL,
  "assignee_agent_id" text,
  "labels_json" text DEFAULT '[]' NOT NULL,
  "tags_json" text DEFAULT '[]' NOT NULL,
  "is_claimed" boolean DEFAULT false NOT NULL,
  "claimed_by_heartbeat_run_id" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_comments" (
  "id" text PRIMARY KEY NOT NULL,
  "issue_id" text NOT NULL REFERENCES "issues"("id") ON DELETE CASCADE,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "author_type" text NOT NULL,
  "author_id" text,
  "recipients_json" text DEFAULT '[]' NOT NULL,
  "run_id" text,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_attachments" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "issue_id" text NOT NULL REFERENCES "issues"("id") ON DELETE CASCADE,
  "project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "mime_type" text,
  "file_size_bytes" integer NOT NULL,
  "relative_path" text NOT NULL,
  "uploaded_by_actor_type" text DEFAULT 'human' NOT NULL,
  "uploaded_by_actor_id" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "issue_id" text REFERENCES "issues"("id") ON DELETE SET NULL,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "event_type" text NOT NULL,
  "payload_json" text DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heartbeat_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "agent_id" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'started' NOT NULL,
  "started_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "finished_at" timestamp,
  "message" text
);
--> statement-breakpoint
CREATE TABLE "heartbeat_run_queue" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "agent_id" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "job_type" text NOT NULL,
  "payload_json" text DEFAULT '{}' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "idempotency_key" text,
  "available_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 10 NOT NULL,
  "last_error" text,
  "started_at" timestamp,
  "finished_at" timestamp,
  "heartbeat_run_id" text REFERENCES "heartbeat_runs"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heartbeat_run_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "run_id" text NOT NULL REFERENCES "heartbeat_runs"("id") ON DELETE CASCADE,
  "sequence" integer NOT NULL,
  "kind" text NOT NULL,
  "label" text,
  "text" text,
  "payload_json" text,
  "signal_level" text,
  "group_key" text,
  "source" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "requested_by_agent_id" text,
  "action" text NOT NULL,
  "payload_json" text DEFAULT '{}' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "approval_inbox_states" (
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "actor_id" text NOT NULL,
  "approval_id" text NOT NULL REFERENCES "approval_requests"("id") ON DELETE CASCADE,
  "seen_at" timestamp,
  "dismissed_at" timestamp,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY ("company_id", "actor_id", "approval_id")
);
--> statement-breakpoint
CREATE TABLE "attention_inbox_states" (
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "actor_id" text NOT NULL,
  "item_key" text NOT NULL,
  "seen_at" timestamp,
  "acknowledged_at" timestamp,
  "dismissed_at" timestamp,
  "resolved_at" timestamp,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY ("company_id", "actor_id", "item_key")
);
--> statement-breakpoint
CREATE TABLE "cost_ledger" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "run_id" text REFERENCES "heartbeat_runs"("id") ON DELETE SET NULL,
  "project_id" text REFERENCES "projects"("id") ON DELETE SET NULL,
  "issue_id" text REFERENCES "issues"("id") ON DELETE SET NULL,
  "agent_id" text REFERENCES "agents"("id") ON DELETE SET NULL,
  "provider_type" text NOT NULL,
  "runtime_model_id" text,
  "pricing_provider_type" text,
  "pricing_model_id" text,
  "pricing_source" text,
  "token_input" integer DEFAULT 0 NOT NULL,
  "token_output" integer DEFAULT 0 NOT NULL,
  "usd_cost" numeric(12, 6) DEFAULT 0 NOT NULL,
  "usd_cost_status" text,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP TABLE IF EXISTS "model_pricing";
--> statement-breakpoint
CREATE TABLE "audit_events" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "actor_type" text NOT NULL,
  "actor_id" text,
  "event_type" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "correlation_id" text,
  "payload_json" text DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugins" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "version" text NOT NULL,
  "kind" text NOT NULL,
  "runtime_type" text NOT NULL,
  "runtime_entrypoint" text NOT NULL,
  "hooks_json" text DEFAULT '[]' NOT NULL,
  "capabilities_json" text DEFAULT '[]' NOT NULL,
  "manifest_json" text DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "current_version" text DEFAULT '1.0.0' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "visibility" text DEFAULT 'company' NOT NULL,
  "variables_json" text DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_versions" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "template_id" text NOT NULL REFERENCES "templates"("id") ON DELETE CASCADE,
  "version" text NOT NULL,
  "manifest_json" text DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_installs" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "template_id" text REFERENCES "templates"("id") ON DELETE SET NULL,
  "template_version_id" text REFERENCES "template_versions"("id") ON DELETE SET NULL,
  "status" text DEFAULT 'applied' NOT NULL,
  "summary_json" text DEFAULT '{}' NOT NULL,
  "variables_json" text DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_configs" (
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "plugin_id" text NOT NULL REFERENCES "plugins"("id") ON DELETE CASCADE,
  "enabled" boolean DEFAULT false NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "config_json" text DEFAULT '{}' NOT NULL,
  "granted_capabilities_json" text DEFAULT '[]' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY ("company_id", "plugin_id")
);
--> statement-breakpoint
CREATE TABLE "plugin_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "run_id" text REFERENCES "heartbeat_runs"("id") ON DELETE CASCADE,
  "plugin_id" text NOT NULL REFERENCES "plugins"("id") ON DELETE CASCADE,
  "hook" text NOT NULL,
  "status" text NOT NULL,
  "duration_ms" integer DEFAULT 0 NOT NULL,
  "error" text,
  "diagnostics_json" text DEFAULT '{}' NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_issue_labels" (
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "issue_id" text NOT NULL REFERENCES "issues"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  PRIMARY KEY ("company_id", "issue_id", "label")
);
--> statement-breakpoint
CREATE INDEX "idx_project_workspaces_company_project"
  ON "project_workspaces" ("company_id", "project_id", "is_primary", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_issues_company_status"
  ON "issues" ("company_id", "status", "updated_at");
--> statement-breakpoint
CREATE INDEX "idx_issues_assignee_claim_priority"
  ON "issues" ("company_id", "assignee_agent_id", "is_claimed", "status", "priority", "updated_at");
--> statement-breakpoint
CREATE INDEX "idx_issue_attachments_company_issue"
  ON "issue_attachments" ("company_id", "issue_id", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_issue_attachments_company_project"
  ON "issue_attachments" ("company_id", "project_id", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_audit_events_company_created"
  ON "audit_events" ("company_id", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_cost_ledger_company_created"
  ON "cost_ledger" ("company_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_heartbeat_runs_single_started"
  ON "heartbeat_runs" ("company_id", "agent_id")
  WHERE "status" = 'started';
--> statement-breakpoint
CREATE INDEX "idx_heartbeat_run_queue_status_available_priority"
  ON "heartbeat_run_queue" ("company_id", "status", "available_at", "priority", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_heartbeat_run_queue_agent_status"
  ON "heartbeat_run_queue" ("company_id", "agent_id", "status", "available_at", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_heartbeat_run_queue_idempotency"
  ON "heartbeat_run_queue" ("company_id", "agent_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL AND btrim("idempotency_key") <> '';
--> statement-breakpoint
CREATE INDEX "idx_heartbeat_run_messages_company_run_sequence"
  ON "heartbeat_run_messages" ("company_id", "run_id", "sequence");
--> statement-breakpoint
CREATE INDEX "idx_heartbeat_run_messages_company_created"
  ON "heartbeat_run_messages" ("company_id", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_approval_inbox_states_company_actor_updated"
  ON "approval_inbox_states" ("company_id", "actor_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "idx_attention_inbox_states_company_actor_updated"
  ON "attention_inbox_states" ("company_id", "actor_id", "updated_at");
--> statement-breakpoint
CREATE INDEX "idx_plugin_configs_company_enabled_priority"
  ON "plugin_configs" ("company_id", "enabled", "priority", "plugin_id");
--> statement-breakpoint
CREATE INDEX "idx_plugin_runs_company_created"
  ON "plugin_runs" ("company_id", "created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_templates_company_slug"
  ON "templates" ("company_id", "slug");
--> statement-breakpoint
CREATE INDEX "idx_template_versions_company_template_created"
  ON "template_versions" ("company_id", "template_id", "created_at");
--> statement-breakpoint
CREATE INDEX "idx_template_installs_company_created"
  ON "template_installs" ("company_id", "created_at");
