"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
import { ALT_TEXT_MAX_LENGTH } from "@/shared/types/media-schema";
import { uploadMediaAction } from "../actions/media.actions";

// ---------------------------------------------------------------------------
// Shared type — used by MediaGallery and MediaPreview
// ---------------------------------------------------------------------------

export interface MediaAssetItem {
  id: string;
  r2Key: string;
  kind: string;
  altText: string;
  sortOrder: number;
  isCover: boolean;
  previewUrl: string;
  mimeType?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KIND_OPTIONS = [
  { value: "IMAGE_GALLERY", label: "Imagen de galería" },
  { value: "PLAN", label: "Plano" },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaUploadDialogProps {
  promocionId: string;
  open: boolean;
  onClose: () => void;
  onUploaded: (asset: MediaAssetItem) => void;
  /** Restrict to a specific kind. Default: allow both. */
  initialKind?: "IMAGE_GALLERY" | "PLAN";
}

type UploadState = "idle" | "uploading" | "success" | "error";

// ---------------------------------------------------------------------------
// CSS helpers (extracted to avoid sonarjs/no-duplicate-string)
// ---------------------------------------------------------------------------

const TRANSITION_CLS =
  "transition-colors duration-standard ease-standard";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MediaUploadDialog — diálogo modal para subir un asset multimedia.
 *
 * Estados: idle → uploading → success | error
 *
 * **A11y:**
 * - role="dialog", aria-modal, aria-labelledby
 * - Focus atrapado dentro del modal
 * - Escape cierra el diálogo
 * - aria-describedby en el input file
 * - aria-live="polite" en mensajes de error
 */
export function MediaUploadDialog({
  promocionId,
  open,
  onClose,
  onUploaded,
  initialKind,
}: MediaUploadDialogProps) {
  // ── Refs ───────────────────────────────────────────────────────────────
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileLabelId = "media-upload-file-label";
  const altTextErrorId = "media-upload-alt-text-error";
  const feedbackId = "media-upload-feedback";
  const headingId = "media-upload-heading";

  // ── State ──────────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [kind, setKind] = useState<"IMAGE_GALLERY" | "PLAN">(
    initialKind ?? "IMAGE_GALLERY",
  );
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [altTextError, setAltTextError] = useState<string | null>(null);

  // ── Reset state when dialog opens ──────────────────────────────────────
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setAltText("");
      setKind(initialKind ?? "IMAGE_GALLERY");
      setUploadState("idle");
      setErrorMsg(null);
      setAltTextError(null);
    }
  }, [open, initialKind]);

  // ── Keyboard: Escape closes ───────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // ── Focus trap: keep focus inside dialog ──────────────────────────────
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const firstFocusable = dialogRef.current.querySelector<HTMLElement>(
      "button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    firstFocusable?.focus();
  }, [open]);

  // ── File selection handler ─────────────────────────────────────────────
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      // Clear any previous error
      setErrorMsg(null);
    }
  }, []);

  // ── Client-side validation ────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    let valid = true;

    // alt_text required
    if (!altText.trim()) {
      setAltTextError("El texto alternativo es obligatorio");
      valid = false;
    } else if (altText.trim().length > ALT_TEXT_MAX_LENGTH) {
      setAltTextError(
        `El texto alternativo no puede exceder ${ALT_TEXT_MAX_LENGTH} caracteres`,
      );
      valid = false;
    } else {
      setAltTextError(null);
    }

    // File required
    if (!selectedFile) {
      setErrorMsg("Debes seleccionar un archivo");
      valid = false;
    }

    return valid;
  }, [altText, selectedFile]);

  // ── Submit handler ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      if (!selectedFile) return;

      setUploadState("uploading");
      setErrorMsg(null);

      const result = await uploadMediaAction(
        promocionId,
        kind,
        selectedFile,
        altText.trim(),
      );

      if (!result.success) {
        setUploadState("error");
        setErrorMsg(result.error ?? "Error al subir el archivo");

        // Map server-side field errors
        if (result.issues) {
          for (const issue of result.issues) {
            if (issue.path === "altText") {
              setAltTextError(issue.message);
            }
          }
        }
        return;
      }

      setUploadState("success");

      // Build the asset item from the returned asset + previewUrl
      const assetItem: MediaAssetItem = {
        id: result.asset.id,
        r2Key: result.asset.r2Key,
        kind: result.asset.kind,
        altText: result.asset.altText,
        sortOrder: result.asset.sortOrder,
        isCover: result.asset.isCover ?? false,
        previewUrl: result.previewUrl,
        mimeType: result.asset.mimeType,
      };

      // Brief delay to show success state
      setTimeout(() => {
        onUploaded(assetItem);
        onClose();
      }, 600);
    },
    [promocionId, kind, selectedFile, altText, validate, onUploaded, onClose],
  );

  // ── Determine allowed MIME types ───────────────────────────────────────
  const acceptMime =
    kind === "PLAN"
      ? "image/png,image/jpeg,image/webp,application/pdf"
      : "image/png,image/jpeg,image/webp";

  // ── Render ─────────────────────────────────────────────────────────────
  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className={cn(
          "relative z-10 w-full max-w-md",
          "rounded-surface border border-border-default bg-bg-surface p-6",
          "shadow-[0_24px_48px_rgba(26,20,16,0.15)]",
        )}
      >
        {/* Heading */}
        <h2
          id={headingId}
          className="font-display text-[19px] font-medium tracking-[-0.015em] text-fg-default"
        >
          {kind === "PLAN" ? "Subir plano" : "Subir imagen"}
        </h2>
        <p className="mt-1 font-sans text-sm text-fg-subtle">
          {kind === "PLAN"
            ? "Añade un plano de la promoción."
            : "Añade una imagen a la galería de la promoción."}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Kind selector (only if not restricted by initialKind) */}
          {!initialKind && (
            <div>
              <label
                htmlFor="media-kind"
                className="mb-1.5 block font-sans text-sm font-medium text-fg-default"
              >
                Tipo
              </label>
              <select
                id="media-kind"
                value={kind}
                disabled={uploadState === "uploading"}
                onChange={(e) =>
                  setKind(e.target.value as "IMAGE_GALLERY" | "PLAN")
                }
                className={cn(
                  "w-full rounded-control border border-border-default bg-bg-surface px-3 py-2 font-sans text-sm text-fg-default",
                  TRANSITION_CLS,
                  "hover:border-border-strong",
                  "focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File input */}
          <div>
            <span
              id={fileLabelId}
              className="mb-1.5 block font-sans text-sm font-medium text-fg-default"
            >
              Archivo
            </span>
            <label
              htmlFor="media-file-input"
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2",
                "rounded-control border-2 border-dashed border-border-default px-4 py-6",
                TRANSITION_CLS,
                "hover:border-accent-default hover:bg-accent-subtle",
                selectedFile && "border-accent-default bg-accent-subtle",
                uploadState === "uploading" && "pointer-events-none opacity-50",
              )}
            >
              {selectedFile ? (
                <span className="font-sans text-sm text-fg-default">
                  {selectedFile.name}
                </span>
              ) : (
                <span className="font-sans text-sm text-fg-subtle">
                  Haz clic para seleccionar un archivo
                </span>
              )}
            </label>
            <input
              ref={fileInputRef}
              id="media-file-input"
              type="file"
              accept={acceptMime}
              disabled={uploadState === "uploading"}
              aria-describedby={fileLabelId}
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>

          {/* Alt text */}
          <div>
            <label
              htmlFor="media-alt-text"
              className="mb-1.5 block font-sans text-sm font-medium text-fg-default"
            >
              Texto alternativo{" "}
              <span aria-label="obligatorio" className="text-status-danger-default">
                *
              </span>
            </label>
            <textarea
              id="media-alt-text"
              value={altText}
              disabled={uploadState === "uploading"}
              rows={3}
              aria-describedby={altTextError ? altTextErrorId : undefined}
              aria-invalid={!!altTextError}
              placeholder="Describe la imagen para accesibilidad..."
              onChange={(e) => {
                setAltText(e.target.value);
                if (altTextError) setAltTextError(null);
              }}
              className={cn(
                "w-full rounded-control border border-border-default bg-bg-surface px-3 py-2 font-sans text-sm text-fg-default placeholder:text-fg-subtle/60",
                TRANSITION_CLS,
                "hover:border-border-strong",
                "focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                altTextError && "border-status-danger-default",
              )}
            />
            {altTextError && (
              <p
                id={altTextErrorId}
                role="alert"
                className="mt-1 font-sans text-xs text-status-danger-default"
              >
                {altTextError}
              </p>
            )}
          </div>

          {/* Global feedback */}
          {errorMsg && !altTextError && (
            <div
              id={feedbackId}
              role="alert"
              aria-live="polite"
              className="rounded-card border border-status-danger-default bg-status-danger-subtle p-3 font-sans text-sm text-status-danger-default"
            >
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={uploadState === "uploading"}
              onClick={onClose}
              className="px-4 py-2 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                uploadState === "uploading" || !selectedFile || !altText.trim()
              }
              className="px-4 py-2 text-sm"
            >
              {uploadState === "uploading" ? "Subiendo…" : "Subir"}
            </Button>
          </div>
        </form>

        {/* Success overlay */}
        {uploadState === "success" && (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "absolute inset-0 z-20 flex items-center justify-center",
              "rounded-surface bg-bg-surface",
              "animate-in fade-in duration-deliberate",
            )}
          >
            <div className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-status-success-subtle">
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-status-success-default"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-sans text-sm font-medium text-status-success-default">
                Archivo subido correctamente
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
