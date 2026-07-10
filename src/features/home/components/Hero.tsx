import Link from "next/link";
import { MediaImage } from "@/shared/components/media-image";
import type { HeroPayload } from "@/features/home/types";

interface HeroProps {
  data: HeroPayload;
}

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
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="font-serif italic text-[26px] leading-none text-bone">
        {value}
        <span className="font-mono text-[16px] font-medium align-top text-bone/60">
          {" "}
          {unit}
        </span>
      </span>
      <span className="text-[13px] leading-tight text-bone/70 max-w-[100px]">
        {label}
      </span>
    </div>
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

      {/* ── Content grid: 1.4fr 1fr ────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] items-end px-6 lg:px-[56px] pb-[120px] pt-[120px]">
        {/* ── Copy block ──────────────────────────────────────────────────── */}
        <div className="max-w-[620px]">
          {/* Eyebrow glass-pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-pill bg-white/10 backdrop-blur-[8px] border border-white/15 text-white/80 text-[13px] font-mono uppercase tracking-[0.12em]">
            <span
              className="w-[6px] h-[6px] rounded-full bg-terracota shrink-0"
              aria-hidden="true"
            />
            Promociones
          </div>

          <h1 className="font-display text-[clamp(2.5rem,5vw,4.5rem)] font-normal leading-[1.08] tracking-[-0.02em] text-white mb-6 text-balance">
            {claim}
          </h1>

          <p className="font-sans text-[17px] leading-relaxed text-white/70 max-w-[52ch] mb-10">
            {lead}
          </p>

          {/* ── Buttons ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-4">
            <Link
              href="/portafolio"
              className="inline-flex items-center justify-center px-[30px] py-4 rounded-pill font-sans text-base font-medium tracking-[-0.005em] text-fg-on-inverted bg-gradient-to-b from-ink-soft to-fg-default shadow-[inset_0_1px_0_var(--border-on-ink),0_1px_2px_rgba(var(--shadow-tint),0.10),0_8px_24px_rgba(var(--shadow-tint),0.20)] transition-all duration-deliberate ease-standard hover:-translate-y-px hover:bg-gradient-to-b hover:from-terracota hover:to-terracota-deep hover:shadow-[0_0_0_1px_var(--accent-subtle),0_12px_32px_var(--accent-glow)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              {ctaPrimary}
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center px-[26px] py-[14px] rounded-pill font-sans text-base font-medium tracking-[-0.005em] border-[1.5px] border-white/40 bg-white/[0.12] text-white backdrop-blur-[8px] transition-all duration-deliberate ease-standard hover:bg-white/[0.22] focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              {ctaSecondary}
            </Link>
          </div>
        </div>

        {/* ── TrustCard (3 numerals) ──────────────────────────────────────── */}
        <div className="hidden lg:grid grid-cols-3 gap-6 p-8 rounded-[16px] bg-white/10 backdrop-blur-[12px] border border-white/12">
          {trustStats.map((stat, i) => (
            <TrustStatCard key={i} {...stat} />
          ))}
        </div>
      </div>

      {/* ── Trust-marquee band ─────────────────────────────────────────────── */}
      <div className="relative h-[56px] bg-black/20 backdrop-blur-[8px] border-t border-white/8 overflow-hidden">
        <div
          className="absolute inset-0 flex items-center"
          style={{
            maskImage:
              "linear-gradient(to right,transparent,black 5%,black 95%,transparent)",
            WebkitMaskImage:
              "linear-gradient(to right,transparent,black 5%,black 95%,transparent)",
          }}
        >
          <div
            className="flex items-center gap-8 whitespace-nowrap"
            style={{
              animation: "marquee 30s linear infinite",
            }}
          >
            {[...trustStats, ...trustStats].map((stat, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 text-[14px] text-white/70 font-sans"
              >
                <svg
                  className="w-4 h-4 text-terracota shrink-0"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
                <span className="font-serif italic">{stat.value}</span>
                <span>{stat.unit}</span>
                <span className="text-white/40 mx-1">—</span>
                <span>{stat.label}</span>
                <span
                  className="w-[2px] h-[14px] bg-white/15 mx-2 shrink-0"
                  aria-hidden="true"
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
