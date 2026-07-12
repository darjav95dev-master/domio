import Link from "next/link";
import { MediaImage } from "@/shared/components/media-image";
import { LogoMark } from "@/shared/components/logo-mark";
import type { HeroPayload } from "@/features/home/types";

interface HeroProps {
  data: HeroPayload;
}

/**
 * Marquee benefit phrases — static brand claims (not CMS-driven), ported from
 * the CoviCanarias reference and adapted to a Canarian real-estate agency.
 * ponytail: hardcoded; promote to HeroPayload only if these need to be editable.
 */
const MARQUEE_ITEMS = [
  "Sin comisiones ocultas",
  "Acompañamiento de principio a fin",
  "Propiedades verificadas una a una",
  "Documentación 100% accesible",
  "Valoración gratuita y sin compromiso",
  "Más de 15 años en las islas",
] as const;

function TrustStatCard({
  value,
  unit,
  label,
}: {
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-white/[0.08] py-[14px] first:pt-0 last:border-b-0 last:pb-0">
      <span className="shrink-0 font-serif text-[26px] font-normal leading-none tracking-[-0.025em] text-white">
        {value}
        {unit && (
          <em className="font-serif italic text-fg-on-dark-em"> {unit}</em>
        )}
      </span>
      <span className="text-[12px] leading-[1.4] text-white/70">{label}</span>
    </div>
  );
}

/**
 * Renders the hero claim, converting `*emphasis*` markers into an italic
 * warm-amber <em> — matching the reference `.hero h1 em` (color #FFD9B0).
 */
function renderClaim(text: string): React.ReactNode {
  return text.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? (
      <em key={i} className="font-normal italic text-fg-on-dark-em">
        {part.slice(1, -1)}
      </em>
    ) : (
      part
    ),
  );
}

export function Hero({ data }: HeroProps) {
  const {
    claim,
    lead,
    ctaPrimary,
    ctaSecondary,
    backgroundImageId,
    trustStats,
  } = data;

  return (
    <section
      data-dark-hero
      className="relative min-h-[100dvh] flex flex-col overflow-hidden"
      aria-label="Hero principal"
    >
      {/* ── Background ──────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        {backgroundImageId ? (
          <MediaImage
            alt="Hogar en Canarias"
            src={backgroundImageId}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]" />
        )}
      </div>

      {/* ── Multi-layer overlay ────────────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(26,20,16,0.15)_0%,rgba(26,20,16,0.55)_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[rgba(26,20,16,0.85)] via-[rgba(26,20,16,0.35)] to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.35] mix-blend-multiply pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      {/* ── Brand logo overlay (over the hero photo, matching reference) ────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[76%] top-[31%] z-0 hidden -translate-x-1/2 -translate-y-1/2 select-none flex-col items-center md:flex"
      >
        <LogoMark
          id="logo-mark-hero"
          className="h-[120px] w-[200px] [filter:drop-shadow(0_4px_24px_rgba(0,0,0,0.45))]"
        />
        <span className="font-display text-[62px] font-medium tracking-[-0.01em] text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.55)]">
          Domio
        </span>
      </div>

      {/* ── Content grid: 1.4fr 1fr ────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] items-end px-6 lg:px-[56px] pb-[120px] pt-[120px]">
        {/* ── Copy block ──────────────────────────────────────────────────── */}
        <div className="max-w-[620px]">
          {/* Eyebrow glass-pill */}
          <div className="inline-flex items-center gap-[10px] px-[18px] py-[10px] mb-9 rounded-pill bg-white/10 backdrop-blur-[14px] border border-white/[0.18] text-white text-[11px] font-mono font-medium uppercase tracking-[0.18em] shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
            <span
              className="w-[7px] h-[7px] rounded-full bg-[#7DD17D] shrink-0 [animation:pulse_2s_infinite]"
              aria-hidden="true"
            />
            Inmobiliaria · Canarias · 2010
          </div>

          <h1 className="font-display text-[clamp(52px,7vw,96px)] font-normal leading-[0.95] tracking-[-0.045em] text-white mb-9 max-w-[15ch] text-balance [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
            {renderClaim(claim)}
          </h1>

          <p className="font-sans text-[19px] leading-[1.6] text-white/[0.86] max-w-[52ch] mb-11 [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">
            {lead}
          </p>

          {/* ── Buttons ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-[14px]">
            <Link
              href="/portafolio"
              className="group inline-flex items-center justify-center gap-[10px] px-[30px] py-4 rounded-pill font-sans text-[15px] font-medium leading-none tracking-[-0.005em] text-fg-default bg-white shadow-[0_8px_32px_rgba(0,0,0,0.28),0_2px_8px_rgba(0,0,0,0.18)] transition-all duration-deliberate ease-standard hover:-translate-y-px hover:bg-terracota hover:text-white hover:shadow-[0_12px_40px_rgba(199,93,63,0.45)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              {ctaPrimary}
              <svg
                className="w-4 h-4 transition-transform duration-250 group-hover:translate-x-[3px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center px-[28.5px] py-[14.5px] rounded-pill font-sans text-[15px] font-medium leading-none tracking-[-0.005em] border-[1.5px] border-white/[0.35] bg-white/[0.08] text-white backdrop-blur-[12px] transition-all duration-deliberate ease-standard hover:border-white hover:bg-white/[0.18] focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              {ctaSecondary}
            </Link>
          </div>
        </div>

        {/* ── TrustCard (vertical list) ───────────────────────────────────── */}
        <div className="hidden lg:block p-[32px] rounded-[20px] bg-[rgba(20,15,10,0.38)] backdrop-blur-[28px] border border-white/[0.14] shadow-[0_12px_48px_rgba(0,0,0,0.28)]">
          <p className="mb-[22px] font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-white/55">
            Lo que somos
          </p>
          {trustStats.map((stat, i) => (
            <TrustStatCard key={i} {...stat} />
          ))}
        </div>
      </div>

      {/* ── Trust-marquee band ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-t border-white/[0.06] bg-[rgba(20,15,10,0.30)] py-[14px] [backdrop-filter:blur(20px)_saturate(140%)]">
        <div
          className="flex items-center gap-[72px] whitespace-nowrap"
          style={{ animation: "marquee 38s linear infinite" }}
        >
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-[11px] text-[12px] font-normal tracking-[0.08em] text-white/60"
            >
              <svg
                className="h-[13px] w-[13px] shrink-0 text-warm-amber/70"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
