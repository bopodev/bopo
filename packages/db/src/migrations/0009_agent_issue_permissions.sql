ALTER TABLE "agents" ADD COLUMN "can_assign_agents" boolean DEFAULT true NOT NULL;
ALTER TABLE "agents" ADD COLUMN "can_create_issues" boolean DEFAULT true NOT NULL;
