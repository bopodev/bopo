import { and, asc, count, desc, eq, gte, lt } from "drizzle-orm";
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
