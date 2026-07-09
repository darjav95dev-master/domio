/**
 * ContactHeader — centred header band with eyebrow + H1 + lead.
 *
 * Matches design.md §13.4 block #2:
 *   bg.surface-sunken, padding-top 140px
 *
 * This is a Server Component — no interactivity.
 */
export function ContactHeader() {
  return (
    <section className="bg-bg-surface-sunken px-6 pt-[140px] pb-24">
      <div className="mx-auto max-w-[760px] text-center">
        {/* Eyebrow */}
        <p className="relative font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent-default">
          <span
            className="absolute -top-8 left-1/2 block h-px w-8 -translate-x-1/2"
            style={{
              background:
                "linear-gradient(90deg, var(--accent-default), transparent)",
            }}
            aria-hidden="true"
          />
          Contacto
        </p>

        {/* H1 */}
        <h1 className="mt-8 font-display text-[clamp(36px,4.8vw,64px)] font-normal leading-[1.05] tracking-[-0.035em] text-fg-default">
          Contacto
        </h1>

        {/* Lead */}
        <p className="mx-auto mt-6 max-w-[52ch] font-sans text-[19px] leading-[1.6] text-fg-muted">
          Estamos aquí para ayudarte. Escríbenos, llámanos o visítanos.
          Nuestro equipo te atenderá con la mayor brevedad posible.
        </p>
      </div>
    </section>
  );
}
