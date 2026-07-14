"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type FormEvent,
} from "react";
import { contactFormSchema } from "../schemas/contact-form.schema";
import { createLeadAction } from "../server/create-lead-action";
import { setConsentCookie } from "../server/consent-actions";
import { TurnstileWidget } from "@/shared/components/TurnstileWidget";
import type { TipologiaWithUnidades } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactFormProps {
  promocionId: string;
  tipologias: TipologiaWithUnidades[];
}

interface FormState {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  errors?: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ContactForm({ promocionId, tipologias }: ContactFormProps) {
  const [{ status, message, errors }, setState] = useState<FormState>({
    status: "idle",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Scroll feedback into view on state change
  useEffect(() => {
    if (
      (status === "success" || status === "error") &&
      liveRef.current &&
      typeof window !== "undefined"
    ) {
      liveRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [status]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const raw: Record<string, string | boolean | undefined> = {
        name: (formData.get("name") as string) || "",
        email: (formData.get("email") as string) || "",
        phone: (formData.get("phone") as string) || "",
        message: (formData.get("message") as string) || "",
        tipologiaId:
          (formData.get("tipologiaId") as string) || undefined,
        consent: formData.get("consent") === "true",
      };

      // Client-side validation with Zod
      const parsed = contactFormSchema.safeParse(raw);
      if (!parsed.success) {
        setState({
          status: "error",
          errors: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      setState({ status: "loading" });

      const result = await createLeadAction({
        ...parsed.data,
        promocionId,
        turnstileToken: turnstileToken ?? undefined,
      });

      if (result.success) {
        // Set consent cookie for WhatsApp flow
        await setConsentCookie();
        setState({
          status: "success",
          message: result.message,
        });
      } else if (result.errors) {
        setState({
          status: "error",
          errors: result.errors,
        });
      } else {
        setState({
          status: "error",
          message: result.error,
        });
      }
    },
    [promocionId, turnstileToken],
  );

  const isLoading = status === "loading";
  const isSuccess = status === "success";

  if (isSuccess) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-surface border border-border-default bg-bg-surface p-6 text-center md:p-8"
      >
        <div className="mb-4 text-[40px] leading-none">✓</div>
        <p className="font-sans text-base leading-[1.55] text-fg-muted">
          {message}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
    >
      {/* Name */}
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
        >
          Nombre completo
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          defaultValue=""
          className="w-full rounded-control border border-border-default bg-bg-surface px-4 py-3 font-sans text-base leading-[1.5] text-fg-default placeholder:text-fg-subtle/60 focus:border-accent-default focus:ring-2 focus:ring-focus-ring focus:ring-offset-3 focus:outline-none aria-[invalid]:border-status-danger-default"
          aria-invalid={!!errors?.name || undefined}
          aria-describedby={
            errors?.name ? "contact-name-error" : undefined
          }
        />
        {errors?.name && (
          <p
            id="contact-name-error"
            className="mt-1 font-sans text-sm text-status-danger-default"
            role="alert"
          >
            {errors.name[0]}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="contact-email"
          className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
        >
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue=""
          className="w-full rounded-control border border-border-default bg-bg-surface px-4 py-3 font-sans text-base leading-[1.5] text-fg-default placeholder:text-fg-subtle/60 focus:border-accent-default focus:ring-2 focus:ring-focus-ring focus:ring-offset-3 focus:outline-none aria-[invalid]:border-status-danger-default"
          aria-invalid={!!errors?.email || undefined}
          aria-describedby={
            errors?.email ? "contact-email-error" : undefined
          }
        />
        {errors?.email && (
          <p
            id="contact-email-error"
            className="mt-1 font-sans text-sm text-status-danger-default"
            role="alert"
          >
            {errors.email[0]}
          </p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="contact-phone"
          className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
        >
          Teléfono (opcional)
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue=""
          className="w-full rounded-control border border-border-default bg-bg-surface px-4 py-3 font-sans text-base leading-[1.5] text-fg-default placeholder:text-fg-subtle/60 focus:border-accent-default focus:ring-2 focus:ring-focus-ring focus:ring-offset-3 focus:outline-none"
        />
      </div>

      {/* Tipología */}
      {tipologias.length > 0 && (
        <div>
          <label
            htmlFor="contact-tipologia"
            className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
          >
            Tipo de inmueble (opcional)
          </label>
          <select
            id="contact-tipologia"
            name="tipologiaId"
            defaultValue=""
            className="w-full rounded-control border border-border-default bg-bg-surface px-4 py-3 font-sans text-base leading-[1.5] text-fg-default focus:border-accent-default focus:ring-2 focus:ring-focus-ring focus:ring-offset-3 focus:outline-none"
          >
            <option value="">Todos los tipos</option>
            {tipologias.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Message */}
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
        >
          Mensaje
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={4}
          defaultValue=""
          className="w-full resize-y rounded-control border border-border-default bg-bg-surface px-4 py-3 font-sans text-base leading-[1.5] text-fg-default placeholder:text-fg-subtle/60 focus:border-accent-default focus:ring-2 focus:ring-focus-ring focus:ring-offset-3 focus:outline-none aria-[invalid]:border-status-danger-default"
          aria-invalid={!!errors?.message || undefined}
          aria-describedby={
            errors?.message ? "contact-message-error" : undefined
          }
        />
        {errors?.message && (
          <p
            id="contact-message-error"
            className="mt-1 font-sans text-sm text-status-danger-default"
            role="alert"
          >
            {errors.message[0]}
          </p>
        )}
      </div>

      {/* Consent checkbox */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consent"
            value="true"
            defaultChecked={false}
            className="mt-1 h-4 w-4 rounded border-border-default text-accent-default focus:ring-2 focus:ring-focus-ring focus:ring-offset-3 focus:outline-none"
            aria-invalid={!!errors?.consent || undefined}
            aria-describedby={
              errors?.consent ? "contact-consent-error" : undefined
            }
          />
          <span className="font-sans text-sm leading-[1.5] text-fg-muted">
            He leído y acepto la{" "}
            <a
              href="/legal/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-accent-default focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              política de privacidad
            </a>{" "}
            y el tratamiento de mis datos para recibir información
            comercial.
          </span>
        </label>
        {errors?.consent && (
          <p
            id="contact-consent-error"
            className="mt-1 font-sans text-sm text-status-danger-default"
            role="alert"
          >
            {errors.consent[0]}
          </p>
        )}
      </div>

      {/* Turnstile CAPTCHA */}
      <TurnstileWidget onToken={setTurnstileToken} />

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full cursor-pointer rounded-pill bg-[linear-gradient(180deg,#2A211B_0%,#1A1410_100%)] px-[30px] py-4 font-sans text-base font-medium leading-[1.5] tracking-[-0.005em] text-[#FFFCF7] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(26,20,16,0.10),0_8px_24px_rgba(26,20,16,0.20)] transition-all duration-350 ease-[cubic-bezier(.2,.8,.2,1)] hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,var(--accent,#C75D3F)_0%,var(--accent-hover,#A84A2E)_100%)] hover:shadow-[0_0_0_1px_rgba(199,93,63,0.10),0_12px_32px_rgba(199,93,63,0.20)] focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3 focus-visible:rounded-[4px] disabled:cursor-not-allowed disabled:opacity-60"
        aria-busy={isLoading}
      >
        {isLoading ? "Enviando…" : "Solicitar información"}
      </button>

      {/* General error / feedback */}
      {(message || (status === "error" && !errors)) && (
        <div
          ref={liveRef}
          role="status"
          aria-live="polite"
          className={`rounded-control px-4 py-3 text-sm ${
            status === "error"
              ? "border-l-[3px] border-status-danger-default bg-status-danger-subtle text-fg-default"
              : ""
          }`}
        >
          {message}
        </div>
      )}

      {/* Hidden loading region for screen readers */}
      {isLoading && (
        <div aria-live="polite" className="sr-only">
          Enviando solicitud…
        </div>
      )}
    </form>
  );
}
