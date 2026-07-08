'use client';

import { Input } from '@/shared/components/input';
import { Button } from '@/shared/components/button';

/**
 * Form fields for the home/faq block.
 *
 * Fields match the faqBlockSchema:
 * - items (array of { pregunta, respuesta }, min 1, max 12)
 */

type FaqItem = {
  pregunta: string;
  respuesta: string;
};

type FaqPayload = {
  items: FaqItem[];
};

interface FaqBlockFormProps {
  payload: FaqPayload;
  onChange: (payload: FaqPayload) => void;
  errors?: Record<string, string>;
}

export function FaqBlockForm({ payload, onChange, errors = {} }: FaqBlockFormProps) {
  const updateItem = (index: number, field: keyof FaqItem, value: string) => {
    const items = payload.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    onChange({ ...payload, items });
  };

  const addItem = () => {
    if (payload.items.length >= 12) return;
    onChange({
      ...payload,
      items: [...payload.items, { pregunta: '', respuesta: '' }],
    });
  };

  const removeItem = (index: number) => {
    if (payload.items.length <= 1) return;
    const items = payload.items.filter((_, i) => i !== index);
    onChange({ ...payload, items });
  };

  const canAddMore = payload.items.length < 12;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
          Preguntas frecuentes ({payload.items.length}/12)
        </span>
        <Button
          variant="secondary"
          onClick={addItem}
          disabled={!canAddMore}
        >
          Añadir pregunta
        </Button>
      </div>

      {payload.items.map((item, index) => {
        const preguntaErrorKey = `items.${index}.pregunta`;
        const respuestaErrorKey = `items.${index}.respuesta`;

        return (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-card border border-border-default bg-bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-sans text-sm font-semibold text-fg-default">
                Pregunta {index + 1}
              </span>
              {payload.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="font-sans text-sm text-status-danger-default hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  aria-label={`Eliminar pregunta ${index + 1}`}
                >
                  Eliminar
                </button>
              )}
            </div>

            <Input
              id={`faq-pregunta-${index}`}
              label="Pregunta"
              value={item.pregunta}
              onChange={(e) => {
                updateItem(index, 'pregunta', e.target.value);
              }}
              helpText="Máximo 200 caracteres"
              error={errors[preguntaErrorKey]}
            />

            <div className="flex flex-col gap-1">
              <label
                htmlFor={`faq-respuesta-${index}`}
                className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
              >
                Respuesta
              </label>
              <textarea
                id={`faq-respuesta-${index}`}
                value={item.respuesta}
                onChange={(e) => {
                  updateItem(index, 'respuesta', e.target.value);
                }}
                aria-invalid={Boolean(errors[respuestaErrorKey])}
                aria-describedby={errors[respuestaErrorKey] ? `faq-respuesta-${index}-error` : undefined}
                className={`w-full rounded-control border bg-bg-canvas px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default ${
                  errors[respuestaErrorKey]
                    ? 'border-status-danger-default'
                    : 'border-border-default'
                }`}
                rows={4}
                aria-label={`Respuesta de la pregunta ${index + 1}`}
              />
              {errors[respuestaErrorKey] ? (
                <p
                  id={`faq-respuesta-${index}-error`}
                  role="alert"
                  aria-live="polite"
                  className="font-sans text-sm text-status-danger-default"
                >
                  {errors[respuestaErrorKey]}
                </p>
              ) : (
                <p className="font-sans text-sm text-fg-subtle">
                  Máximo 1000 caracteres
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
