'use client';

import { Input } from '@/shared/components/input';

/**
 * Form fields for the home/hero block.
 *
 * Fields match the heroBlockSchema in content-block.schema.ts:
 * - claim (string, max 200)
 * - lead (string, max 500)
 * - ctaPrimary (string, max 100)
 * - ctaSecondary (string, max 100)
 * - backgroundImageId (uuid | null)
 */

type HeroPayload = {
  claim: string;
  lead: string;
  ctaPrimary: string;
  ctaSecondary: string;
  backgroundImageId: string | null;
};

interface HeroBlockFormProps {
  payload: HeroPayload;
  onChange: (payload: HeroPayload) => void;
  errors?: Record<string, string>;
}

export function HeroBlockForm({ payload, onChange, errors = {} }: HeroBlockFormProps) {
  const updateField = <K extends keyof HeroPayload>(
    field: K,
    value: HeroPayload[K],
  ) => {
    onChange({ ...payload, [field]: value });
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        id="hero-claim"
        label="Claim principal"
        value={payload.claim}
        onChange={(e) => updateField('claim', e.target.value)}
        helpText="Máximo 200 caracteres"
        error={errors.claim}
      />

      <div className="flex flex-col gap-1">
        <label
          htmlFor="hero-lead"
          className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
        >
          Lead / Subtítulo
        </label>
        <textarea
          id="hero-lead"
          value={payload.lead}
          onChange={(e) => {
            updateField('lead', e.target.value);
          }}
          aria-invalid={Boolean(errors.lead)}
          aria-describedby={errors.lead ? 'hero-lead-error' : undefined}
          className={`w-full rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default ${
            errors.lead
              ? 'border-status-danger-default'
              : 'border-border-default'
          }`}
          rows={3}
          aria-label="Lead del hero"
        />
        {errors.lead ? (
          <p
            id="hero-lead-error"
            role="alert"
            aria-live="polite"
            className="font-sans text-sm text-status-danger-default"
          >
            {errors.lead}
          </p>
        ) : (
          <p className="font-sans text-sm text-fg-subtle">
            Máximo 500 caracteres
          </p>
        )}
      </div>

      <Input
        id="hero-cta-primary"
        label="Texto CTA principal"
        value={payload.ctaPrimary}
        onChange={(e) => updateField('ctaPrimary', e.target.value)}
        helpText="Máximo 100 caracteres"
        error={errors.ctaPrimary}
      />

      <Input
        id="hero-cta-secondary"
        label="Texto CTA secundario"
        value={payload.ctaSecondary}
        onChange={(e) => updateField('ctaSecondary', e.target.value)}
        helpText="Máximo 100 caracteres"
        error={errors.ctaSecondary}
      />

      <Input
        id="hero-bg-image"
        label="ID de imagen de fondo (UUID)"
        value={payload.backgroundImageId ?? ''}
        onChange={(e) => {
          updateField('backgroundImageId', e.target.value || null);
        }}
        placeholder="UUID de la imagen en la mediateca"
        helpText="Dejar vacío para usar la imagen por defecto"
        error={errors.backgroundImageId}
      />
    </div>
  );
}
