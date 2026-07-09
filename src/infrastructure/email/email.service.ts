import { z } from "zod";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/infrastructure/db/schema";
import { EmailRepository } from "@/infrastructure/email/email.repository";
import {
  ValidationError,
  TemplateNotFoundError,
} from "@/infrastructure/email/types";
import { emailTemplatePayloadSchemas } from "@/shared/constants/email-templates";
import type { EmailTemplateName } from "@/shared/constants/email-templates";

// ─── Types ────────────────────────────────────────────────────────────

export type DatabaseClient = NodePgDatabase<typeof schema>;

export interface EnqueueInput {
  toEmail: string;
  template: string;
  payload: Record<string, unknown>;
}

// ─── Service ──────────────────────────────────────────────────────────

export class EmailService {
  constructor(private readonly repository: EmailRepository) {}

  /**
   * Enqueue an email notification for asynchronous delivery.
   *
   * 1. Validates email format with zod
   * 2. Validates template exists in the registry
   * 3. Validates payload against the template's zod schema
   * 4. Inserts a PENDING row in email_queue
   *
   * Optionally accepts a transaction handle (`tx`) for integration
   * into an existing database transaction.
   */
  async enqueue(
    input: EnqueueInput,
    tx?: DatabaseClient,
  ): Promise<void> {
    // 1. Validate email
    const emailResult = z.string().email().safeParse(input.toEmail);
    if (!emailResult.success) {
      throw new ValidationError("Invalid email format", "toEmail");
    }

    // 2. Validate template exists in registry
    const payloadSchema = emailTemplatePayloadSchemas[input.template as EmailTemplateName];
    if (!payloadSchema) {
      throw new TemplateNotFoundError(
        `Unknown template: ${input.template}`,
        input.template,
      );
    }

    // 3. Validate payload against template schema
    const payloadResult = payloadSchema.safeParse(input.payload);
    if (!payloadResult.success) {
      const issue = payloadResult.error.issues[0];
      const field = issue?.path?.[0] !== undefined ? String(issue.path[0]) : "payload";
      const message = issue?.message ?? "Invalid payload";
      throw new ValidationError(`Invalid payload: ${message}`, field);
    }

    // 4. Insert into email_queue
    await this.repository.insert(
      {
        toEmail: input.toEmail,
        template: input.template,
        payload: payloadResult.data as Record<string, unknown>,
        status: "PENDING",
        attempts: 0,
        nextAttemptAt: new Date(),
      },
      tx,
    );
  }
}
