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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex gap-4"
          >
            {/* Icon */}
            <div
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-subtle"
              aria-hidden="true"
            >
              {item.icon ? (
                <span className="text-lg text-fg-muted">{item.icon}</span>
              ) : (
                <span className="text-lg text-fg-muted">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M6 10l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </div>

            {/* Content */}
            <div>
              <h3 className="font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default">
                {item.title}
              </h3>
              <p className="mt-1 text-base leading-relaxed text-fg-muted">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
