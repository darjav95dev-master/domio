"use client";

import { useState, useCallback } from "react";

export interface UseDraftRestoreResult {
  /** Whether there is a saved draft. */
  hasDraft: boolean;
  /** The draft payload data, or null if no draft. */
  draftData: Record<string, unknown> | null;
  /**
   * Returns the draft payload merged over the published data.
   * Draft values override published values for overlapping keys,
   * but keys only present in published remain unchanged.
   */
  applyDraft: () => Record<string, unknown>;
  /**
   * Discards the draft by calling PATCH with null draftPayload.
   * After success, hasDraft becomes false and draftData becomes null.
   * Throws if the PATCH fails.
   */
  discardDraft: () => Promise<void>;
}

/**
 * useDraftRestore — gestiona la restauración y descarte de borradores.
 *
 * En el montaje, detecta si `initialDraftPayload` tiene datos.
 * Si existe, significa que hay un borrador guardado que se puede
 * restaurar sobre los datos publicados.
 *
 * @param promocionId - ID de la promoción.
 * @param publishedData - Datos actualmente publicados (o la última versión
 *   guardada en servidor como no-draft).
 * @param initialDraftPayload - El `draftPayload` que viene del servidor
 *   (puede ser null si no hay borrador).
 */
export function useDraftRestore(
  promocionId: string,
  publishedData: Record<string, unknown>,
  initialDraftPayload: Record<string, unknown> | null,
): UseDraftRestoreResult {
  const [hasDraft, setHasDraft] = useState(initialDraftPayload !== null);
  const [draftData, setDraftData] = useState<Record<string, unknown> | null>(
    initialDraftPayload,
  );

  const applyDraft = useCallback((): Record<string, unknown> => {
    if (!draftData) return { ...publishedData };
    return { ...publishedData, ...draftData };
  }, [draftData, publishedData]);

  const discardDraft = useCallback(async (): Promise<void> => {
    const response = await fetch(
      `/api/internal/promociones/${promocionId}/draft`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error("Error al descartar el borrador");
    }

    setHasDraft(false);
    setDraftData(null);
  }, [promocionId]);

  return { hasDraft, draftData, applyDraft, discardDraft };
}
