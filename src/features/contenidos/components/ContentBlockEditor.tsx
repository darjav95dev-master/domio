'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { saveContentBlock } from '../actions/content-block.actions';
import { Button } from '@/shared/components/button';
import { Toast } from '@/shared/components/toast';
import { Skeleton } from '@/shared/components/skeleton';
import type { PageKey, BlockKey } from '@/shared/types/content.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses Zod validation issues from the server response `details` array
 * into a flat `Record<fieldPath, message>` map for field-level display.
 */
function parseZodErrors(details: unknown): Record<string, string> {
  if (!Array.isArray(details)) return {};
  const errors: Record<string, string> = {};
  for (const issue of details) {
    if (issue && typeof issue === 'object' && 'message' in issue) {
      const path = Array.isArray(issue.path) ? issue.path.join('.') : '_root';
      if (!errors[path]) {
        errors[path] = String(issue.message);
      }
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ContentBlockEditorProps {
  pageKey: PageKey;
  blockKey: BlockKey;
  initialPayload: Record<string, unknown>;
}

export function ContentBlockEditor({
  pageKey,
  blockKey,
  initialPayload,
}: ContentBlockEditorProps) {
  const [payload, setPayload] = useState<Record<string, unknown>>(initialPayload);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
  } | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setToast(null);
    setValidationErrors({});

    const result = await saveContentBlock(pageKey, blockKey, payload);

    setSaving(false);

    if (result.success) {
      setToast({ variant: 'success', title: 'Contenido guardado correctamente' });
    } else if (result.details) {
      // Parse Zod validation errors for field-level display
      const parsed = parseZodErrors(result.details);
      setValidationErrors(parsed);
      setToast({
        variant: 'error',
        title: 'Error de validación. Revisa los campos marcados.',
      });
    } else {
      setToast({
        variant: 'error',
        title: result.error ?? 'Error al guardar el contenido',
      });
    }
  }, [pageKey, blockKey, payload]);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Clear errors when the user edits the payload
  const handlePayloadChange = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      setPayload(parsed);
      setValidationErrors({});
    } catch {
      // Allow invalid JSON while typing
    }
  }, []);

  const errorEntries = useMemo(
    () => Object.entries(validationErrors),
    [validationErrors],
  );

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-default p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-fg-default">
          Bloque: <span className="text-accent-default">{blockKey}</span>
        </h2>
      </div>

      {/* Payload editor — generic JSON textarea for now */}
      {/* Will be replaced by BlockFormFields in future iterations */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor={`payload-${blockKey}`}
          className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
        >
          Payload JSON
        </label>
        <textarea
          id={`payload-${blockKey}`}
          value={JSON.stringify(payload, null, 2)}
          onChange={(e) => handlePayloadChange(e.target.value)}
          aria-invalid={errorEntries.length > 0}
          aria-describedby={errorEntries.length > 0 ? `payload-${blockKey}-errors` : undefined}
          className={`w-full rounded-control border bg-bg-surface px-4 py-3 font-mono text-sm text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default ${
            errorEntries.length > 0
              ? 'border-status-danger-default'
              : 'border-border-default'
          }`}
          rows={12}
          aria-label="Payload del bloque en formato JSON"
        />

        {/* Field-level validation errors */}
        {errorEntries.length > 0 && (
          <ul
            id={`payload-${blockKey}-errors`}
            role="alert"
            aria-live="polite"
            className="flex flex-col gap-1"
          >
            {errorEntries.map(([field, msg]) => (
              <li
                key={field}
                className="font-sans text-sm text-status-danger-default"
              >
                <span className="font-mono text-xs">{field}</span>: {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} aria-busy={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>

        <Link
          href={`/panel/contenidos/${pageKey}/history?block=${blockKey}`}
          className="font-sans text-sm text-accent-default transition-colors duration-standard hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          Ver historial
        </Link>
      </div>

      {toast && (
        <div role="alert" aria-live="polite">
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

/**
 * Loading skeleton for ContentBlockEditor while data is being fetched.
 */
export function ContentBlockEditorSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border-default bg-bg-default p-6">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-11 w-28" />
    </div>
  );
}
