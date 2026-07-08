"use client";

import { useState, useCallback, type ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { MediaImage } from "@/shared/components/media-image";
import type { MediaAssetItem } from "./media-upload-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaPreviewProps {
  asset: MediaAssetItem;
  onDelete: (assetId: string) => void;
  onSetCover?: (assetId: string) => void;
  canBeCover: boolean;
  isCover: boolean;
}

// ---------------------------------------------------------------------------
// CSS helpers (extracted to avoid sonarjs/no-duplicate-string)
// ---------------------------------------------------------------------------

const TRANSITION_CLS = "transition-all duration-standard ease-standard";
const FOCUS_VISIBLE_CLS =
  "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MediaPreview — wrapper sobre MediaImage para previsualización en backoffice.
 *
 * Muestra un thumbnail con overlay de acciones al hover.
 *
 * **A11y:**
 * - Botones con aria-label
 * - Overlay semántico con botones accesibles
 * - focus-visible en todos los interactivos
 * - Botón de eliminar requiere confirmación (window.confirm)
 */
export function MediaPreview({
  asset,
  onDelete,
  onSetCover,
  canBeCover,
  isCover,
}: MediaPreviewProps) {
  const [imgError, setImgError] = useState(false);

  const handleDelete = useCallback(() => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    onDelete(asset.id);
  }, [asset.id, onDelete]);

  const handleSetCover = useCallback(() => {
    onSetCover?.(asset.id);
  }, [asset.id, onSetCover]);

  const isPdf = asset.mimeType === "application/pdf";

  // ── Thumbnail content ──────────────────────────────────────────────────
  let thumbnailContent: ReactNode;

  if (isPdf) {
    thumbnailContent = (
      <div className="flex size-full flex-col items-center justify-center gap-2 bg-paper-2">
        <svg
          aria-hidden="true"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent-default"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span className="font-sans text-xs font-medium text-fg-default">
          Plano PDF
        </span>
      </div>
    );
  } else if (imgError) {
    thumbnailContent = (
      <div className="flex size-full items-center justify-center bg-paper-2">
        <svg
          aria-hidden="true"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-fg-subtle/50"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  } else {
    thumbnailContent = (
      <MediaImage
        alt={asset.altText}
        src={asset.previewUrl}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  // ── Render thumbnail ───────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-card border border-border-default bg-bg-surface",
        "aspect-[4/3]",
      )}
    >
      {thumbnailContent}

      {/* Cover badge */}
      {isCover && (
        <div
          className={cn(
            "absolute left-2 top-2 z-10",
            "rounded-pill bg-accent-default px-2 py-0.5",
            "font-sans text-[10px] font-medium uppercase tracking-[0.08em] text-fg-on-inverted",
          )}
        >
          Portada
        </div>
      )}

      {/* Hover overlay — actions */}
      <div
        className={cn(
          "absolute inset-0 z-10",
          "flex items-end justify-center gap-2 p-2",
          "bg-gradient-to-t from-ink/70 via-ink/20 to-transparent",
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          TRANSITION_CLS,
        )}
      >
        {/* Set as cover (only for IMAGE_GALLERY and when not already cover) */}
        {canBeCover && !isCover && (
          <button
            type="button"
            aria-label="Marcar como portada"
            onClick={handleSetCover}
            className={cn(
              "inline-flex items-center gap-1.5",
              "rounded-pill bg-white/20 px-2.5 py-1",
              "font-sans text-[11px] font-medium text-white backdrop-blur-sm",
              TRANSITION_CLS,
              FOCUS_VISIBLE_CLS,
              "hover:bg-accent-default hover:backdrop-blur-none",
            )}
          >
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Portada
          </button>
        )}

        {/* Delete */}
        <button
          type="button"
          aria-label="Eliminar archivo"
          onClick={handleDelete}
          className={cn(
            "inline-flex items-center gap-1.5",
            "rounded-pill bg-white/20 px-2.5 py-1",
            "font-sans text-[11px] font-medium text-white backdrop-blur-sm",
            TRANSITION_CLS,
            FOCUS_VISIBLE_CLS,
            "hover:bg-status-danger-default hover:backdrop-blur-none",
          )}
        >
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Eliminar
        </button>
      </div>
    </div>
  );
}
