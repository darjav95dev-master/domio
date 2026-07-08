"use client";

import {
  Component,
  type ReactNode,
  type ErrorInfo,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?:
    | ReactNode
    | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Default fallback UI ──────────────────────────────────────────────────────

function DefaultFallback({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex min-h-[240px] w-full items-center justify-center bg-bg-canvas px-6 py-16"
    >
      <div className="max-w-md border-l-[3px] border-accent-default pl-6">
        <h2 className="font-display text-xl font-medium leading-snug tracking-tight text-fg-default">
          Algo sali&oacute; mal al cargar esta p&aacute;gina
        </h2>
        <p className="mt-2 text-base leading-relaxed text-fg-muted">
          Intentalo de nuevo o contacta con nuestro equipo si el problema persiste.
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

// ─── ErrorBoundary ────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      const error = this.state.error;
      const reset = this.handleReset;

      if (fallback !== undefined && fallback !== null) {
        if (typeof fallback === "function") {
          return (fallback as (error: Error, reset: () => void) => ReactNode)(
            error,
            reset,
          );
        }
        return fallback;
      }

      return <DefaultFallback reset={reset} />;
    }

    return this.props.children;
  }
}
