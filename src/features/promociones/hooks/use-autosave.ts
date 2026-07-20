import { useEffect, useRef, useState, useCallback } from "react";

export interface UseAutosaveResult {
  /** ISO string of the last successful save, or null if never saved. */
  lastSavedAt: string | null;
  /** Whether a save is currently in-flight. */
  isSaving: boolean;
  /** Error message from the last failed save, or null. */
  error: string | null;
}

/**
 * useAutosave — periodic autosave hook for the promocion draft endpoint.
 *
 * Sends the current form state to `PATCH /api/internal/promociones/[id]/draft`
 * at the given `interval`. Skips if the form hasn't changed since the last
 * save, or if a previous save is still in-flight.
 *
 * Uses refs to avoid recreating the interval on every keystroke while still
 * always reading the latest form state.
 *
 * @param formState - Current form state object to persist.
 * @param promocionId - The promoción ID for the API URL.
 * @param interval - Milliseconds between save attempts (default 30000).
 */
export function useAutosave(
  formState: Record<string, unknown>,
  promocionId: string,
  interval: number = 30000,
): UseAutosaveResult {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep latest formState in a ref so the interval callback always reads
  // fresh data without needing formState as a dependency.
  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  // Snapshot of what was last successfully saved (serialized).
  // Initialised to a marker so the first save always triggers.
  const lastSavedSnapshotRef = useRef<string>("");

  // Track in-flight requests across renders.
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current) return; // Skip if already in-flight

    const currentSnapshot = JSON.stringify(formStateRef.current);
    if (currentSnapshot === lastSavedSnapshotRef.current) return; // No changes

    isSavingRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/internal/promociones/${promocionId}/draft`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: currentSnapshot,
        },
      );

      if (!response.ok) {
        setError("Error al guardar el borrador");
        return;
      }

      // El guardado de borrador NO toca promociones.updatedAt (solo draftPayload),
      // así que el updatedAt de la respuesta es el de la última edición completa
      // y puede ser de hace días. Usamos la hora real del guardado en cliente.
      lastSavedSnapshotRef.current = currentSnapshot;
      setLastSavedAt(new Date().toISOString());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar el borrador",
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [promocionId]);

  useEffect(() => {
    const timer = setInterval(save, interval);
    return () => clearInterval(timer);
  }, [save, interval]);

  return { lastSavedAt, isSaving, error };
}
