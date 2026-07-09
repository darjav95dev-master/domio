'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { saveContactConfig } from '../actions/contact-config.actions';
import { Button } from '@/shared/components/button';
import { Input } from '@/shared/components/input';
import { Toast } from '@/shared/components/toast';

/**
 * Field-level form data for the contact configuration.
 * Mirrors ContactConfigInput from the action file.
 */
export interface ContactConfigFormData {
  phone: string;
  email: string;
  address: string;
  hours: string;
  whatsappNumber: string;
  whatsappPrefilledMessage: string;
}

export interface ContactConfigFormProps {
  /** Existing config from the DB, or null for a fresh empty form */
  initialData: {
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    hours?: string | null;
    whatsappNumber?: string | null;
    whatsappPrefilledMessage?: string | null;
  } | null;
}

/** Germane IDs for each field — used on both label `htmlFor` and input `id`. */
const FIELD_IDS = {
  phone: 'contact-phone',
  email: 'contact-email',
  address: 'contact-address',
  hours: 'contact-hours',
  whatsappNumber: 'contact-whatsapp-number',
  whatsappPrefilledMessage: 'contact-whatsapp-message',
} as const;

function emptyFormData(): ContactConfigFormData {
  return {
    phone: '',
    email: '',
    address: '',
    hours: '',
    whatsappNumber: '',
    whatsappPrefilledMessage: '',
  };
}

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

export function ContactConfigForm({ initialData }: ContactConfigFormProps) {
  const [formData, setFormData] = useState<ContactConfigFormData>(
    initialData
      ? {
          phone: initialData.phone ?? '',
          email: initialData.email ?? '',
          address: initialData.address ?? '',
          hours: initialData.hours ?? '',
          whatsappNumber: initialData.whatsappNumber ?? '',
          whatsappPrefilledMessage: initialData.whatsappPrefilledMessage ?? '',
        }
      : emptyFormData(),
  );
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    variant: 'success' | 'error';
    title: string;
  } | null>(null);

  const handleChange = useCallback(
    (field: keyof ContactConfigFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear the error for this field when the user starts editing
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setToast(null);
    setFieldErrors({});

    const result = await saveContactConfig(formData);

    setSaving(false);

    if (result.success) {
      setToast({ variant: 'success', title: 'Configuración de contacto guardada' });
    } else if (result.details) {
      const parsed = parseZodErrors(result.details);
      setFieldErrors(parsed);
      setToast({
        variant: 'error',
        title: 'Error de validación. Revisa los campos marcados.',
      });
    } else {
      setToast({ variant: 'error', title: result.error ?? 'Error al guardar' });
    }
  }, [formData]);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const hasErrors = useMemo(
    () => Object.keys(fieldErrors).length > 0,
    [fieldErrors],
  );

  return (
    <div className="flex flex-col gap-6 rounded-card border border-border-default bg-bg-surface p-6">
      <h2 className="font-display text-xl font-semibold text-fg-default">
        Configuración de Contacto Global
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          id={FIELD_IDS.phone}
          label="Teléfono"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+34 612 345 678"
          error={fieldErrors.phone}
        />
        <Input
          id={FIELD_IDS.email}
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="info@domio.test"
          error={fieldErrors.email}
        />
        <div className="md:col-span-2">
          <Input
            id={FIELD_IDS.address}
            label="Dirección"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Calle Ejemplo 123, Madrid"
            error={fieldErrors.address}
          />
        </div>
        <div className="md:col-span-2">
          <Input
            id={FIELD_IDS.hours}
            label="Horario"
            value={formData.hours}
            onChange={(e) => handleChange('hours', e.target.value)}
            placeholder="Lunes a Viernes, 9:00 - 18:00"
            error={fieldErrors.hours}
          />
        </div>
        <Input
          id={FIELD_IDS.whatsappNumber}
          label="Número de WhatsApp"
          value={formData.whatsappNumber}
          onChange={(e) => handleChange('whatsappNumber', e.target.value)}
          placeholder="+34 612 345 678"
          error={fieldErrors.whatsappNumber}
        />
        <div className="md:col-span-2">
          <Input
            id={FIELD_IDS.whatsappPrefilledMessage}
            label="Mensaje predefinido de WhatsApp"
            value={formData.whatsappPrefilledMessage}
            onChange={(e) => handleChange('whatsappPrefilledMessage', e.target.value)}
            placeholder="Hola, me gustaría recibir más información"
            error={fieldErrors.whatsappPrefilledMessage}
          />
        </div>
      </div>

      {/* Summary error banner */}
      {hasErrors && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-card border border-status-danger-default bg-status-danger-subtle px-4 py-3"
        >
          <p className="font-sans text-sm font-semibold text-status-danger-default">
            Corrige los errores marcados antes de guardar.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} aria-busy={saving}>
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>

        <Link
          href="/panel/contenidos/contacto/history"
          className="font-sans text-sm text-accent-default transition-colors duration-standard hover:text-accent-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          Ver historial
        </Link>
      </div>

      {toast && (
        <div aria-live="polite">
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
 * Loading skeleton that mirrors the ContactConfigForm layout.
 * Used by the contacto page loading.tsx.
 */
export function ContactConfigFormSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-card border border-border-default bg-bg-surface p-6">
      <div className="h-7 w-64 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <div className="h-3 w-16 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
          <div className="h-11 w-full animate-shimmer rounded-control bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="h-3 w-12 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
          <div className="h-11 w-full animate-shimmer rounded-control bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <div className="h-3 w-20 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
          <div className="h-11 w-full animate-shimmer rounded-control bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <div className="h-3 w-16 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
          <div className="h-11 w-full animate-shimmer rounded-control bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="h-3 w-24 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
          <div className="h-11 w-full animate-shimmer rounded-control bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
        </div>
        <div className="flex flex-col gap-1 md:col-span-2">
          <div className="h-3 w-28 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
          <div className="h-11 w-full animate-shimmer rounded-control bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
        </div>
      </div>
      <div className="h-11 w-48 animate-shimmer rounded-pill bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
    </div>
  );
}
