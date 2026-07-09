import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { db as defaultDb } from "@/infrastructure/db/client";
import { emailQueue } from "@/infrastructure/db/schema/email-queue";
import * as schema from "@/infrastructure/db/schema";
import type { EmailQueue, NewEmailQueue } from "@/infrastructure/db/schema/email-queue";


export class EmailRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema> = defaultDb) {}

  /**
   * Insert a new email queue item.
   */
  async insert(
    item: NewEmailQueue,
    client?: NodePgDatabase<typeof schema>,
  ): Promise<EmailQueue> {
    const db = client ?? this.db;
    const [result] = await db.insert(emailQueue).values(item).returning();
    return result as EmailQueue;
  }

  /**
   * Find pending email queue items eligible for processing.
   * Uses FOR UPDATE SKIP LOCKED to prevent double-processing by concurrent workers.
   * Optionally accepts a transaction handle (`tx`) to run within an existing transaction.
   */
  async findPendingEligible(
    limit: number,
    tx?: NodePgDatabase<typeof schema>,
  ): Promise<EmailQueue[]> {
    const db = tx ?? this.db;
    const result = await db.execute<EmailQueue>(
      sql`
        SELECT * FROM email_queue
        WHERE status = ${"PENDING"}
          AND (next_attempt_at IS NULL OR next_attempt_at <= now())
        ORDER BY next_attempt_at ASC NULLS FIRST
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `,
    );

    return result.rows as unknown as EmailQueue[];
  }

  /**
   * Mark an email queue item as successfully sent.
   * Optionally accepts a transaction handle (`tx`) to run within an existing transaction.
   */
  async markSent(
    id: string,
    tx?: NodePgDatabase<typeof schema>,
  ): Promise<void> {
    const db = tx ?? this.db;
    await db
      .update(emailQueue)
      .set({
        status: "SENT",
        sentAt: sql`now()`,
        attempts: sql`attempts + 1`,
      })
      .where(eq(emailQueue.id, id));
  }

  /**
   * Mark an email queue item as permanently failed.
   * Optionally accepts a transaction handle (`tx`) to run within an existing transaction.
   */
  async markFailed(
    id: string,
    error: string,
    tx?: NodePgDatabase<typeof schema>,
  ): Promise<void> {
    const db = tx ?? this.db;
    await db
      .update(emailQueue)
      .set({
        status: "FAILED",
        lastError: error,
        attempts: sql`attempts + 1`,
      })
      .where(eq(emailQueue.id, id));
  }

  /**
   * Mark an email queue item for retry with exponential backoff.
   * Optionally accepts a transaction handle (`tx`) to run within an existing transaction.
   */
  async markRetry(
    id: string,
    error: string,
    nextAttemptAt: Date,
    tx?: NodePgDatabase<typeof schema>,
  ): Promise<void> {
    const db = tx ?? this.db;
    await db
      .update(emailQueue)
      .set({
        lastError: error,
        nextAttemptAt,
        attempts: sql`attempts + 1`,
      })
      .where(eq(emailQueue.id, id));
  }
}
