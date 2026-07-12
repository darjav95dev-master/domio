import Link from "next/link";
import type { HowWeWorkPayload } from "@/features/home/types";

interface HowWeWorkProps {
  data: HowWeWorkPayload;
}

const NUMERALS = ["01", "02", "03", "04"] as const;

/**
 * Closing quote for the "how it works" section — static editorial copy ported
 * from the CoviCanarias reference and adapted to a real-estate agency.
 * ponytail: hardcoded; promote to the payload only if it needs to be editable.
 */
const FOOT_QUOTE =
  "Encontrar casa no es solo enseñar puertas. Es acompañar a quien vivirá tras ellas.";

export function HowWeWork({ data }: HowWeWorkProps) {
  const { steps } = data;

  return (
    <section
      id="como"
      className="scroll-mt-[80px] py-section-lg px-6 md:px-[56px] bg-bg-surface-sunken"
      aria-labelledby="how-title"
    >
      <div className="mx-auto max-w-[1200px]">
        {/* ── Section header ─────────────────────────────────────────────── */}
        <div className="mb-20 max-w-[760px]">
          <span className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-terracota before:h-px before:w-[32px] before:bg-gradient-to-r before:from-terracota before:to-transparent before:content-['']">
            El camino · 4 pasos
          </span>
          <h2
            id="how-title"
            className="mt-[22px] mb-[22px] font-display text-display-md text-fg-default"
          >
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="font-sans text-[19px] leading-[1.6] text-fg-muted max-w-[52ch]">
              {data.subtitle}
            </p>
          )}
        </div>

        {/* ── 4-col grid: only horizontal rules, 1px internal gaps ────────── */}
        <div className="mt-8 grid grid-cols-1 gap-px border-y border-line bg-line-soft md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <article
              key={i}
              className="flex flex-col bg-bg-surface-sunken p-[64px_36px_56px] transition-colors duration-slow ease-standard hover:bg-bg-surface"
            >
              {/* Numeral */}
              <span
                className="mb-[28px] font-serif italic text-[52px] leading-none tracking-[-0.025em] text-fg-default/90"
                aria-hidden="true"
              >
                {NUMERALS[i] ?? String(i + 1).padStart(2, "0")}
              </span>

              {/* Icon circle */}
              <div
                className="mb-6 flex h-[44px] w-[44px] items-center justify-center rounded-pill border border-fg-default"
                aria-hidden="true"
              >
                <StepIcon icon={step.icon} />
              </div>

              {/* Title */}
              <h3 className="mb-3 font-display text-[21px] font-medium leading-[1.25] tracking-[-0.015em] text-fg-default">
                {step.title}
              </h3>

              {/* Body */}
              <p className="flex-1 font-sans text-[14.5px] leading-[1.6] text-fg-subtle">
                {step.body}
              </p>
            </article>
          ))}
        </div>

        {/* ── Foot: closing quote + secondary CTA ─────────────────────────── */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-5 border-t border-line-soft pt-9">
          <p className="max-w-[580px] font-serif italic text-[24px] leading-[1.4] tracking-[-0.01em] text-fg-muted">
            &ldquo;{FOOT_QUOTE}&rdquo;
          </p>
          <Link
            href="/portafolio"
            className="group inline-flex items-center gap-[10px] rounded-pill border-[1.5px] border-fg-default px-[26.5px] py-[13.5px] font-sans text-[15px] font-medium tracking-[-0.005em] text-fg-default transition-all duration-deliberate ease-standard hover:bg-fg-default hover:text-bg-canvas"
          >
            Ver las promociones
            <svg
              className="h-4 w-4 transition-transform duration-250 group-hover:translate-x-[3px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

function StepIcon({ icon }: { icon: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    "magnifying-glass": (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    house: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
    handshake: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.24 1.33 10.5 4 13l8 8 8-8c2.67-2.5 2.54-6.76-.58-8.42z" />
      </svg>
    ),
    key: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3a6 6 0 0 1 0 12c-.78 0-1.53-.15-2.22-.42L11 16H8v3H5v3H1v-4l6.5-6.5A6 6 0 0 1 15 3z" />
        <circle cx="15" cy="7" r="1.5" fill="currentColor" />
      </svg>
    ),
  };

  return <>{iconMap[icon] ?? null}</>;
}
