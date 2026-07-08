import type { HowWeWorkPayload } from "@/features/home/types";

interface HowWeWorkProps {
  data: HowWeWorkPayload;
}

const NUMERALS = ["01", "02", "03", "04"] as const;

export function HowWeWork({ data }: HowWeWorkProps) {
  const { steps } = data;

  return (
    <section className="py-section-lg px-gutter" aria-labelledby="how-title">
      <div className="max-w-7xl mx-auto">
        {/* ── Section header ─────────────────────────────────────────────── */}
        <div className="mb-16">
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-accent-default relative pl-6 before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[20px] before:h-[2px] before:bg-gradient-to-r before:from-accent-default before:to-transparent">
            Proceso
          </span>
          <h2
            id="how-title"
            className="font-display text-display-md text-fg-default mt-4 mb-4"
          >
            {data.title}
          </h2>
          {data.subtitle && (
            <p className="font-sans text-body-md text-fg-muted max-w-[65ch]">
              {data.subtitle}
            </p>
          )}
        </div>

        {/* ── 4-col grid with 1px gap (line-soft background creates dividers) ─ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-line-soft rounded-[20px] overflow-hidden">
          {steps.map((step, i) => (
            <article
              key={i}
              className="bg-bg-surface-sunken p-[64px_36px_56px] transition-colors duration-deliberate ease-standard hover:bg-bg-surface flex flex-col"
            >
              {/* Numeral */}
              <span
                className="font-serif italic text-[52px] leading-[0.9] text-fg-default/90 mb-6"
                aria-hidden="true"
              >
                {NUMERALS[i] ?? String(i + 1).padStart(2, "0")}
              </span>

              {/* Icon circle */}
              <div
                className="w-[44px] h-[44px] rounded-pill border border-fg-default flex items-center justify-center mb-6"
                aria-hidden="true"
              >
                <StepIcon icon={step.icon} />
              </div>

              {/* Title */}
              <h3 className="font-display text-heading-md text-fg-default mb-4">
                {step.title}
              </h3>

              {/* Body */}
              <p className="font-sans text-body-md text-fg-muted flex-1">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepIcon({ icon }: { icon: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    "magnifying-glass": (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    house: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
    handshake: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.24 1.33 10.5 4 13l8 8 8-8c2.67-2.5 2.54-6.76-.58-8.42z" />
      </svg>
    ),
    key: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3a6 6 0 0 1 0 12c-.78 0-1.53-.15-2.22-.42L11 16H8v3H5v3H1v-4l6.5-6.5A6 6 0 0 1 15 3z" />
        <circle cx="15" cy="7" r="1.5" fill="currentColor" />
      </svg>
    ),
  };

  return <>{iconMap[icon] ?? null}</>;
}
