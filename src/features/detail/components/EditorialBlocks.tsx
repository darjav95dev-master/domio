import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";
import { BlockDescripcion } from "./BlockDescripcion";
import { BlockCalidades } from "./BlockCalidades";
import { BlockZonasComunes } from "./BlockZonasComunes";
import { BlockUbicacion } from "./BlockUbicacion";
import { BlockPlazos } from "./BlockPlazos";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EditorialBlocksProps {
  promocion: PromocionDetail;
}

/**
 * Maps block_type to its display order and label for the section header.
 * Establishes canonical ordering: descripción, calidades, zonas comunes,
 * ubicación, plazos.
 */
const BLOCK_ORDER: Record<
  string,
  { order: number; label: string; eyebrow: string }
> = {
  DESCRIPCION_GENERAL: {
    order: 1,
    label: "Descripción",
    eyebrow: "El inmueble",
  },
  MEMORIA_CALIDADES: {
    order: 2,
    label: "Calidades",
    eyebrow: "Acabados",
  },
  ZONAS_COMUNES: {
    order: 3,
    label: "Zonas comunes",
    eyebrow: "Instalaciones",
  },
  UBICACION_SERVICIOS: {
    order: 4,
    label: "Ubicación",
    eyebrow: "Entorno",
  },
  PLAZOS_GARANTIAS: {
    order: 5,
    label: "Plazos",
    eyebrow: "Garantías",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determines if a content block should be rendered based on promotion kind.
 * ZONAS_COMUNES and PLAZOS_GARANTIAS are only valid for portfolio promotions.
 */
export function shouldRenderBlock(
  blockType: string,
  kind: string,
): boolean {
  return !(
    (blockType === "ZONAS_COMUNES" || blockType === "PLAZOS_GARANTIAS") &&
    kind !== "portfolio"
  );
}

// ---------------------------------------------------------------------------
// Block renderer mapping
// ---------------------------------------------------------------------------

function renderBlock(block: PromocionDetail["contentBlocks"][number]) {
  switch (block.blockType) {
    case "DESCRIPCION_GENERAL":
      return <BlockDescripcion block={block} />;
    case "MEMORIA_CALIDADES":
      return <BlockCalidades block={block} />;
    case "ZONAS_COMUNES":
      return <BlockZonasComunes block={block} />;
    case "UBICACION_SERVICIOS":
      return <BlockUbicacion block={block} />;
    case "PLAZOS_GARANTIAS":
      return <BlockPlazos block={block} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Typed block info
// ---------------------------------------------------------------------------

interface TypedBlock {
  block: PromocionDetail["contentBlocks"][number];
  meta: { order: number; label: string; eyebrow: string };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * EditorialBlocks iterator.
 * Iterates over all content blocks, filters by kind constraint,
 * orders them canonically, and delegates to the appropriate
 * sub-component for each block_type.
 *
 * Each block is wrapped in a section with an eyebrow + heading.
 */
export function EditorialBlocks({ promocion }: EditorialBlocksProps) {
  const { contentBlocks, kind } = promocion;

  // Filter and type blocks
  const typedBlocks: TypedBlock[] = contentBlocks
    .filter((b) => shouldRenderBlock(b.blockType, kind))
    .map((block) => ({
      block,
      meta: BLOCK_ORDER[block.blockType] ?? {
        order: 99,
        label: block.blockType,
        eyebrow: "",
      },
    }))
    .sort((a, b) => a.meta.order - b.meta.order);

  if (typedBlocks.length === 0) return null;

  return (
    <div className="space-y-section-md">
      {typedBlocks.map(({ block, meta }) => (
        <section key={block.id} aria-labelledby={`block-${block.id}-title`}>
          {/* Section header */}
          <div className="mb-6">
            {meta.eyebrow && (
              <p className="relative mb-3 pl-10 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent-default before:absolute before:left-0 before:top-1/2 before:h-px before:w-8 before:-translate-y-1/2 before:bg-[linear-gradient(90deg,var(--accent-default),transparent)]">
                {meta.eyebrow}
              </p>
            )}
            <h2
              id={`block-${block.id}-title`}
              className="font-display text-[clamp(28px,3.2vw,40px)] font-normal tracking-[-0.035em] leading-[1.05] text-fg-default"
            >
              {meta.label}
            </h2>
          </div>

          {/* Block content */}
          <div>{renderBlock(block)}</div>
        </section>
      ))}
    </div>
  );
}
