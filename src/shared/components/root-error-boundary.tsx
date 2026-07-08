"use client";

import type { ReactNode } from "react";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { captureError } from "@/infrastructure/observability/sentry.wrapper";

/**
 * RootErrorBoundary — client-component wrapper around ErrorBoundary
 * that captures errors via Sentry.
 *
 * Separated from the server layout to avoid passing function callbacks
 * across the server/client boundary.
 */
export function RootErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary onError={(error) => captureError(error, { endpoint: "/" })}>
      {children}
    </ErrorBoundary>
  );
}
