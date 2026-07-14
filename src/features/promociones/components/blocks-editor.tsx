"use client";

import { useState, useCallback, useMemo } from "react";
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
import { contentBlockSchema } from "@/shared/types/content-block-schema";
import { CONTENT_BLOCK_TYPES } from "@/shared/constants/db-enums";
import type { ContentBlockType } from "@/shared/constants/db-enums";
import {
  upsertContentBlockAction,
  deleteContentBlockAction,
  reorderContentBlocksAction,
} from "../actions/content-blocks.actions";
import { BlockFormDescripcion } from "./block-form-descripcion";
import type { DescripcionPayload } from "./block-form-descripcion";
import { BlockFormCalidades } from "./block-form-calidades";
import type { CalidadesPayload } from "./block-form-calidades";
import { BlockFormZonas } from "./block-form-zonas";
import type { ZonasPayload } from "./block-form-zonas";
import { BlockFormUbicacion } from "./block-form-ubicacion";
import type { UbicacionPayload } from "./block-form-ubicacion";
import { BlockFormPlazos } from "./block-form-plazos";
import type { PlazosPayload } from "./block-form-plazos";

/**
 * Converts a dnd-kit transform to a CSS transform string.
 * Avoids the dependency on @dnd-kit/utilities.
 */
function transformToString(transform: { x: number; y: number; scaleX: number; scaleY: number } | null): string {
  if (!transform) return "";
  return `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockEditorItem {
  id: string;
  blockType: ContentBlockType;
  payload: Record<string, unknown>;
  sortOrder: number;
}

export interface BlocksEditorProps {
  promocionId: string;
  kind: "portfolio" | "external";
  initialBlocks: BlockEditorItem[];
}

// ---------------------------------------------------------------------------
// Block type helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared CSS class strings (extracted to avoid sonarjs/no-duplicate-string)
// ---------------------------------------------------------------------------

const FOCUS_VISIBLE_CLS = "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2";
const TRANSITION_CLS = "transition-colors duration-standard ease-standard";

const BLOCK_TYPE_LABELS: Record<ContentBlockType, string> = {
  DESCRIPCION_GENERAL: "Descripción general",
  MEMORIA_CALIDADES: "Memoria de calidades",
  ZONAS_COMUNES: "Zonas comunes",
  UBICACION_SERVICIOS: "Ubicación y servicios",
  PLAZOS_GARANTIAS: "Plazos y garantías",
};

/** Block types available for kind='external'. */
const EXTERNAL_BLOCK_TYPES: ContentBlockType[] = [
  "DESCRIPCION_GENERAL",
  "MEMORIA_CALIDADES",
  "UBICACION_SERVICIOS",
];

/** Block types available for kind='portfolio'. */
const PORTFOLIO_BLOCK_TYPES: ContentBlockType[] = [
  ...CONTENT_BLOCK_TYPES,
];

// ---------------------------------------------------------------------------
// SortableBlock wrapper
// ---------------------------------------------------------------------------

interface SortableBlockProps {
  block: BlockEditorItem;
  isSaving: boolean;
  onPayloadChange: (id: string, payload: Record<string, unknown>) => void;
  onSave: (block: BlockEditorItem) => Promise<void>;
  onDelete: (id: string) => void;
  savingId: string | null;
  fieldErrors: Record<string, Record<string, string>>;
  isDragDisabled: boolean;
}

function SortableBlock({
  block,
  isSaving,
  onPayloadChange,
  onSave,
  onDelete,
  savingId,
  fieldErrors,
  isDragDisabled,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: isDragDisabled });

  const style = {
    transform: transformToString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-card border bg-bg-surface",
        isDragging
          ? "border-accent-default opacity-70 shadow-lg"
          : "border-border-default",
      )}
    >
      {/* Block header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <button
            type="button"
            aria-label="Arrastrar para reordenar"
            suppressHydrationWarning
            className={cn(
              "cursor-grab touch-none text-fg-subtle transition-colors duration-standard ease-standard",
              "hover:text-fg-default",
              FOCUS_VISIBLE_CLS,
              isDragDisabled && "cursor-not-allowed opacity-30",
            )}
            {...attributes}
            {...listeners}
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
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

          <span className="font-sans text-sm font-medium text-fg-default">
            {BLOCK_TYPE_LABELS[block.blockType]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={savingId === block.id}
            onClick={() => onSave(block)}
            className={cn(
              "rounded-pill bg-accent-default px-3 py-1 font-sans text-xs font-medium text-fg-on-inverted",
              TRANSITION_CLS,
              "hover:bg-accent-hover",
              FOCUS_VISIBLE_CLS,
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {savingId === block.id ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button"
            disabled={savingId === block.id}
            onClick={() => onDelete(block.id)}
            className={cn(
              "font-sans text-sm text-status-danger-default underline underline-offset-4",
              TRANSITION_CLS,
              "hover:text-accent-hover",
              FOCUS_VISIBLE_CLS,
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Block form body */}
      <div className="p-4">
        <BlockFormForType
          blockType={block.blockType}
          payload={block.payload as BlockFormPayload}
          errors={fieldErrors[block.id] ?? {}}
          disabled={savingId === block.id || isSaving}
          onChange={(newPayload) => onPayloadChange(block.id, newPayload as Record<string, unknown>)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BlockFormForType — renders the correct form based on block type
// ---------------------------------------------------------------------------

type BlockFormPayload =
  | DescripcionPayload
  | CalidadesPayload
  | ZonasPayload
  | UbicacionPayload
  | PlazosPayload;

interface BlockFormForTypeProps {
  blockType: ContentBlockType;
  payload: BlockFormPayload;
  errors: Record<string, string>;
  disabled: boolean;
  onChange: (payload: BlockFormPayload) => void;
}

function BlockFormForType({
  blockType,
  payload,
  errors,
  disabled,
  onChange,
}: BlockFormForTypeProps) {
  switch (blockType) {
    case "DESCRIPCION_GENERAL":
      return (
        <BlockFormDescripcion
          value={payload as DescripcionPayload}
          errors={errors}
          disabled={disabled}
          onChange={(newPayload) => onChange(newPayload)}
        />
      );
    case "MEMORIA_CALIDADES":
      return (
        <BlockFormCalidades
          value={payload as CalidadesPayload}
          errors={errors}
          disabled={disabled}
          onChange={(newPayload) => onChange(newPayload)}
        />
      );
    case "ZONAS_COMUNES":
      return (
        <BlockFormZonas
          value={payload as ZonasPayload}
          errors={errors}
          disabled={disabled}
          onChange={(newPayload) => onChange(newPayload)}
        />
      );
    case "UBICACION_SERVICIOS":
      return (
        <BlockFormUbicacion
          value={payload as UbicacionPayload}
          errors={errors}
          disabled={disabled}
          onChange={(newPayload) => onChange(newPayload)}
        />
      );
    case "PLAZOS_GARANTIAS":
      return (
        <BlockFormPlazos
          value={payload as PlazosPayload}
          errors={errors}
          disabled={disabled}
          onChange={(newPayload) => onChange(newPayload)}
        />
      );
    default:
      return (
        <p className="font-sans text-sm text-status-danger-default">
          Tipo de bloque no soportado: {blockType}
        </p>
      );
  }
}

// ---------------------------------------------------------------------------
// Client-side Zod validation helper
// ---------------------------------------------------------------------------

/**
 * Validates a block's payload against the Zod schema for its block type.
 * Returns field-level errors keyed by path (e.g. "items.0.title").
 */
function validateBlockPayload(
  blockType: ContentBlockType,
  payload: Record<string, unknown>,
): Record<string, string> {
  const result = contentBlockSchema.safeParse({
    blockType,
    payload,
  });

  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    // Only keep the first error per path
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// BlocksEditor
// ---------------------------------------------------------------------------

const INITIAL_BLOCK_FORM: Record<ContentBlockType, Record<string, unknown>> = {
  DESCRIPCION_GENERAL: { text: "" },
  MEMORIA_CALIDADES: { items: [] },
  ZONAS_COMUNES: { items: [] },
  UBICACION_SERVICIOS: { items: [] },
  PLAZOS_GARANTIAS: {},
};

/**
 * BlocksEditor — editor de bloques editoriales para promociones.
 *
 * Client component que gestiona el CRUD de bloques editoriales:
 * - Lista de bloques existentes ordenados por sort_order
 * - Botón "Añadir bloque" con selector de tipo (T018)
 * - Formulario específico por tipo de bloque (T013-T017)
 * - Guardar / Eliminar por bloque (T018)
 * - Filtro por kind (T021)
 * - Drag & drop con @dnd-kit/sortable (T026-T027)
 * - Validación Zod client-side (T028)
 * - Estados: loading, empty, error
 *
 * **A11y:**
 * - Drag handle con aria-label
 * - Botones con estados deshabilitados durante guardado
 * - Errores con role="alert" y aria-live
 * - focus-visible en todos los interactivos
 * - aria-live="polite" en feedback global
 */
export function BlocksEditor({
  promocionId,
  kind,
  initialBlocks,
}: BlocksEditorProps) {
  // ── Block types available for this kind ───────────────────────────────
  const availableTypes = useMemo(
    () =>
      kind === "external" ? EXTERNAL_BLOCK_TYPES : PORTFOLIO_BLOCK_TYPES,
    [kind],
  );

  // Filter initial blocks to only those allowed by kind
  const filteredInitial = useMemo(
    () => initialBlocks.filter((b) => availableTypes.includes(b.blockType)),
    [initialBlocks, availableTypes],
  );

  // ── State ─────────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<BlockEditorItem[]>(filteredInitial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [addingBlock, setAddingBlock] = useState<ContentBlockType | null>(
    null,
  );

  // ── Drag state ────────────────────────────────────────────────────────
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Derived state ─────────────────────────────────────────────────────
  const isSaving = savingId !== null || isReordering;

  // ── Block type selector: types not yet added ──────────────────────────
  const usedTypes = useMemo(
    () => new Set(blocks.map((b) => b.blockType)),
    [blocks],
  );
  const addableTypes = availableTypes.filter((t) => !usedTypes.has(t));

  // ── Handlers ──────────────────────────────────────────────────────────

  /** Update local payload for a block (without saving). */
  const handlePayloadChange = useCallback(
    (blockId: string, newPayload: Record<string, unknown>) => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, payload: newPayload } : b,
        ),
      );
      // Clear field errors for this block when user edits
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[blockId];
        return next;
      });
      // Clear global feedback
      setGlobalError(null);
      setSuccessMsg(null);
    },
    [],
  );

  /** Save a single block: validate client-side, then call server action. */
  const handleSave = useCallback(
    async (block: BlockEditorItem) => {
      // Client-side Zod validation (T028)
      const errors = validateBlockPayload(block.blockType, block.payload);
      if (Object.keys(errors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, [block.id]: errors }));
        setGlobalError("Corrige los errores antes de guardar");
        return;
      }

      setSavingId(block.id);
      setGlobalError(null);
      setSuccessMsg(null);

      const result = await upsertContentBlockAction(
        promocionId,
        block.blockType,
        block.payload,
      );

      setSavingId(null);

      if (!result.success) {
        setGlobalError(result.error ?? "Error al guardar el bloque");
        return;
      }

      if (result.block) {
        // Update local state with server-returned id
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id
              ? { ...b, id: result.block!.id, sortOrder: result.block!.sortOrder }
              : b,
          ),
        );
      }

      setSuccessMsg(`${BLOCK_TYPE_LABELS[block.blockType]} guardado correctamente`);
    },
    [promocionId],
  );

  /** Delete a single block with confirmation. */
  const handleDelete = useCallback(
    async (blockId: string) => {
      if (
        !window.confirm(
          "¿Estás seguro de que quieres eliminar este bloque? Esta acción no se puede deshacer.",
        )
      ) {
        return;
      }

      setSavingId(blockId);
      setGlobalError(null);
      setSuccessMsg(null);

      const result = await deleteContentBlockAction(promocionId, blockId);

      setSavingId(null);

      if (!result.success) {
        setGlobalError(result.error ?? "Error al eliminar el bloque");
        return;
      }

      // Remove from local state
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[blockId];
        return next;
      });
      setSuccessMsg("Bloque eliminado correctamente");
    },
    [promocionId],
  );

  /** Add a new empty block of the selected type. */
  const handleAddBlock = useCallback(
    (blockType: ContentBlockType) => {
      // Check if already exists
      if (usedTypes.has(blockType)) {
        setGlobalError(
          `Ya existe un bloque de tipo "${BLOCK_TYPE_LABELS[blockType]}"`,
        );
        return;
      }

      const newBlock: BlockEditorItem = {
        id: `new-${blockType}-${Date.now()}`,
        blockType,
        payload: { ...INITIAL_BLOCK_FORM[blockType] },
        sortOrder: blocks.length + 1,
      };

      setBlocks((prev) => [...prev, newBlock]);
      setAddingBlock(null);
      setGlobalError(null);
      setSuccessMsg(null);
    },
    [blocks, usedTypes],
  );

  /** Handle drag end: reorder blocks and persist. */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // Reorder local state
      const reordered = [...blocks];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved!);

      setBlocks(reordered);
      setIsReordering(true);

      // Persist new order
      const orderedIds = reordered.map((b) => b.id);

      // Filter out temporary IDs (new unsaved blocks)
      const persistentIds = orderedIds.filter((id) => !id.startsWith("new-"));

      if (persistentIds.length > 0) {
        const result = await reorderContentBlocksAction(
          promocionId,
          persistentIds,
        );

        if (!result.success) {
          setGlobalError(result.error ?? "Error al reordenar los bloques");
        }
      }

      setIsReordering(false);
    },
    [blocks, promocionId],
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section aria-labelledby="blocks-editor-heading">
      {/* Section header */}
      <div className="mb-6">
        <h2
          id="blocks-editor-heading"
          className="font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default"
        >
          Bloques editoriales
        </h2>
        <p className="mt-1 font-sans text-sm text-fg-subtle">
          Añade contenido estructurado a la ficha de esta promoción: descripción,
          calidades, zonas comunes, ubicación y plazos.
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

      {/* Block type selector */}
      <div className="mb-6">
        {addableTypes.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-sm text-fg-subtle">
              Añadir bloque:
            </span>
            <div className="relative">
              <select
                value={addingBlock ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddingBlock(
                    val ? (val as ContentBlockType) : null,
                  );
                }}
                className={cn(
                  "rounded-control border border-border-default bg-bg-surface px-3 py-1.5 font-sans text-sm text-fg-default",
                  TRANSITION_CLS,
                  "hover:border-border-strong",
                  "focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2",
                )}
                aria-label="Seleccionar tipo de bloque"
              >
                <option value="">Seleccionar tipo…</option>
                {addableTypes.map((t) => (
                  <option key={t} value={t}>
                    {BLOCK_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                disabled={!addingBlock || isSaving}
                onClick={() => {
                  if (addingBlock) handleAddBlock(addingBlock);
                }}
                className="ml-2 px-3 py-1.5 text-xs"
              >
                + Añadir
              </Button>
            </div>
          </div>
        ) : (
          <p className="font-sans text-sm text-fg-subtle">
            Todos los tipos de bloque disponibles ya han sido añadidos.
          </p>
        )}
      </div>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div className="rounded-card border border-dashed border-border-default p-8 text-center">
          <p className="mb-2 font-display text-[19px] font-medium text-fg-muted">
            Aún no has añadido ningún bloque
          </p>
          <p className="font-sans text-sm text-fg-subtle">
            Selecciona un tipo de bloque arriba y pulsa "Añadir" para
            empezar a crear contenido editorial para esta promoción.
          </p>
        </div>
      )}

      {/* Block list with drag & drop */}
      {blocks.length > 0 && (
        <DndContext
          id="blocks-editor-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSaving={isSaving}
                  savingId={savingId}
                  fieldErrors={fieldErrors}
                  isDragDisabled={isSaving}
                  onPayloadChange={handlePayloadChange}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Block validation summary (for publish blocking, T031) */}
      {Object.keys(fieldErrors).length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-6 rounded-card border border-status-danger-default bg-status-danger-subtle p-4"
        >
          <p className="mb-2 font-sans text-sm font-medium text-status-danger-default">
            Hay bloques con datos inválidos. Revisa los errores antes de
            publicar:
          </p>
          <ul className="list-inside list-disc space-y-1">
            {blocks
              .filter((b) => fieldErrors[b.id])
              .map((b) => (
                <li
                  key={b.id}
                  className="font-sans text-sm text-status-danger-default"
                >
                  <span className="font-medium">
                    {BLOCK_TYPE_LABELS[b.blockType]}
                  </span>
                  : {Object.values(fieldErrors[b.id] ?? {}).join(", ")}
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Re-export for use in PromocionForm integration
// ---------------------------------------------------------------------------

export type { ContentBlockType };
