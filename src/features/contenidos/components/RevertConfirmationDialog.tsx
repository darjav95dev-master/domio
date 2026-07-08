'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/shared/components/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RevertConfirmationDialogProps {
  /** Human-readable timestamp of the target version (already localized). */
  timestamp: string;
  /** Called when the user confirms the revert. */
  onConfirm: () => void;
  /** Called when the user cancels or closes the dialog. */
  onCancel: () => void;
  /** Disables both buttons (e.g. while reverting). */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Confirmation dialog for reverting content to a previous version.
 *
 * Renders a modal overlay with a brief confirmation message, a Cancel
 * button and a Confirm button. Focus is moved to the confirm button
 * on mount.
 *
 * **Accesibilidad:** `role="alertdialog"`, `aria-modal`, `aria-label`
 * descriptivo. Manejo de tecla Escape para cancelar mediante event
 * listener a nivel de documento (evita warning de jsx-a11y sobre
 * non-interactive elements).
 *
 * @see tasks.md — T042
 */
export function RevertConfirmationDialog({
  timestamp,
  onConfirm,
  onCancel,
  disabled = false,
}: RevertConfirmationDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // ── Focus the confirm button on mount ───────────────────────────────
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  // ── Escape to cancel (document-level listener) ──────────────────────
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disabled) {
        onCancel();
      }
    },
    [onCancel, disabled],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="alertdialog"
      aria-modal="true"
      aria-label={`Confirmar revertir a la versión del ${timestamp}`}
    >
      <div className="mx-4 max-w-md rounded-card border border-border-default bg-bg-surface p-6 shadow-lg">
        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-fg-default">
          Confirmar revertir
        </h3>

        {/* Body */}
        <p className="mt-4 font-sans text-base leading-relaxed text-fg-muted">
          ¿Revertir a la versión del {timestamp}? Esta acción creará una
          nueva versión en el historial.
        </p>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={disabled}
            aria-label="Cancelar revertir"
          >
            Cancelar
          </Button>
          <Button
            ref={confirmRef}
            variant="primary"
            onClick={onConfirm}
            disabled={disabled}
            aria-busy={disabled}
          >
            {disabled ? 'Revirtiendo...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
