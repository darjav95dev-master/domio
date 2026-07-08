import { Resend } from "resend";
import {
  ConfigurationError,
  EmailProviderError,
} from "@/infrastructure/email/types";
import type {
  ResendClient,
  SendInput,
  SendResult,
} from "@/infrastructure/email/types";

const DEFAULT_FROM = "noreply@domio.com";

export class ResendClientImpl implements ResendClient {
  private readonly client: Resend;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.RESEND_API_KEY;

    if (!key || key.trim().length === 0) {
      throw new ConfigurationError(
        "RESEND_API_KEY is not configured. Set the RESEND_API_KEY environment variable.",
      );
    }

    this.client = new Resend(key);
  }

  async send(input: SendInput): Promise<SendResult> {
    try {
      const response = await this.client.emails.send({
        from: input.from ?? DEFAULT_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      if (response.error) {
        throw new EmailProviderError(
          response.error.message,
        );
      }

      return { id: response.data.id };
    } catch (error) {
      if (error instanceof EmailProviderError) {
        throw error;
      }

      throw new EmailProviderError(
        error instanceof Error ? error.message : "Unknown email provider error",
        error,
      );
    }
  }
}
