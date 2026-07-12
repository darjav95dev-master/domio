import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetailCTAProps {
  promocion: PromocionDetail;
  /** Contact phone shown in the CTA footer row, if configured. */
  phone?: string | null;
  /** Contact email shown in the CTA footer row, if configured. */
  email?: string | null;
  /** Anchor id of the contact form to scroll to. */
  contactAnchor: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("es-ES", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(value)} €`;
}

/** Lowest reference price + a "desde X" headline, operation-aware. */
function priceHeadline(promocion: PromocionDetail): string {
  const isRent = promocion.operation === "RENT";
  const prices = promocion.tipologias
    .map((t) => (isRent ? t.referencePriceRent : t.referencePriceSale))
    .filter((p): p is number => p !== null && p !== undefined);
  if (prices.length === 0) return "Consúltanos";
  const min = Math.min(...prices);
  return isRent ? `desde ${formatPrice(min)}/mes` : `desde ${formatPrice(min)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DetailCTA — the closing dark call-to-action box from the reference. Keeps
 * Domio functional: the primary button scrolls to the in-page contact form,
 * and phone / email are real links. "desde {price}" is derived from the
 * promotion's typologies.
 */
export function DetailCTA({
  promocion,
  phone,
  email,
  contactAnchor,
}: DetailCTAProps) {
  const headline = priceHeadline(promocion);

  return (
    <div className="relative mx-auto max-w-[1180px] overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#1A1410_0%,#3D2E20_50%,#5C3F2A_100%)] px-7 py-14 text-center text-white shadow-[0_18px_48px_rgba(26,20,16,0.32)] md:px-12 md:py-16">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute -right-[100px] -top-[100px] h-[340px] w-[340px] rounded-full"
        style={{
          background: "radial-gradient(circle,rgba(199,93,63,0.30) 0%,transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-[120px] -left-[120px] h-[380px] w-[380px] rounded-full"
        style={{
          background: "radial-gradient(circle,rgba(255,217,176,0.10) 0%,transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-above">
        <div className="mb-[18px] inline-block rounded-pill border border-white/28 bg-white/[0.18] px-4 py-[6px] font-mono text-[10px] font-medium uppercase tracking-[0.14em] backdrop-blur-[8px]">
          ¿Te interesa este inmueble?
        </div>

        <h2 className="mb-[14px] font-display text-[clamp(32px,5vw,52px)] font-normal leading-[1.05] tracking-[-0.02em] text-white">
          {headline}
        </h2>

        <p className="mx-auto mb-8 max-w-[520px] text-[15px] leading-[1.7] text-white/90">
          Te acompañamos durante todo el proceso, desde la primera visita hasta
          la entrega de llaves. Solicita información sin compromiso.
        </p>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-[14px]">
          <a
            href={`#${contactAnchor}`}
            className="rounded-pill border border-white bg-white px-7 py-[13px] font-sans text-[13px] font-semibold text-fg-default shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-transform hover:-translate-y-px"
          >
            Solicitar información
          </a>
          {phone && (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="rounded-pill border border-white/55 px-7 py-[13px] font-sans text-[13px] font-medium text-white transition-colors hover:border-white hover:bg-white/12"
            >
              Llamar ahora
            </a>
          )}
        </div>

        {(phone || email) && (
          <div className="flex flex-wrap items-center justify-center gap-8 text-[13px] text-white/90">
            {phone && (
              <span className="inline-flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.49 12 19.79 19.79 0 0 1 1.31 3.32 2 2 0 0 1 3.32 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6.29 6.29l.76-.76a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {phone}
              </span>
            )}
            {email && (
              <span className="inline-flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                {email}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
