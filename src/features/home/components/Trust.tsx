import type { TrustPayload } from "@/features/home/types";

interface TrustProps {
  data: TrustPayload;
}

export function Trust({ data }: TrustProps) {
  const { title, subtitle, metrics, testimonios } = data;

  return (
    <section className="py-section-lg px-6 md:px-[56px] bg-bg-surface" aria-labelledby="trust-title">
      <div className="max-w-7xl mx-auto">
        {/* ── Section header ─────────────────────────────────────────── */}
        <div className="text-center mb-16">
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-accent-default relative inline-flex items-center gap-3 before:content-[''] before:w-[24px] before:h-[2px] before:bg-gradient-to-r before:from-transparent before:to-accent-default after:content-[''] after:w-[24px] after:h-[2px] after:bg-gradient-to-r after:from-accent-default after:to-transparent">
            Confianza
          </span>
          <h2
            id="trust-title"
            className="font-display text-display-md text-fg-default mt-4 mb-4"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="font-sans text-body-md text-fg-muted max-w-[65ch] mx-auto">
              {subtitle}
            </p>
          )}
        </div>

        {/* ── Metrics grid: 4-col ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {metrics.map((metric, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center px-6 border-r border-border-subtle last:border-r-0"
            >
              <span className="font-serif italic text-[72px] leading-[0.85] tracking-[-0.04em] text-fg-default">
                {metric.value}
                <span className="font-mono text-[24px] font-medium align-top text-fg-subtle">
                  {metric.unit}
                </span>
              </span>
              <span className="font-sans text-body-sm text-fg-subtle max-w-[220px] mt-2">
                {metric.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Testimonials grid: 3-col ────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonios.map((testimonio, i) => (
            <TestimonialCard key={i} {...testimonio} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
}

function TestimonialCard({ quote, author, role }: TestimonialCardProps) {
  return (
    <article className="relative bg-bg-surface rounded-[20px] p-[56px_44px_40px] shadow-[0_2px_8px_rgba(var(--shadow-tint),0.06)] overflow-hidden transition-all duration-deliberate ease-standard hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(var(--shadow-tint),0.10)]">
      {/* Decorative quote mark */}
      <span
        className="absolute top-14 left-8 font-serif italic text-[140px] leading-none text-accent-default/10 pointer-events-none select-none"
        aria-hidden="true"
      >
        &ldquo;
      </span>

      {/* Quote body */}
      <blockquote className="relative z-10 font-sans text-[17px] leading-relaxed text-fg-default mb-8">
        {quote}
      </blockquote>

      {/* Author */}
      <footer className="border-t border-border-subtle pt-6 flex items-center gap-4">
        <div className="w-[42px] h-[42px] rounded-pill bg-gradient-to-br from-slate-2 to-ink-2 flex items-center justify-center text-bg-surface text-body-sm font-medium shrink-0">
          {author.charAt(0)}
        </div>
        <div>
          <cite className="font-sans text-body-sm font-semibold not-italic text-fg-default">
            {author}
          </cite>
          <p className="font-sans text-meta text-fg-subtle">
            {role}
          </p>
        </div>
      </footer>
    </article>
  );
}
