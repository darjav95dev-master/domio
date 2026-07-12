import type { TrustPayload } from "@/features/home/types";

interface TrustProps {
  data: TrustPayload;
}

/**
 * Certifications row — static trust signals ported from the CoviCanarias
 * reference and adapted to a Canarian real-estate agency.
 * ponytail: hardcoded; promote to the payload only if it needs to be editable.
 */
const CERTS = [
  {
    label: "Colegiados en el registro de agentes inmobiliarios",
    icon: (
      <>
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="10" />
      </>
    ),
  },
  {
    label: "Auditoría de cuentas externa anual",
    icon: <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />,
  },
  {
    label: "Contratos con garantía y aval bancario",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

export function Trust({ data }: TrustProps) {
  const { title, subtitle, metrics, testimonios } = data;

  return (
    <section
      id="confianza"
      className="scroll-mt-[80px] py-section-lg px-6 md:px-[56px] bg-bg-surface"
      aria-labelledby="trust-title"
    >
      <div className="mx-auto max-w-[1200px]">
        {/* ── Section header (left-aligned) ───────────────────────────────── */}
        <div className="mb-0 max-w-[760px]">
          <span className="inline-flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-terracota before:h-px before:w-[32px] before:bg-gradient-to-r before:from-terracota before:to-transparent before:content-['']">
            Confianza · Autoridad
          </span>
          <h2
            id="trust-title"
            className="mt-[22px] mb-[22px] font-display text-display-md text-fg-default"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="font-sans text-[19px] leading-[1.6] text-fg-muted max-w-[52ch]">
              {subtitle}
            </p>
          )}
        </div>

        {/* ── Metrics band: 4-col, bordered top/bottom ────────────────────── */}
        <div className="mt-[72px] mb-[100px] grid grid-cols-2 gap-y-8 border-y border-line py-[60px] lg:grid-cols-4 lg:gap-y-0">
          {metrics.map((metric, i) => (
            <div
              key={i}
              className="px-8 last:border-r-0 lg:border-r lg:border-line-soft"
            >
              <div className="mb-[14px] font-serif text-[72px] font-normal leading-[0.95] tracking-[-0.04em] text-fg-default">
                {metric.value}
                {metric.unit && (
                  <em className="ml-1 mt-[14px] inline-block align-top font-mono text-[24px] font-medium not-italic tracking-normal text-fg-subtle">
                    {metric.unit}
                  </em>
                )}
              </div>
              <div className="max-w-[220px] text-[13px] leading-[1.5] tracking-[0.005em] text-fg-subtle">
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Testimonials grid: 3-col ────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
          {testimonios.map((testimonio, i) => (
            <TestimonialCard key={i} {...testimonio} />
          ))}
        </div>

        {/* ── Certifications row ──────────────────────────────────────────── */}
        <div className="mt-24 flex flex-wrap items-center justify-between gap-12 border-t border-line pt-14">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-fg-subtle">
            Certificados y respaldados por
          </span>
          <div className="flex flex-wrap items-center gap-x-14 gap-y-4">
            {CERTS.map((cert, i) => (
              <span
                key={i}
                className="flex items-center gap-3 font-serif text-[16px] italic tracking-[-0.005em] text-fg-muted"
              >
                <svg
                  className="h-[18px] w-[18px] shrink-0 text-fg-default opacity-60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  {cert.icon}
                </svg>
                {cert.label}
              </span>
            ))}
          </div>
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
    <article className="flex flex-col overflow-hidden rounded-[20px] bg-bone p-[56px_44px_40px] shadow-[0_2px_4px_rgba(26,20,16,0.04),0_12px_24px_rgba(26,20,16,0.06),0_24px_48px_rgba(26,20,16,0.04)] transition-[transform,box-shadow] duration-slow ease-standard hover:-translate-y-1 hover:shadow-[0_4px_8px_rgba(26,20,16,0.05),0_24px_48px_rgba(26,20,16,0.10),0_48px_96px_rgba(26,20,16,0.06)]">
      {/* Quote body */}
      <blockquote className="mb-8 flex-1 font-serif text-[21px] italic leading-[1.45] tracking-[-0.01em] text-fg-default">
        {quote}
      </blockquote>

      {/* Author */}
      <footer className="flex items-center gap-[14px] border-t border-line-soft pt-6">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-2 to-ink-2 text-[13px] font-medium tracking-[0.02em] text-bone">
          {initials(author)}
        </div>
        <div>
          <cite className="block text-[14px] font-semibold not-italic tracking-[-0.005em] text-fg-default">
            {author}
          </cite>
          <p className="font-mono text-[11px] tracking-[0.04em] text-fg-subtle">
            {role}
          </p>
        </div>
      </footer>
    </article>
  );
}
