CREATE TABLE "issue_goals" (
  "issue_id" text NOT NULL REFERENCES "issues"("id") ON DELETE CASCADE,
  "goal_id" text NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY ("issue_id", "goal_id")
);

INSERT INTO "issue_goals" ("issue_id", "goal_id", "company_id")
SELECT "id", "goal_id", "company_id" FROM "issues" WHERE "goal_id" IS NOT NULL;

ALTER TABLE "issues" DROP COLUMN "goal_id";
