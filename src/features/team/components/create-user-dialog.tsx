"use client";

import { type FormEvent, useState, useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import { createUserAction } from "@/features/team/actions/team.actions";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import { USER_ROLES, type UserRole } from "@/shared/constants/db-enums";
import { ICON_SIZES } from "@/shared/constants/iconography";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  OPERATOR: "Operador",
  AGENT: "Agente",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateUserDialog({ open, onClose, onCreated }: CreateUserDialogProps) {
  // ── Form state ─────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("AGENT");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // ── Focus management ───────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      // Focus the first field when dialog opens
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Reset state on open/close ──────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setRole("AGENT");
      setErrors({});
      setSubmitError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open]);

  // ── Validation ─────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }
    if (!email.trim()) {
      newErrors.email = "El email es obligatorio";
    } else if (!email.includes("@") || !email.includes(".")) {
      newErrors.email = "Email inválido";
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

    const result = await createUserAction({ name, email, role });

    setSubmitting(false);

    if (result.success) {
      setSuccess(true);
      onCreated();
    } else {
      setSubmitError(result.error);
    }
  }

  // ── Keyboard: close on Escape ──────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !success) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, success, onClose]);

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
        aria-label="Nuevo usuario"
        className="w-full max-w-md rounded-surface bg-bg-surface p-6 shadow-lg"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium text-fg-default">
            {success ? "Invitación enviada" : "Nuevo usuario"}
          </h2>
          {!success && (
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

        {/* ── Success state ────────────────────────────────────────────── */}
        {success ? (
          <div role="alert" aria-live="polite">
            <p className="mb-6 font-sans text-sm text-fg-muted">
              Email de invitación enviado a <strong>{email}</strong>.
              El usuario recibirá un enlace para establecer su contraseña.
            </p>
            <div className="flex justify-end">
              <Button variant="primary" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          /* ── Form ─────────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              <Input
                ref={firstFieldRef}
                id="user-name"
                label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
                placeholder="Nombre completo"
              />

              <Input
                id="user-email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="email@ejemplo.com"
              />

              {/* Role select */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="user-role"
                  className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                >
                  Rol
                </label>
                <select
                  id="user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="rounded-control border border-border-default bg-bg-surface px-4 py-3 font-sans text-base text-fg-default transition-colors hover:border-border-strong focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2"
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

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
                  {submitting ? "Enviando..." : "Invitar usuario"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
