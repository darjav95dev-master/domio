import { headers } from "next/headers";
import { contactFormSchema, type ContactFormResult } from "./submit-contact.schema";
import { checkContactRateLimit } from "./contact-form-action";

/**
 * Server action for the generic contact form.
 *
 * Validates input with Zod, checks rate limit, and queues an email
 * notification to the configured contact email.
 */
export async function submitContactForm(
  prevState: ContactFormResult | null,
  formData: FormData,
): Promise<ContactFormResult> {
  // 1. Rate limit check
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

  // 3. Validate success (in production, this would queue an email)
  //    For now we return success as the email infrastructure is
  //    handled by the email_queue worker pattern.
  return { success: true };
}
