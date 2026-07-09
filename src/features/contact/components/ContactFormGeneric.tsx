"use client";

import { useActionState, useState } from "react";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import {
  submitContactForm,
} from "@/features/contact/actions/submit-contact.action";
import type { ContactFormResult } from "@/features/contact/actions/submit-contact.schema";

/**
 * ContactFormGeneric — generic contact form (name, email, message).
 *
 * Uses a server action for submission with Zod validation.
 * Shows inline errors, loading state, and success feedback.
 *
 * WCAG: labels associated via htmlFor, aria-invalid on error,
 * aria-live for dynamic feedback.
 */
export function ContactFormGeneric() {
  const [state, formAction, isPending] = useActionState<
    ContactFormResult | null,
    FormData
  >(submitContactForm, null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fieldErrors = state?.fieldErrors ?? {};

  const nameError =
    touched["name"] && fieldErrors["name"]
      ? fieldErrors["name"][0]
      : undefined;
  const emailError =
    touched["email"] && fieldErrors["email"]
      ? fieldErrors["email"][0]
      : undefined;
  const messageError =
    touched["message"] && fieldErrors["message"]
      ? fieldErrors["message"][0]
      : undefined;

  // Success state
  if (state?.success) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-surface border border-status-success-default bg-status-success-subtle p-10 text-center"
      >
        <p className="font-sans text-lg font-medium text-status-success-default">
          Mensaje enviado correctamente
        </p>
        <p className="mt-4 font-sans text-sm leading-relaxed text-fg-muted">
          Gracias por contactar con nosotros. Te responderemos a la mayor
          brevedad posible.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {/* Name */}
      <Input
        id="contact-name"
        name="name"
        label="Nombre completo"
        type="text"
        required
        placeholder="Tu nombre"
        disabled={isPending}
        error={nameError}
        onBlur={() => setTouched((p) => ({ ...p, name: true }))}
      />

      {/* Email */}
      <Input
        id="contact-email"
        name="email"
        label="Correo electrónico"
        type="email"
        required
        placeholder="tu@email.com"
        disabled={isPending}
        error={emailError}
        onBlur={() => setTouched((p) => ({ ...p, email: true }))}
      />

      {/* Message */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="contact-message"
          className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
        >
          Mensaje
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          disabled={isPending}
          placeholder="Cuéntanos en qué podemos ayudarte…"
          aria-invalid={Boolean(messageError)}
          aria-describedby={messageError ? "contact-message-error" : undefined}
          className="rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-3 disabled:cursor-not-allowed disabled:opacity-60"
          onBlur={() => setTouched((p) => ({ ...p, message: true }))}
        />
        {messageError && (
          <p
            id="contact-message-error"
            role="alert"
            aria-live="polite"
            className="font-sans text-sm text-status-danger-default"
          >
            {messageError}
          </p>
        )}
      </div>

      {/* Global error */}
      {state?.error && !state.fieldErrors && (
        <p
          role="alert"
          aria-live="polite"
          className="font-sans text-sm text-status-danger-default"
        >
          {state.error}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        disabled={isPending}
        aria-label="Enviar mensaje"
      >
        {isPending ? "Enviando…" : "Enviar mensaje"}
      </Button>
    </form>
  );
}
