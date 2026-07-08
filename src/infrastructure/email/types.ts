import type { z } from "zod";

// ─── Template types ─────────────────────────────────────────────────
export interface EmailTemplateContent {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplate<TPayload = Record<string, unknown>> {
  name: string;
  payloadSchema: z.ZodType<TPayload>;
  render(payload: TPayload): EmailTemplateContent;
}

// ─── Resend client contract ─────────────────────────────────────────
export interface SendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SendResult {
  id: string;
}

export interface ResendClient {
  send(input: SendInput): Promise<SendResult>;
}

// ─── Worker result ───────────────────────────────────────────────────
export interface WorkerResult {
  processed: number;
  sent: number;
  failed: number;
  retried: number;
}

// ─── Error classes ───────────────────────────────────────────────────
export class EmailProviderError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message);
    this.name = "EmailProviderError";
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class TemplateNotFoundError extends Error {
  constructor(message: string, public readonly templateName?: string) {
    super(message);
    this.name = "TemplateNotFoundError";
  }
}
