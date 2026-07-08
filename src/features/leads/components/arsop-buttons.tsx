"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ArsopButtonsProps {
  leadId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUTTON_MONO_CLASS =
  "px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em]";

// ---------------------------------------------------------------------------
// ArsopButtons
// ---------------------------------------------------------------------------

/**
 * Botones de ejercicio de derechos ARSOP para el detalle de lead.
 * - Exportar datos: genera CSV con todos los datos del lead.
 * - Borrar datos: borra en cascada el lead y todos sus datos asociados.
 *
 * Solo visible para ADMIN (el server component padre controla el renderizado).
 */
export function ArsopButtons({ leadId }: ArsopButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Export ─────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const { exportLeadAction } = await import(
          "@/features/leads/actions/arsop.actions"
        );
        await exportLeadAction(leadId);
        // No feedback needed beyond the transition — the backend has completed
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al exportar datos",
        );
      }
    });
  }, [leadId, router]);

  // ── Delete ─────────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const { deleteLeadAction } = await import(
          "@/features/leads/actions/arsop.actions"
        );
        await deleteLeadAction(leadId);
        // After deletion, redirect to the leads list
        router.push("/panel/leads");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al borrar datos",
        );
      }
    });
  }, [leadId, router]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <section
      aria-label="Ejercicio de derechos ARSOP"
      className="rounded-card border border-border-default bg-bg-surface p-6"
    >
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
        Derechos ARSOP
      </h2>

      <p className="mt-2 font-sans text-sm text-fg-muted">
        Exporta todos los datos personales del lead o elimina
        permanentemente todos sus registros.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Export button */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleExport}
          disabled={isPending}
          aria-label="Exportar datos del lead"
          className={cn(BUTTON_MONO_CLASS)}
        >
          {isPending ? "Exportando…" : "Exportar datos"}
        </Button>

        {/* Delete button or confirmation dialog */}
        {!showConfirm ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowConfirm(true);
              setError(null);
            }}
            disabled={isPending}
            aria-label="Borrar datos del lead"
            className={cn(
              BUTTON_MONO_CLASS,
              "border-status-danger-default text-status-danger-default hover:bg-status-danger-default hover:text-white",
            )}
          >
            Borrar datos
          </Button>
        ) : (
          <div className="flex items-center gap-2" role="alertdialog" aria-label="Confirmar borrado">
            <p
              id="delete-confirm-label"
              className="font-sans text-sm font-medium text-status-danger-default"
            >
              Seguro que quieres borrar todos los datos?
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleDelete}
              disabled={isPending}
              aria-label="Confirmar borrado de datos"
              className={cn(
                BUTTON_MONO_CLASS,
                "border-status-danger-default bg-status-danger-default text-white hover:opacity-90",
              )}
            >
              {isPending ? "Borrando…" : "Sí, borrar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowConfirm(false);
                setError(null);
              }}
              disabled={isPending}
              aria-label="Cancelar borrado"
              className={cn(BUTTON_MONO_CLASS)}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-3 font-sans text-sm text-status-danger-default"
        >
          {error}
        </p>
      )}
    </section>
  );
}
