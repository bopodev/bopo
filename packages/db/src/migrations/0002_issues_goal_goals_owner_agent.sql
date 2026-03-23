ALTER TABLE "goals" ADD COLUMN "owner_agent_id" text REFERENCES "agents"("id") ON DELETE SET NULL;
ALTER TABLE "issues" ADD COLUMN "goal_id" text REFERENCES "goals"("id") ON DELETE SET NULL;
