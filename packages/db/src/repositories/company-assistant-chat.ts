import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { BopoDb } from "../client";
import { companyAssistantMessages, companyAssistantThreads } from "../schema";

export type AssistantMessageRole = "user" | "assistant" | "system";

export async function getOrCreateAssistantThread(db: BopoDb, companyId: string) {
  const [existing] = await db
    .select()
    .from(companyAssistantThreads)
    .where(eq(companyAssistantThreads.companyId, companyId))
    .orderBy(desc(companyAssistantThreads.updatedAt))
    .limit(1);
  if (existing) {
    return existing;
  }
  return createAssistantThreadRow(db, companyId);
}

async function createAssistantThreadRow(db: BopoDb, companyId: string) {
  const id = nanoid(16);
  const now = new Date();
  await db.insert(companyAssistantThreads).values({
    id,
    companyId,
    createdAt: now,
    updatedAt: now
  });
  const [row] = await db.select().from(companyAssistantThreads).where(eq(companyAssistantThreads.id, id)).limit(1);
  return row!;
}

/** New empty thread; previous threads and messages remain in the database. */
export async function createAssistantThread(db: BopoDb, companyId: string) {
  return createAssistantThreadRow(db, companyId);
}

export async function getAssistantThreadById(db: BopoDb, companyId: string, threadId: string) {
  const [row] = await db
    .select()
    .from(companyAssistantThreads)
    .where(and(eq(companyAssistantThreads.id, threadId), eq(companyAssistantThreads.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

/** Removes the thread and its messages (cascade). Returns whether a row was deleted. */
export async function deleteAssistantThread(db: BopoDb, companyId: string, threadId: string): Promise<boolean> {
  const [row] = await db
    .delete(companyAssistantThreads)
    .where(and(eq(companyAssistantThreads.id, threadId), eq(companyAssistantThreads.companyId, companyId)))
    .returning({ id: companyAssistantThreads.id });
  return Boolean(row);
}

export type AssistantThreadSummary = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  previewBody: string | null;
};

/** Threads for the company, newest activity first, with last message body as preview (if any). */
export async function listAssistantThreadsForCompany(
  db: BopoDb,
  companyId: string,
  limit = 50
): Promise<AssistantThreadSummary[]> {
  const capped = Math.min(Math.max(1, limit), 100);
  const result = await db.execute(sql`
    SELECT t.id, t.created_at, t.updated_at, lm.body AS preview_body
    FROM company_assistant_threads t
    LEFT JOIN LATERAL (
      SELECT body FROM company_assistant_messages
      WHERE thread_id = t.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    WHERE t.company_id = ${companyId}
    ORDER BY t.updated_at DESC
    LIMIT ${capped}
  `);
  const rows = result as unknown as Array<{
    id: string;
    created_at: Date | string;
    updated_at: Date | string;
    preview_body: string | null;
  }>;
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
    updatedAt: r.updated_at instanceof Date ? r.updated_at : new Date(String(r.updated_at)),
    previewBody: r.preview_body
  }));
}

export async function touchAssistantThread(db: BopoDb, threadId: string) {
  await db
    .update(companyAssistantThreads)
    .set({ updatedAt: new Date() })
    .where(eq(companyAssistantThreads.id, threadId));
}

export async function insertAssistantMessage(
  db: BopoDb,
  input: {
    threadId: string;
    companyId: string;
    role: AssistantMessageRole;
    body: string;
    metadataJson?: string | null;
  }
) {
  const id = nanoid(16);
  await db.insert(companyAssistantMessages).values({
    id,
    threadId: input.threadId,
    companyId: input.companyId,
    role: input.role,
    body: input.body,
    metadataJson: input.metadataJson ?? null
  });
  await touchAssistantThread(db, input.threadId);
  const [row] = await db.select().from(companyAssistantMessages).where(eq(companyAssistantMessages.id, id)).limit(1);
  return row!;
}

export async function listAssistantMessages(db: BopoDb, threadId: string, limit = 100) {
  const capped = Math.min(Math.max(1, limit), 200);
  return db
    .select()
    .from(companyAssistantMessages)
    .where(eq(companyAssistantMessages.threadId, threadId))
    .orderBy(asc(companyAssistantMessages.createdAt))
    .limit(capped);
}

/** Threads with at least one message in `[startInclusive, endExclusive)` on `created_at`. */
export async function listAssistantChatThreadStatsInCreatedAtRange(
  db: BopoDb,
  companyId: string,
  startInclusive: Date,
  endExclusive: Date
): Promise<Array<{ threadId: string; messageCount: number }>> {
  const rows = await db
    .select({
      threadId: companyAssistantMessages.threadId,
      messageCount: count()
    })
    .from(companyAssistantMessages)
    .where(
      and(
        eq(companyAssistantMessages.companyId, companyId),
        gte(companyAssistantMessages.createdAt, startInclusive),
        lt(companyAssistantMessages.createdAt, endExclusive)
      )
    )
    .groupBy(companyAssistantMessages.threadId);
  return rows.map((r) => ({
    threadId: r.threadId,
    messageCount: Number(r.messageCount) || 0
  }));
}

/** Threads with at least one message in the UTC calendar month (for callers without local bounds). */
export async function listAssistantChatThreadStatsInUtcMonth(
  db: BopoDb,
  companyId: string,
  year: number,
  month1Based: number
): Promise<Array<{ threadId: string; messageCount: number }>> {
  const startUtc = new Date(Date.UTC(year, month1Based - 1, 1, 0, 0, 0, 0));
  const endExclusiveUtc = new Date(Date.UTC(year, month1Based, 1, 0, 0, 0, 0));
  return listAssistantChatThreadStatsInCreatedAtRange(db, companyId, startUtc, endExclusiveUtc);
}
