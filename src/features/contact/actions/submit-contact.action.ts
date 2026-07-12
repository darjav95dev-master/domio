"use server";

import { headers } from "next/headers";
import { contactFormSchema, type ContactFormResult } from "./submit-contact.schema";
import { checkContactRateLimit } from "./contact-form-action";
import { getContactPageData } from "@/features/contact/server/get-contact-data";
import { verifyTurnstileToken } from "@/shared/utils/turnstile";
import { EmailService } from "@/infrastructure/email/email.service";
import { EmailRepository } from "@/infrastructure/email/email.repository";
import { EMAIL_TEMPLATE_NAMES } from "@/shared/constants/email-templates";

/**
 * Server action for the generic contact form.
 *
 * Validates input with Zod, checks rate limit, fetches the configured
 * contact email, and enqueues a notification via email_queue.
 * Following architecture.md §11.3: the notification is async and
 * resilient — a Resend failure never blocks the form submission.
 */
export async function submitContactForm(
  prevState: ContactFormResult | null,
  formData: FormData,
): Promise<ContactFormResult> {
  // 1. Verify Turnstile CAPTCHA
  const turnstileToken = formData.get("turnstileToken") as string | null;
  const turnstileResult = await verifyTurnstileToken(turnstileToken);
  if (!turnstileResult.success) {
    return {
      success: false,
      error: turnstileResult.error ?? "Error de verificación de seguridad.",
    };
  }

  // 2. Rate limit check
  const rateLimit = await checkContactRateLimit(await headers());
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: rateLimit.error ?? "Demasiados intentos. Inténtalo de nuevo más tarde.",
    };
  }

  // 2. Parse and validate
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    message: formData.get("message") as string,
  };

  const parsed = contactFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Corrige los campos señalados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 3. Enqueue email notification to the configured contact address
  const { contactConfig } = await getContactPageData();
  const contactEmail = contactConfig?.email;

  if (contactEmail) {
    const emailService = new EmailService(new EmailRepository());
    await emailService.enqueue({
      toEmail: contactEmail,
      template: EMAIL_TEMPLATE_NAMES.CONTACT_FORM_NOTIFICATION,
      payload: parsed.data satisfies Record<string, unknown>,
    });
  }

  return { success: true };
}
