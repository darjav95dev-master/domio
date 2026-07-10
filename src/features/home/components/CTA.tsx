import Link from "next/link";
import { MediaImage } from "@/shared/components/media-image";
import type { CTAPayload } from "@/features/home/types";

interface CTAProps {
  data: CTAPayload;
}

export function CTA({ data }: CTAProps) {
  const { title, body, ctaLabel, ctaHref, backgroundImageId } = data;

  return (
    <section className="relative min-h-[620px] flex items-center overflow-hidden" aria-label="Llamada a la acción">
      {/* ── Background ─────────────────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        {backgroundImageId ? (
          <MediaImage
            alt="Vivienda en Canarias"
            src={backgroundImageId}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]" />
        )}
      </div>

      {/* ── Overlay ────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[rgba(26,20,16,0.85)] via-[rgba(26,20,16,0.55)] to-[rgba(26,20,16,0.3)]" />

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full px-6 lg:pl-[96px]">
        <div className="max-w-[740px]">
          <h2 className="font-display text-display-lg text-white leading-[1.1] mb-6">
            {title}
          </h2>

          {body && (
            <p className="font-sans text-[18px] leading-relaxed text-white/70 max-w-[65ch] mb-10">
              {body}
            </p>
          )}

          <div className="flex flex-wrap gap-[14px]">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center px-[34px] py-[16px] rounded-pill font-sans text-base font-medium tracking-[-0.005em] bg-bone text-fg-default transition-all duration-deliberate ease-standard hover:bg-accent-default hover:text-bone hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              {ctaLabel}
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center px-[30px] py-[14px] rounded-pill font-sans text-base font-medium tracking-[-0.005em] border-[1.5px] border-white/40 bg-white/[0.08] text-white backdrop-blur-[12px] transition-all duration-deliberate ease-standard hover:bg-white/[0.18] hover:border-white focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
            >
              Contactar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
