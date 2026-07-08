'use client';

/**
 * Error boundary for the contact history page.
 *
 * Catches rendering errors in the contact history tree and shows a
 * composed error state per §8 of the design system: voice affirmative,
 * no blame, border-left accent 3px, retry button.
 *
 * @see design.md §8 (Error state)
 * @see tasks.md — T046
 */

export default function ContactHistoryError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex min-h-[320px] w-full items-center justify-center bg-bg-canvas px-6 py-16"
    >
      <div className="max-w-md border-l-[3px] border-accent-default pl-6">
        <h2 className="font-display text-xl font-medium leading-snug tracking-tight text-fg-default">
          No hemos podido cargar el historial de contacto
        </h2>
        <p className="mt-2 font-sans text-base leading-relaxed text-fg-muted">
          Ocurrió un problema al cargar el historial de la configuración de
          contacto. Inténtalo de nuevo o contacta con nuestro equipo si el
          problema persiste.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-pill bg-fg-default px-6 py-3 font-sans text-sm font-medium text-bg-canvas transition-all duration-deliberate ease-standard hover:bg-accent-default hover:shadow-[0_0_0_1px_var(--accent-subtle),0_12px_32px_var(--accent-glow)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
