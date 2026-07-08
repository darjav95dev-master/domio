"use client";

import {
  type FormEvent,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { X, Copy, Check, Warning } from "@phosphor-icons/react";
import { createApiKeyAction } from "@/features/api-keys/actions/api-keys.actions";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import { ICON_SIZES } from "@/shared/constants/iconography";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateApiKeyDialog({
  open,
  onClose,
  onCreated,
}: CreateApiKeyDialogProps) {
  // ── Form state ─────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState("60");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ plainKey: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // ── Focus management ───────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Reset state on open/close ──────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      setName("");
      setRateLimit("60");
      setErrors({});
      setSubmitError(null);
      setResult(null);
      setCopied(false);
      setSubmitting(false);
    }
  }, [open]);

  // ── Validation ─────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }

    const rateNum = Number(rateLimit);
    if (!rateLimit.trim() || Number.isNaN(rateNum) || rateNum < 1) {
      newErrors.rateLimit = "Debe ser un número positivo";
    } else if (rateNum > 10000) {
      newErrors.rateLimit = "Máximo 10000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    setSubmitting(true);

    const result = await createApiKeyAction(name.trim(), Number(rateLimit));

    setSubmitting(false);

    if (result.success) {
      setResult({ plainKey: result.data.plainKey });
      onCreated();
    } else {
      setSubmitError(result.error);
    }
  }

  // ── Copy to clipboard ──────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    if (!result?.plainKey) return;
    try {
      await navigator.clipboard.writeText(result.plainKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback: select the text
      const el = document.querySelector<HTMLElement>("#api-key-display");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [result]);

  // ── Keyboard: close on Escape ──────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !result) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, result, onClose]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-overlay-max flex items-center justify-center bg-black/40"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Nueva API key"
        className="w-full max-w-md rounded-surface bg-bg-surface p-6 shadow-lg"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium text-fg-default">
            {result ? "API key creada" : "Nueva API key"}
          </h2>
          {!result && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md p-1 text-fg-subtle transition-colors hover:bg-accent-subtle hover:text-accent-default focus-visible:outline-offset-[-2px]"
            >
              <X size={ICON_SIZES.inline} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* ── Result state ──────────────────────────────────────────────── */}
        {result ? (
          <div role="alert" aria-live="polite">
            <p className="mb-4 font-sans text-sm text-fg-muted">
              Copia esta clave ahora. Por seguridad, no podrás volver a verla.
            </p>

            {/* Key display */}
            <div
              id="api-key-display"
              className="mb-4 rounded-control border border-border-default bg-bg-surface-sunken px-4 py-3 font-mono text-sm text-fg-default break-all select-all"
            >
              {result.plainKey}
            </div>

            {/* Copy button */}
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check size={ICON_SIZES.inline} aria-hidden="true" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={ICON_SIZES.inline} aria-hidden="true" />
                    Copiar clave
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Cerrar
              </Button>
            </div>

            {/* Warning */}
            <div className="mt-4 flex items-start gap-2 rounded-md border border-status-warning-default/30 bg-status-warning-subtle px-3 py-2">
              <Warning
                size={ICON_SIZES.inline}
                className="mt-0.5 shrink-0 text-status-warning-default"
                aria-hidden="true"
              />
              <p className="font-sans text-xs text-status-warning-default">
                No podrás volver a ver esta clave. Si la pierdes, tendrás que
                crear una nueva.
              </p>
            </div>
          </div>
        ) : (
          /* ── Form ─────────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              <Input
                ref={firstFieldRef}
                id="api-key-name"
                label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                placeholder="Ej: Producción"
              />

              {/* Rate limit */}
              <Input
                id="api-key-rate-limit"
                label="Rate limit"
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                error={errors.rateLimit}
                helpText="Peticiones por minuto (máx. 10000)"
              />

              {/* Submit error */}
              {submitError && (
                <p
                  role="alert"
                  aria-live="polite"
                  className="font-sans text-sm text-status-danger-default"
                >
                  {submitError}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                >
                  {submitting ? "Creando..." : "Crear API key"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
