import type { ReactNode } from "react";
import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockCalidadesProps {
  block: PromocionContentBlock;
}

interface CalidadItem {
  title: string;
  description: string;
  icon?: string;
}

// ---------------------------------------------------------------------------
// Icon resolver — distinct line icons per calidad category, matching the
// reference where each memoria de calidades card has its own icon. Matched
// against the title (and optional icon keyword); falls back to a check mark.
// ---------------------------------------------------------------------------

const ICON_PATHS: Array<{ test: RegExp; path: ReactNode }> = [
  { test: /carpinter|ventana|window|puerta/, path: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18M12 3v18" /></> },
  { test: /fachada|aislamiento|sate/, path: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /> },
  { test: /suelo|floor|pavimento|tarima/, path: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></> },
  { test: /cocina|kitchen|encimera/, path: <><path d="M3 7h18" /><path d="M3 11h18" /><path d="M3 15h18" /></> },
  { test: /clima|aeroterm|calefac|aire|energ|therm/, path: <><circle cx="12" cy="14" r="6" /><path d="M12 2v6" /></> },
  { test: /sanitar|baño|bano|grifer|ducha|fontaner/, path: <><path d="M3 12c0-5 4-9 9-9s9 4 9 9" /><path d="M3 12h18" /><path d="M12 12v9" /></> },
  { test: /instalac|domot|electric|videoport|ascensor/, path: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></> },
  { test: /zona|comun|jard|portal|piscina/, path: <><path d="M2 22h20" /><path d="M5 22V10l7-7 7 7v12" /></> },
  { test: /garant|seguro|aval|calidad/, path: <><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></> },
  { test: /interior|acabado|revestim/, path: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M15 3v18" /></> },
];

function calidadIcon(title: string, iconKey?: string): ReactNode {
  const haystack = `${title} ${iconKey ?? ""}`.toLowerCase();
  const match = ICON_PATHS.find((i) => i.test.test(haystack));
  return (
    match?.path ?? (
      <>
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </>
    )
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a MEMORIA_CALIDADES content block in a 4×2 grid.
 * Each item shows a terracota icon, a Fraunces title, and a description.
 */
export function BlockCalidades({ block }: BlockCalidadesProps) {
  const items = block.payload?.items as CalidadItem[] | undefined;

  if (!items || items.length === 0) return null;

  return (
    <section aria-label="Memoria de calidades" data-block-type="MEMORIA_CALIDADES">
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-12">
        {items.map((item, index) => (
          <div
            key={index}
            className="group relative w-full border-t border-border-default pt-8 sm:w-[calc(50%-1rem)] lg:w-[260px]"
          >
            {/* Oversized italic index, magazine style */}
            <span
              className="pointer-events-none absolute right-0 top-5 font-display text-[80px] font-normal italic leading-none tracking-[-0.04em] text-fg-subtle opacity-50 transition-colors group-hover:text-terracota"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>

            {/* Terracota line icon, chosen per calidad category */}
            <div className="mb-6 flex text-terracota" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {calidadIcon(item.title, item.icon)}
              </svg>
            </div>

            <h3 className="mb-[10px] font-display text-[24px] font-normal leading-[1.2] tracking-[-0.015em] text-fg-default">
              {item.title}
            </h3>
            <p className="max-w-[280px] text-[14px] leading-[1.65] text-fg-muted">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
