'use client';

/**
 * Error page for the content editor dynamic route.
 * Catches rendering errors in the page component tree.
 */

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PageKeyContentError({ reset }: ErrorPageProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex min-h-[320px] w-full items-center justify-center bg-bg-canvas px-6 py-16"
    >
      <div className="max-w-md border-l-[3px] border-status-danger-default pl-6">
        <h2 className="font-display text-xl font-medium leading-snug tracking-tight text-fg-default">
          Error al cargar los contenidos
        </h2>
        <p className="mt-2 font-sans text-base leading-relaxed text-fg-muted">
          Ocurrió un problema al cargar los bloques de contenido de esta página.
          Inténtalo de nuevo o contacta con nuestro equipo si el problema persiste.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-pill bg-fg-default px-6 py-3 font-sans text-sm font-medium text-bg-canvas transition-all duration-deliberate ease-standard hover:bg-accent-default focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
