CREATE TABLE "work_loops" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
	"project_id" text NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
	"parent_issue_id" text REFERENCES "issues"("id") ON DELETE SET NULL,
	"goal_ids_json" text DEFAULT '[]' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assignee_agent_id" text NOT NULL REFERENCES "agents"("id") ON DELETE RESTRICT,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"concurrency_policy" text DEFAULT 'coalesce_if_active' NOT NULL,
	"catch_up_policy" text DEFAULT 'skip_missed' NOT NULL,
	"last_triggered_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_loop_triggers" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
	"work_loop_id" text NOT NULL REFERENCES "work_loops"("id") ON DELETE CASCADE,
	"kind" text DEFAULT 'schedule' NOT NULL,
	"label" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"cron_expression" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"next_run_at" timestamp,
	"last_fired_at" timestamp,
	"last_result" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_loop_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
	"work_loop_id" text NOT NULL REFERENCES "work_loops"("id") ON DELETE CASCADE,
	"trigger_id" text REFERENCES "work_loop_triggers"("id") ON DELETE SET NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"triggered_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"idempotency_key" text,
	"payload_json" text DEFAULT '{}' NOT NULL,
	"linked_issue_id" text REFERENCES "issues"("id") ON DELETE SET NULL,
	"coalesced_into_run_id" text REFERENCES "work_loop_runs"("id") ON DELETE SET NULL,
	"failure_reason" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "loop_id" text REFERENCES "work_loops"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "issues" ADD COLUMN "loop_run_id" text REFERENCES "work_loop_runs"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "work_loops_company_status_idx" ON "work_loops" ("company_id","status");
--> statement-breakpoint
CREATE INDEX "work_loop_triggers_company_next_run_idx" ON "work_loop_triggers" ("company_id","next_run_at");
--> statement-breakpoint
CREATE INDEX "work_loop_triggers_work_loop_idx" ON "work_loop_triggers" ("work_loop_id");
--> statement-breakpoint
CREATE INDEX "work_loop_runs_work_loop_created_idx" ON "work_loop_runs" ("work_loop_id","created_at");
--> statement-breakpoint
CREATE INDEX "work_loop_runs_trigger_idempotency_idx" ON "work_loop_runs" ("trigger_id","idempotency_key");
--> statement-breakpoint
CREATE INDEX "issues_loop_id_idx" ON "issues" ("loop_id");
