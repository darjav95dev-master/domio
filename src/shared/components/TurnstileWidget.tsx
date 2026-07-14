"use client";

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TurnstileWidgetProps {
  /** Called with the turnstile token when the challenge is solved. */
  onToken: (token: string | null) => void;
  /** Optional custom class name for the wrapper. */
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Cloudflare Turnstile widget component.
 *
 * Loads the Turnstile script on mount and renders the widget.
 * Provides the token to the parent via the `onToken` callback.
 * Supports reset when the token expires or an error occurs.
 */
export function TurnstileWidget({ onToken, className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    // If no site key is configured, skip loading (e.g., in dev without Turnstile)
    if (!siteKey) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Domio] NEXT_PUBLIC_TURNSTILE_SITE_KEY not configured. Widget disabled.");
      }
      setScriptError(true);
      return;
    }

    // Avoid loading the script twice
    if (document.getElementById("cf-turnstile-script")) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error("[Domio] Failed to load Turnstile script");
      setScriptError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup widget on unmount
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile || !siteKey) {
      return;
    }

    // Render the widget
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => {
        onToken(token);
      },
      "expired-callback": () => {
        onToken(null);
      },
      "error-callback": () => {
        onToken(null);
      },
      theme: "light",
      // Se adapta al ancho del contenedor (mín. 300px): queda alineado con los
      // inputs del formulario en vez de un recuadro pequeño pegado a la
      // izquierda. Es la opción nativa de Cloudflare; escalarlo por CSS lo
      // dejaría borroso.
      size: "flexible",
    });

    widgetIdRef.current = widgetId;

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, siteKey, onToken]);

  // If no site key or script error, render nothing (rate limiting is the fallback)
  if (!siteKey || scriptError) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={className ?? "w-full"}
      aria-label="Verificación de seguridad"
      role="presentation"
    />
  );
}
