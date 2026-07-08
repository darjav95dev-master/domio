'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/shared/components/button';
import { Toast } from '@/shared/components/toast';
import { Skeleton } from '@/shared/components/skeleton';
import { RevertConfirmationDialog } from './RevertConfirmationDialog';
import { revertContent } from '../actions/content-history.actions';
import type { ContentType } from '@/shared/types/content.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  id: string;
  contentType: ContentType;
  contentKey: string;
  payloadSnapshot: Record<string, unknown>;
  /** The user who made the change, or null if the user was deleted. */
  updatedBy: { name: string } | null;
  /** ISO-8601 timestamp. */
  createdAt: string;
}

export interface ContentHistoryViewProps {
  /** List of history entries, most recent first. */
  history: HistoryEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats an ISO-8601 date string to a human-readable locale string.
 * Falls back to the raw timestamp if the date is invalid.
 */
function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Returns the author label. If updatedBy is null, the user was deleted.
 */
function authorLabel(entry: HistoryEntry): string {
  return entry.updatedBy?.name ?? 'Usuario eliminado';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays a chronological list of content versions with the ability
 * to revert to any previous version.
 *
 * **Empty state:** When `history` is empty, shows a centered message.
 * **Revert flow:** Selecting a version opens a confirmation dialog.
 *   On confirm, calls `revertContent` server action and reloads the page
 *   on success. Shows Toast feedback for success/error.
 *
 * **Accesibilidad:** Toast uses `role="alert"` + `aria-live="polite"`.
 *   Buttons are keyboard-focusable with `focus-visible` ring.
 *
 * @see tasks.md — T041
 */
export function ContentHistoryView({ history }: ContentHistoryViewProps) {
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [reverting, setReverting] = useState(false);
  const [toast, setToast] = useState<{
    variant: 'success' | 'error';
    title: string;
  } | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleRevert = useCallback(async () => {
    if (!selectedEntry) return;

    setReverting(true);
    setToast(null);

    const result = await revertContent(selectedEntry.id);

    setReverting(false);

    if (result.success) {
      setToast({ variant: 'success', title: 'Contenido revertido correctamente' });
      setSelectedEntry(null);

      // Recargar para ver el cambio reflejado
      window.location.reload();
    } else {
      setToast({ variant: 'error', title: result.error ?? 'Error al revertir el contenido' });
    }

    // Auto-dismiss toast after 4s
    setTimeout(() => setToast(null), 4000);
  }, [selectedEntry]);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // ── Empty state ────────────────────────────────────────────────────

  if (history.length === 0) {
    return (
      <div
        role="status"
        className="flex flex-col items-center justify-center rounded-card border border-border-default bg-bg-surface px-6 py-16"
      >
        <p className="font-sans text-base text-fg-muted">
          Aún no hay versiones anteriores.
        </p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold text-fg-default">
        Historial de Versiones
      </h2>

      <div className="flex flex-col gap-3">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between gap-4 rounded-card border border-border-default bg-bg-surface p-4"
          >
            {/* Entry info */}
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm text-fg-subtle">
                {formatTimestamp(entry.createdAt)}
              </p>
              <p className="font-sans text-sm font-medium text-fg-default">
                {authorLabel(entry)}
              </p>
              <p className="mt-1 truncate font-mono text-xs text-fg-subtle">
                {JSON.stringify(entry.payloadSnapshot).slice(0, 120)}
                {JSON.stringify(entry.payloadSnapshot).length > 120 ? '…' : ''}
              </p>
            </div>

            {/* Action */}
            <Button
              variant="secondary"
              onClick={() => setSelectedEntry(entry)}
              disabled={reverting}
              aria-label={`Revertir a la versión del ${formatTimestamp(entry.createdAt)}`}
              className="shrink-0"
            >
              Revertir a esta versión
            </Button>
          </div>
        ))}
      </div>

      {/* Confirmation dialog */}
      {selectedEntry && (
        <RevertConfirmationDialog
          timestamp={formatTimestamp(selectedEntry.createdAt)}
          onConfirm={handleRevert}
          onCancel={() => setSelectedEntry(null)}
          disabled={reverting}
        />
      )}

      {/* Toast feedback */}
      {toast && (
        <div role="alert" aria-live="polite" className="fixed bottom-6 right-6 z-50">
          <Toast
            variant={toast.variant}
            title={toast.title}
            autoDismiss={4000}
            onDismiss={dismissToast}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

/**
 * Loading skeleton for ContentHistoryView while data is being fetched.
 */
export function ContentHistoryViewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-56" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-4 rounded-card border border-border-default bg-bg-surface p-4"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full max-w-[320px]" />
            </div>
            <Skeleton className="h-10 w-44 shrink-0 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}
