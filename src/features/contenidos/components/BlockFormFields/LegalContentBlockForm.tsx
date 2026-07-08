'use client';

import { Input } from '@/shared/components/input';
import { Button } from '@/shared/components/button';

/**
 * Form fields for legal page content blocks (aviso-legal, privacidad, cookies).
 *
 * Fields match the legalContentBlockSchema:
 * - titulo (string, max 100)
 * - secciones (array of { titulo, contenido }, min 1, max 20)
 */

type Seccion = {
  titulo: string;
  contenido: string;
};

type LegalPayload = {
  titulo: string;
  secciones: Seccion[];
};

interface LegalContentBlockFormProps {
  payload: LegalPayload;
  onChange: (payload: LegalPayload) => void;
  errors?: Record<string, string>;
}

export function LegalContentBlockForm({
  payload,
  onChange,
  errors = {},
}: LegalContentBlockFormProps) {
  const updateTitulo = (titulo: string) => {
    onChange({ ...payload, titulo });
  };

  const updateSeccion = (index: number, field: keyof Seccion, value: string) => {
    const secciones = payload.secciones.map((s, i) =>
      i === index ? { ...s, [field]: value } : s,
    );
    onChange({ ...payload, secciones });
  };

  const addSeccion = () => {
    onChange({
      ...payload,
      secciones: [...payload.secciones, { titulo: '', contenido: '' }],
    });
  };

  const removeSeccion = (index: number) => {
    const secciones = payload.secciones.filter((_, i) => i !== index);
    onChange({ ...payload, secciones });
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        id="legal-titulo"
        label="Título de la página"
        value={payload.titulo}
        onChange={(e) => updateTitulo(e.target.value)}
        helpText="Máximo 100 caracteres"
        error={errors.titulo}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
            Secciones ({payload.secciones.length})
          </span>
          <Button variant="secondary" onClick={addSeccion}>
            Añadir sección
          </Button>
        </div>

        {payload.secciones.map((seccion, index) => {
          const tituloErrorKey = `secciones.${index}.titulo`;
          const contenidoErrorKey = `secciones.${index}.contenido`;

          return (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-card border border-border-default bg-bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm font-semibold text-fg-default">
                  Sección {index + 1}
                </span>
                {payload.secciones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSeccion(index)}
                    className="font-sans text-sm text-status-danger-default hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    aria-label={`Eliminar sección ${index + 1}`}
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <Input
                id={`seccion-titulo-${index}`}
                label="Título de la sección"
                value={seccion.titulo}
                onChange={(e) => updateSeccion(index, 'titulo', e.target.value)}
                helpText="Máximo 100 caracteres"
                error={errors[tituloErrorKey]}
              />

              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`seccion-contenido-${index}`}
                  className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                >
                  Contenido
                </label>
                <textarea
                  id={`seccion-contenido-${index}`}
                  value={seccion.contenido}
                  onChange={(e) => {
                    updateSeccion(index, 'contenido', e.target.value);
                  }}
                  aria-invalid={Boolean(errors[contenidoErrorKey])}
                  aria-describedby={errors[contenidoErrorKey] ? `seccion-contenido-${index}-error` : undefined}
                  className={`w-full rounded-control border bg-bg-canvas px-4 py-3 font-sans text-base text-fg-default placeholder:text-fg-subtle transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default ${
                    errors[contenidoErrorKey]
                      ? 'border-status-danger-default'
                      : 'border-border-default'
                  }`}
                  rows={6}
                  aria-label={`Contenido de la sección ${index + 1}`}
                />
                {errors[contenidoErrorKey] ? (
                  <p
                    id={`seccion-contenido-${index}-error`}
                    role="alert"
                    aria-live="polite"
                    className="font-sans text-sm text-status-danger-default"
                  >
                    {errors[contenidoErrorKey]}
                  </p>
                ) : (
                  <p className="font-sans text-sm text-fg-subtle">
                    Máximo 5000 caracteres
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
