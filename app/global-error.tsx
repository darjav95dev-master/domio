"use client";

import { captureError } from "@/infrastructure/observability/sentry.wrapper";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Report to Sentry — always, even without DSN (wrapper handles no-op)
  captureError(error);

  return (
    <html lang="es">
      <body className="m-0 flex min-h-dvh items-center justify-center bg-bg-canvas p-0 antialiased">
        <main>
          <div
            role="alert"
            aria-live="polite"
            className="mx-auto max-w-md px-6 py-16"
          >
            <div className="border-l-[3px] border-accent-default pl-6">
              <h1 className="font-display text-2xl font-medium leading-snug tracking-tight text-fg-default">
                Algo sali&oacute; mal
              </h1>
              <p className="mt-2 text-base leading-relaxed text-fg-muted">
                Ha ocurrido un error cr&iacute;tico en la aplicaci&oacute;n.
                Int&eacute;ntalo de nuevo o recarga la p&aacute;gina.
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
        </main>
      </body>
    </html>
  );
}
