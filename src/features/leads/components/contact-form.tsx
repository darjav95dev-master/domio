"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
import { TurnstileWidget } from "@/shared/components/TurnstileWidget";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONSENT_LEGAL_BASIS = "RGPD consent";
const CONSENT_TEXT_ACCEPTED =
  "He leido y acepto la politica de privacidad y el tratamiento de mis datos personales para la gestion de mi consulta.";

const INPUT_CLASS = [
  "w-full rounded-control border border-border-default bg-bg-surface px-4 py-3",
  "font-sans text-sm text-fg-default",
  "transition-colors duration-standard ease-standard",
  "hover:border-border-strong focus:border-accent-default focus:outline-none",
  "placeholder:text-fg-subtle",
].join(" ");

const LABEL_CLASS =
  "font-sans text-sm font-medium text-fg-default";

const ERROR_CLASS = "font-sans text-xs text-status-danger-default";

// ---------------------------------------------------------------------------
// ContactForm
// ---------------------------------------------------------------------------

/**
 * Formulario de contacto publico con consentimiento RGPD.
 * Envia los datos via server action y muestra feedback de exito/error.
 */
export function ContactForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    formData.set("turnstileToken", turnstileToken ?? "");
    startTransition(async () => {
      try {
        const { createLeadAction } = await import(
          "@/features/leads/actions/leads.actions"
        );
        const result = await createLeadAction(formData);

        if (!result.success) {
          setError(result.error);
          return;
        }

        setSuccess(true);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al enviar el formulario",
        );
      }
    });
  };

  if (success) {
    return (
      <div
        className="rounded-card border border-status-success-default bg-status-success-subtle p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="font-sans text-lg font-medium text-status-success-default">
          Mensaje enviado correctamente
        </p>
        <p className="mt-2 font-sans text-sm text-fg-muted">
          Gracias por contactar con nosotros. Te responderemos a la mayor
          brevedad posible.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-6" noValidate>
      {/* ── Hidden fields ──────────────────────────────────────── */}
      <input
        type="hidden"
        name="promocionId"
        value="00000000-0000-0000-0000-000000000000"
      />
      <input type="hidden" name="source" value="commercial" />
      <input type="hidden" name="channel" value="FORM" />

      {/* ── Name ───────────────────────────────────────────────── */}
      <div>
        <label htmlFor="contact-name" className={LABEL_CLASS}>
          Nombre completo
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          aria-required="true"
          placeholder="Tu nombre"
          className={cn(INPUT_CLASS, "mt-1")}
        />
      </div>

      {/* ── Email ──────────────────────────────────────────────── */}
      <div>
        <label htmlFor="contact-email" className={LABEL_CLASS}>
          Correo electrónico
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          aria-required="true"
          placeholder="tu@email.com"
          className={cn(INPUT_CLASS, "mt-1")}
        />
      </div>

      {/* ── Phone ──────────────────────────────────────────────── */}
      <div>
        <label htmlFor="contact-phone" className={LABEL_CLASS}>
          Teléfono <span className="text-fg-subtle">(opcional)</span>
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          placeholder="+34 600 123 456"
          className={cn(INPUT_CLASS, "mt-1")}
        />
      </div>

      {/* ── Message ────────────────────────────────────────────── */}
      <div>
        <label htmlFor="contact-message" className={LABEL_CLASS}>
          Mensaje <span className="text-fg-subtle">(opcional)</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          placeholder="Cuentanos en que podemos ayudarte..."
          className={cn(INPUT_CLASS, "mt-1 resize-y")}
        />
      </div>

      {/* ── RGPD Consent ───────────────────────────────────────── */}
      <div className="rounded-card border border-border-default bg-bg-canvas p-4">
        <div className="flex items-start gap-3">
          <input
            id="consent-checkbox"
            name="consentLegalBasis"
            type="checkbox"
            value={CONSENT_LEGAL_BASIS}
            required
            aria-required="true"
            aria-describedby="consent-text"
            className="mt-1 h-4 w-4 shrink-0 accent-accent-default"
          />
          <div>
            <label htmlFor="consent-checkbox" className="font-sans text-sm text-fg-default">
              Acepto la política de privacidad
            </label>
            <input
              type="hidden"
              name="consentTextAccepted"
              value={CONSENT_TEXT_ACCEPTED}
            />
            <p
              id="consent-text"
              className="mt-1 font-sans text-xs text-fg-muted"
            >
              {CONSENT_TEXT_ACCEPTED}
            </p>
          </div>
        </div>
      </div>

      {/* ── Turnstile CAPTCHA ──────────────────────────────────── */}
      <TurnstileWidget onToken={setTurnstileToken} />

      {/* ── Submit ─────────────────────────────────────────────── */}
      <Button
        type="submit"
        variant="primary"
        disabled={isPending}
        aria-label="Enviar mensaje"
      >
        {isPending ? "Enviando…" : "Enviar mensaje"}
      </Button>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className={ERROR_CLASS}
        >
          {error}
        </p>
      )}
    </form>
  );
}
