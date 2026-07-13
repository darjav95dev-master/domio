"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PromocionDeleteButtonProps {
  promocionId: string;
  promocionName: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUTTON_MONO_CLASS =
  "px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em]";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Botón de eliminación de promoción con confirmación inline.
 * Solo se renderiza para ADMIN y OPERATOR (el server component padre controla el acceso).
 */
export function PromocionDeleteButton({
  promocionId,
  promocionName,
}: PromocionDeleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(() => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/internal/promociones/${promocionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? "Error al eliminar la promoción");
          return;
        }

        router.push("/panel/catalogo");
        router.refresh();
      } catch {
        setError("Error de red al eliminar la promoción");
      }
    });
  }, [promocionId, router]);

  return (
    <section
      aria-label="Zona de peligro"
      className="rounded-card border border-status-danger-default bg-bg-surface p-6"
    >
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-status-danger-default">
        Zona de peligro
      </h2>

      <p className="mt-2 font-sans text-sm text-fg-muted">
        Eliminar <strong className="font-medium text-fg-default">{promocionName}</strong> borrará permanentemente la promoción, sus medios, tipologías, bloques editoriales y leads asociados. Esta acción no se puede deshacer.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!showConfirm ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowConfirm(true);
              setError(null);
            }}
            disabled={isPending}
            aria-label="Eliminar promoción"
            className={cn(
              BUTTON_MONO_CLASS,
              "border-status-danger-default text-status-danger-default hover:bg-status-danger-default hover:text-white",
            )}
          >
            Eliminar promoción
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirmar eliminación">
            <p className="font-sans text-sm font-medium text-status-danger-default">
              ¿Seguro que quieres eliminar esta promoción?
            </p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              aria-label="Confirmar eliminación"
              className={cn(
                BUTTON_MONO_CLASS,
                "inline-flex items-center justify-center rounded-pill border-[1.5px] border-status-danger-default bg-status-danger-default text-white transition-opacity duration-deliberate hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {isPending ? "Eliminando…" : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                setError(null);
              }}
              disabled={isPending}
              aria-label="Cancelar eliminación"
              className={cn(
                BUTTON_MONO_CLASS,
                "inline-flex items-center justify-center rounded-pill border-[1.5px] border-fg-default bg-transparent text-fg-default transition-colors duration-deliberate hover:bg-fg-default hover:text-bg-canvas disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              Cancelar
            </button>
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
