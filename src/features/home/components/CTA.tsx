import Link from "next/link";
import { MediaImage } from "@/shared/components/media-image";
import type { CTAPayload } from "@/features/home/types";

interface CTAProps {
  data: CTAPayload;
}

export function CTA({ data }: CTAProps) {
  const { title, body, ctaLabel, ctaHref, backgroundImageId } = data;

  return (
    <section
      className="relative flex min-h-[620px] items-center overflow-hidden"
      aria-label="Llamada a la acción"
    >
      {/* ── Background (darkened) ──────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        {backgroundImageId ? (
          <MediaImage
            alt="Vivienda en Canarias"
            src={backgroundImageId}
            fill
            className="object-cover [filter:contrast(1.1)_brightness(0.6)_saturate(0.9)]"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]" />
        )}
      </div>

      {/* ── Overlays: radial depth + 110° linear ───────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_130%_100%_at_50%_50%,transparent_0%,rgba(20,15,10,0.5)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,rgba(20,15,10,0.78)_0%,rgba(20,15,10,0.5)_60%,rgba(20,15,10,0.2)_100%)]"
      />

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full px-6 lg:px-[56px] lg:pl-[96px]">
        <div className="max-w-[740px]">
          <span className="mb-5 inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-warm-amber before:h-px before:w-[32px] before:bg-gradient-to-r before:from-warm-amber before:to-transparent before:content-['']">
            Empieza hoy
          </span>

          <h2 className="mb-7 font-display text-[clamp(48px,6vw,84px)] font-normal leading-none tracking-[-0.04em] text-white">
            {title}
          </h2>

          {body && (
            <p className="mb-10 max-w-[52ch] font-sans text-[18px] leading-[1.6] text-white/[0.78]">
              {body}
            </p>
          )}

          <div className="flex flex-wrap gap-[14px]">
            <Link
              href={ctaHref}
              className="group inline-flex items-center justify-center gap-[10px] rounded-pill bg-white px-[30px] py-4 font-sans text-[15px] font-medium tracking-[-0.005em] text-fg-default shadow-[0_4px_8px_rgba(26,20,16,0.05),0_24px_48px_rgba(26,20,16,0.10),0_48px_96px_rgba(26,20,16,0.06)] transition-all duration-deliberate ease-standard hover:-translate-y-px hover:bg-terracota hover:text-white focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              {ctaLabel}
              <svg
                className="h-4 w-4 transition-transform duration-250 group-hover:translate-x-[3px]"
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
              className="inline-flex items-center justify-center rounded-pill border-[1.5px] border-white/40 bg-white/[0.12] px-[26.5px] py-[13.5px] font-sans text-[15px] font-medium tracking-[-0.005em] text-white backdrop-blur-[8px] transition-all duration-deliberate ease-standard hover:bg-white/[0.22] focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              Ponerse en contacto
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
