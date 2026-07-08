import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockPlazosProps {
  block: PromocionContentBlock;
}

interface PlazosPayload {
  delivery?: string;
  license?: string;
  guarantee?: string;
  audit?: string;
}

/**
 * Timeline milestones with their label keys and display labels.
 * The 4 hitos: licencias, aval bancario, auditoría, entrega estimada.
 */
const MILESTONES: Array<{
  key: keyof PlazosPayload;
  label: string;
  icon: string;
}> = [
  { key: "license", label: "Licencias", icon: "📋" },
  { key: "guarantee", label: "Aval bancario", icon: "🛡️" },
  { key: "audit", label: "Auditoría externa", icon: "✓" },
  { key: "delivery", label: "Entrega estimada", icon: "📅" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a PLAZOS_GARANTIAS content block as a 4-milestone timeline.
 * Only rendered when kind='portfolio' (enforced by EditorialBlocks).
 *
 * Milestones with a value are "done" (ink dot), the next empty one is
 * "current" (terracota dot), remaining are "pending".
 */
export function BlockPlazos({ block }: BlockPlazosProps) {
  const payload = (block.payload ?? {}) as PlazosPayload;

  // Determine which milestone is "current" (first empty one)
  const filledIndexes = MILESTONES.map((m) =>
    payload[m.key] ? true : false,
  );
  const currentIndex = filledIndexes.findIndex((f) => !f);

  return (
    <section aria-label="Plazos y garantías" data-block-type="PLAZOS_GARANTIAS">
      <div className="relative">
        {/* Connector line */}
        <div
          className="absolute left-[19px] top-3 bottom-3 w-px bg-border-default md:left-1/2 md:-translate-x-px"
          aria-hidden="true"
        />

        <div className="space-y-8 md:space-y-0">
          {MILESTONES.map((milestone, index) => {
            const value = payload[milestone.key];
            const isDone = value !== undefined && value !== "";
            const isCurrent = index === currentIndex;

            return (
              <div
                key={milestone.key}
                className="relative flex items-start gap-4 md:flex-col md:items-center md:text-center"
              >
                {/* Dot */}
                <div
                  className={[
                    "relative z-above mt-1 flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full md:mt-0",
                    isDone
                      ? "bg-fg-default"
                      : isCurrent
                        ? "bg-accent-default shadow-[0_0_0_4px_var(--accent-subtle)]"
                        : "border-2 border-border-default bg-bg-canvas",
                  ].join(" ")}
                  aria-hidden="true"
                />

                {/* Content */}
                <div className="md:mt-3 md:px-4">
                  <p
                    className={[
                      "font-mono text-[11px] font-medium uppercase tracking-[0.16em]",
                      isDone
                        ? "text-fg-default"
                        : isCurrent
                          ? "text-accent-default"
                          : "text-fg-subtle",
                    ].join(" ")}
                  >
                    {milestone.label}
                  </p>
                  {value && (
                    <p className="mt-1 text-base text-fg-muted">{value}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
