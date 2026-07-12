"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  type DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
import {
  MediaUploadDialog,
  type MediaAssetItem,
} from "./media-upload-dialog";
import { MediaPreview } from "./media-preview";
import {
  reorderMediaAction,
  deleteMediaAction,
  setCoverAction,
} from "../actions/media.actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { MediaAssetItem } from "./media-upload-dialog";

export interface MediaGalleryProps {
  promocionId: string;
  initialGalleryAssets: MediaAssetItem[];
  initialPlanAssets: MediaAssetItem[];
}

// ---------------------------------------------------------------------------
// CSS helpers (extracted to avoid sonarjs/no-duplicate-string)
// ---------------------------------------------------------------------------

const TRANSITION_CLS = "transition-colors duration-standard ease-standard";
const FOCUS_VISIBLE_CLS =
  "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2";

// ---------------------------------------------------------------------------
// transformToString — converts dnd-kit transform to CSS transform string
// ---------------------------------------------------------------------------

function transformToString(
  transform: {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
  } | null,
): string {
  if (!transform) return "";
  return `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

// ---------------------------------------------------------------------------
// SortableMediaCard — draggable wrapper for MediaPreview
// ---------------------------------------------------------------------------

interface SortableMediaCardProps {
  asset: MediaAssetItem;
  canBeCover: boolean;
  onDelete: (assetId: string) => void;
  onSetCover: (assetId: string) => void;
  isDragDisabled: boolean;
}

function SortableMediaCard({
  asset,
  canBeCover,
  onDelete,
  onSetCover,
  isDragDisabled,
}: SortableMediaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: asset.id, disabled: isDragDisabled });

  const style = {
    transform: transformToString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "z-10 opacity-80",
      )}
    >
      {/* Drag handle — pinned top-left */}
      <div className="relative">
        <button
          type="button"
          aria-label="Arrastrar para reordenar"
          suppressHydrationWarning
          className={cn(
            "absolute left-2 top-2 z-20",
            "cursor-grab touch-none rounded-pill bg-ink/50 p-1 text-white backdrop-blur-sm",
            TRANSITION_CLS,
            FOCUS_VISIBLE_CLS,
            "hover:bg-ink/70",
            isDragDisabled && "cursor-not-allowed opacity-30",
          )}
          {...attributes}
          {...listeners}
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

        <MediaPreview
          asset={asset}
          canBeCover={canBeCover}
          isCover={asset.isCover}
          onDelete={onDelete}
          onSetCover={onSetCover}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MediaSection — one section (Galería or Planos) with its own DnD context
// ---------------------------------------------------------------------------

interface MediaSectionProps {
  title: string;
  description: string;
  emptyMessage: string;
  uploadLabel: string;
  assets: MediaAssetItem[];
  canBeCover: boolean;
  isReordering: boolean;
  onUpload: () => void;
  onDelete: (assetId: string) => void;
  onSetCover: (assetId: string) => void;
  onReorderEnd: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
}

function MediaSection({
  title,
  description,
  emptyMessage,
  uploadLabel,
  assets,
  canBeCover,
  isReordering,
  onUpload,
  onDelete,
  onSetCover,
  onReorderEnd,
  sensors,
}: MediaSectionProps) {
  const assetIds = useMemo(() => assets.map((a) => a.id), [assets]);

  return (
    <div>
      {/* Section header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-display text-[17px] font-medium tracking-[-0.01em] text-fg-default">
            {title}
          </h3>
          <p className="mt-0.5 font-sans text-sm text-fg-subtle">
            {description}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={isReordering}
          onClick={onUpload}
          className="px-3 py-1.5 text-xs"
        >
          + {uploadLabel}
        </Button>
      </div>

      {/* Assets grid */}
      {assets.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-default p-8 text-center">
          <p className="font-sans text-sm text-fg-muted">{emptyMessage}</p>
        </div>
      ) : (
        <DndContext
          id="media-gallery-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onReorderEnd}
        >
          <SortableContext
            items={assetIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {assets.map((asset) => (
                <SortableMediaCard
                  key={asset.id}
                  asset={asset}
                  canBeCover={canBeCover}
                  isDragDisabled={isReordering}
                  onDelete={onDelete}
                  onSetCover={onSetCover}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MediaGallery
// ---------------------------------------------------------------------------

/**
 * MediaGallery — gestor de medios (imágenes de galería + planos) para
 * el backoffice de promociones.
 *
 * Dos secciones independientes:
 * 1. Galería (IMAGE_GALLERY) — imágenes que se muestran en la ficha pública
 * 2. Planos (PLAN) — planos de la promoción
 *
 * Funcionalidades:
 * - Subida de imágenes/planos mediante MediaUploadDialog
 * - Reordenación drag & drop (@dnd-kit/sortable)
 * - Marcado de portada (solo IMAGE_GALLERY)
 * - Eliminación con confirmación
 *
 * Estados: loading, empty (por sección), error (global).
 *
 * **A11y:**
 * - Drag handle con aria-label
 * - Botones con estados deshabilitados durante operaciones
 * - aria-live="polite" en feedback global
 * - focus-visible en todos los interactivos
 * - Secciones con aria-labelledby
 */
export function MediaGallery({
  promocionId,
  initialGalleryAssets,
  initialPlanAssets,
}: MediaGalleryProps) {
  // ── State ─────────────────────────────────────────────────────────────
  const [galleryAssets, setGalleryAssets] =
    useState<MediaAssetItem[]>(initialGalleryAssets);
  const [planAssets, setPlanAssets] =
    useState<MediaAssetItem[]>(initialPlanAssets);
  const [dialogKind, setDialogKind] = useState<
    "IMAGE_GALLERY" | "PLAN" | null
  >(null);
  const [isReorderingGallery, setIsReorderingGallery] = useState(false);
  const [isReorderingPlans, setIsReorderingPlans] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isReordering = isReorderingGallery || isReorderingPlans;

  // ── Sensors (shared config) ───────────────────────────────────────────
  const gallerySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const planSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Upload handler ────────────────────────────────────────────────────
  const handleUploaded = useCallback(
    (asset: MediaAssetItem) => {
      if (asset.kind === "IMAGE_GALLERY") {
        setGalleryAssets((prev) => [...prev, asset]);
      } else {
        setPlanAssets((prev) => [...prev, asset]);
      }
      setSuccessMsg("Archivo subido correctamente");
      setGlobalError(null);
    },
    [],
  );

  // ── Delete handler ────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (assetId: string) => {
      setGlobalError(null);
      setSuccessMsg(null);

      const result = await deleteMediaAction(promocionId, assetId);

      if (!result.success) {
        setGlobalError(result.error ?? "Error al eliminar el archivo");
        return;
      }

      // Remove from local state
      setGalleryAssets((prev) => prev.filter((a) => a.id !== assetId));
      setPlanAssets((prev) => prev.filter((a) => a.id !== assetId));
      setSuccessMsg("Archivo eliminado correctamente");
    },
    [promocionId],
  );

  // ── Set cover handler ─────────────────────────────────────────────────
  const handleSetCover = useCallback(
    async (assetId: string) => {
      setGlobalError(null);
      setSuccessMsg(null);

      const result = await setCoverAction(promocionId, assetId);

      if (!result.success) {
        setGlobalError(result.error ?? "Error al marcar portada");
        return;
      }

      // Update local state — unset all covers, then set this one
      setGalleryAssets((prev) =>
        prev.map((a) => ({
          ...a,
          isCover: a.id === assetId,
        })),
      );
      setSuccessMsg("Portada actualizada correctamente");
    },
    [promocionId],
  );

  // ── Reorder handler (gallery) ─────────────────────────────────────────
  const handleGalleryReorderEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = galleryAssets.findIndex((a) => a.id === active.id);
      const newIndex = galleryAssets.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...galleryAssets];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved!);

      setGalleryAssets(reordered);
      setIsReorderingGallery(true);
      setGlobalError(null);
      setSuccessMsg(null);

      const persistentIds = reordered.map((a) => a.id);
      const result = await reorderMediaAction(
        promocionId,
        "IMAGE_GALLERY",
        persistentIds,
      );

      if (!result.success) {
        setGlobalError(result.error ?? "Error al reordenar");
      }

      setIsReorderingGallery(false);
    },
    [galleryAssets, promocionId],
  );

  // ── Reorder handler (plans) ──────────────────────────────────────────
  const handlePlanReorderEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = planAssets.findIndex((a) => a.id === active.id);
      const newIndex = planAssets.findIndex((a) => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...planAssets];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved!);

      setPlanAssets(reordered);
      setIsReorderingPlans(true);
      setGlobalError(null);
      setSuccessMsg(null);

      const persistentIds = reordered.map((a) => a.id);
      const result = await reorderMediaAction(
        promocionId,
        "PLAN",
        persistentIds,
      );

      if (!result.success) {
        setGlobalError(result.error ?? "Error al reordenar");
      }

      setIsReorderingPlans(false);
    },
    [planAssets, promocionId],
  );

  // ── Clear feedback after timeout ─────────────────────────────────────
  useEffect(() => {
    if (!globalError && !successMsg) return;

    const timer = setTimeout(() => {
      setGlobalError(null);
      setSuccessMsg(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [globalError, successMsg]);

  // ── Render ────────────────────────────────────────────────────────────

  const sectionHeadingId = "media-gallery-heading";

  return (
    <section aria-labelledby={sectionHeadingId}>
      {/* Section header */}
      <div className="mb-6">
        <h2
          id={sectionHeadingId}
          className="font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default"
        >
          Medios
        </h2>
        <p className="mt-1 font-sans text-sm text-fg-subtle">
          Gestiona las imágenes y planos de esta promoción. Las imágenes de
          galería aparecerán en la ficha pública de la promoción.
        </p>
      </div>

      {/* Global feedback */}
      {globalError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 rounded-card border border-status-danger-default bg-status-danger-subtle p-4 font-sans text-sm text-status-danger-default"
        >
          {globalError}
        </div>
      )}
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-card border border-status-success-default bg-status-success-subtle p-4 font-sans text-sm text-status-success-default"
        >
          {successMsg}
        </div>
      )}

      {/* Galería section */}
      <div className="mb-8">
        <MediaSection
          title="Galería"
          description="Imágenes que se muestran en la ficha pública"
          emptyMessage="Aún no has subido imágenes"
          uploadLabel="Subir imagen"
          assets={galleryAssets}
          canBeCover={true}
          isReordering={isReordering}
          onUpload={() => setDialogKind("IMAGE_GALLERY")}
          onDelete={handleDelete}
          onSetCover={handleSetCover}
          onReorderEnd={handleGalleryReorderEnd}
          sensors={gallerySensors}
        />
      </div>

      {/* Planos section */}
      <MediaSection
        title="Planos"
        description="Planos de la promoción"
        emptyMessage="Aún no has subido planos"
        uploadLabel="Subir plano"
        assets={planAssets}
        canBeCover={false}
        isReordering={isReordering}
        onUpload={() => setDialogKind("PLAN")}
        onDelete={handleDelete}
        onSetCover={handleSetCover}
        onReorderEnd={handlePlanReorderEnd}
        sensors={planSensors}
      />

      {/* Upload dialog */}
      {dialogKind && (
        <MediaUploadDialog
          promocionId={promocionId}
          open={true}
          initialKind={dialogKind}
          onClose={() => setDialogKind(null)}
          onUploaded={handleUploaded}
        />
      )}
    </section>
  );
}
