"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShareButtonProps {
  url?: string;
  title?: string;
  text?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareButton({
  url = typeof window !== "undefined" ? window.location.href : "",
  title = "Domio",
  text,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleShare = useCallback(async () => {
    // Try native Web Share API first
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch {
        // User cancelled or API unavailable — fall through to clipboard
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Last resort: use execCommand (legacy)
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 3000);
  }, [url, title, text]);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-2 rounded-pill border border-border-default px-[18px] py-[11px] font-sans text-sm font-medium leading-[1.5] text-fg-muted transition-all duration-350 ease-[cubic-bezier(.2,.8,.2,1)] hover:border-fg-default hover:text-fg-default focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3 focus-visible:rounded-[4px]"
        aria-label="Compartir enlace"
      >
        {/* Share icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {copied ? "Enlace copiado" : "Compartir"}
      </button>

      {/* Toast feedback */}
      {copied && (
        <span
          role="status"
          aria-live="polite"
          className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-control bg-fg-default px-3 py-1.5 font-sans text-xs text-bg-canvas shadow-md"
        >
          Enlace copiado
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-fg-default" />
        </span>
      )}
    </div>
  );
}
