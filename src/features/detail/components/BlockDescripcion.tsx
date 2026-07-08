import type { PromocionContentBlock } from "@/infrastructure/db/schema/promocion-content-blocks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockDescripcionProps {
  block: PromocionContentBlock;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a DESCRIPCION_GENERAL content block.
 *
 * The payload text is validated server-side by Zod against an allowed
 * HTML tag set (b, i, u, p, br, ul, ol, li, strong, em, etc.),
 * so `dangerouslySetInnerHTML` is safe here. We add a `data-*` attribute
 * for testability.
 */
export function BlockDescripcion({ block }: BlockDescripcionProps) {
  const text = block.payload?.text as string | undefined;

  if (!text) return null;

  return (
    <section aria-label="Descripción general" data-block-type="DESCRIPCION_GENERAL">
      <div
        className="max-w-[62ch] text-base leading-relaxed text-fg-muted [&_b]:font-semibold [&_strong]:font-semibold [&_em]:italic [&_i]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_a]:text-accent-default [&_a]:underline [&_a:hover]:text-accent-hover"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </section>
  );
}
