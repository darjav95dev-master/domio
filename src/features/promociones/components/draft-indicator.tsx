"use client";

import { useCallback, useEffect, useState } from "react";

export interface DraftIndicatorProps {
  /** Whether a save is currently in-flight. */
  isSaving: boolean;
  /** ISO string of the last successful save, or null. */
  lastSavedAt: string | null;
  /** Error message, or null. */
  error: string | null;
}

/**
 * DraftIndicator — Muestra el estado del autoguardado del borrador.
 *
 * - "Guardando…" cuando hay una operación en curso (isSaving).
 * - "Borrador guardado hace X segundos/minutos" con un punto verde
 *   cuando el último guardado fue exitoso (lastSavedAt presente).
 * - "Error al guardar" con un punto terracota cuando hay error.
 *
 * **A11y:**
 * - `role="status"` + `aria-live="polite"` para anunciar cambios sin
 *   interrumpir al usuario.
 * - Texto visible suficiente para contraste sobre bg-canvas (olive 5C6B3D
 *   y terracota C75D3F, ambos ≥ 4.5:1 sobre bg-canvas #FBF8F3).
 *
 * **Design tokens:**
 * - bg: status-success-subtle / status-danger-subtle
 * - fg: status-success-default (olive) / status-danger-default (terracota)
 * - pill shape con radius-pill
 */
export function DraftIndicator({
  isSaving,
  lastSavedAt,
  error,
}: DraftIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  // ── Update the relative time every 10s ──────────────────────────────

  const computeTimeAgo = useCallback(() => {
    if (!lastSavedAt) return setTimeAgo("");
    const diffMs = Date.now() - new Date(lastSavedAt).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return setTimeAgo("ahora");
    if (diffSec < 60) return setTimeAgo(`hace ${diffSec} segundos`);
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin === 1) return setTimeAgo("hace 1 minuto");
    return setTimeAgo(`hace ${diffMin} minutos`);
  }, [lastSavedAt]);

  useEffect(() => {
    computeTimeAgo();
    const timer = setInterval(computeTimeAgo, 10000);
    return () => clearInterval(timer);
  }, [computeTimeAgo]);

  // ── Nothing to show when idle with no saves and no error ────────────

  if (!isSaving && !lastSavedAt && !error) {
    return null;
  }

  // ── Saving state ────────────────────────────────────────────────────

  if (isSaving) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 rounded-pill bg-status-info-subtle px-3 py-1.5 font-sans text-sm text-fg-subtle"
      >
        <span
          data-testid="draft-indicator-dot"
          aria-hidden="true"
          className="inline-block size-2 animate-pulse rounded-full bg-fg-subtle"
        />
        Guardando…
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 rounded-pill bg-status-danger-subtle px-3 py-1.5 font-sans text-sm text-status-danger-default"
      >
        <span
          data-testid="draft-indicator-dot"
          aria-hidden="true"
          className="inline-block size-2 rounded-full bg-status-danger-default"
        />
        Error al guardar
      </div>
    );
  }

  // ── Saved state (lastSavedAt present) ───────────────────────────────

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-pill bg-status-success-subtle px-3 py-1.5 font-sans text-sm text-status-success-default"
    >
      <span
        data-testid="draft-indicator-dot"
        aria-hidden="true"
        className="inline-block size-2 rounded-full bg-status-success-default"
      />
      Borrador guardado {timeAgo}
    </div>
  );
}
