ALTER TABLE "cost_ledger" ADD COLUMN "cost_category" text;
--> statement-breakpoint
ALTER TABLE "cost_ledger" ADD COLUMN "assistant_thread_id" text REFERENCES "company_assistant_threads"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "cost_ledger" ADD COLUMN "assistant_message_id" text REFERENCES "company_assistant_messages"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX "idx_cost_ledger_company_category_created" ON "cost_ledger" ("company_id", "cost_category", "created_at");
