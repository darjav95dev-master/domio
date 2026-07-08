/**
 * Footer — slate 4-column institutional footer.
 *
 * Consumes tokens from design.md §7.10:
 * - bg-inverted (#2E2B27) as background
 * - Grid 1.6fr 1fr 1fr 1fr desktop, stacked mobile
 * - Tagline Fraunces italic with warm-amber em
 * - 4 columns: Domio, Portafolio, Legal, Contacto
 * - Legal row with border-top and copyright
 */
export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="bg-bg-inverted text-fg-on-inverted/70"
    >
      <div className="mx-auto max-w-[1280px] px-[24px] pb-[40px] pt-[80px] md:px-[56px] md:pt-[120px]">
        {/* Grid: 4 columns desktop, stacked mobile */}
        <div className="grid gap-x-[80px] gap-y-[48px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Column 1 — Domio brand + tagline */}
          <div>
            <p className="font-display italic text-[21px] leading-[1.45] tracking-[-0.01em] text-fg-on-inverted/85 max-w-[340px]">
              Un <em className="text-fg-on-dark-em not-italic">portafolio inmobiliario</em>{" "}
              con carácter editorial, precios claros y vocación de servicio
              en Canarias.
            </p>
          </div>

          {/* Column 2 — Domio */}
          <FooterColumn title="Domio">
            <FooterLink href="/sobre">Sobre</FooterLink>
            <FooterLink href="/equipo">Equipo</FooterLink>
            <FooterLink href="/contacto">Contacto</FooterLink>
          </FooterColumn>

          {/* Column 3 — Portafolio */}
          <FooterColumn title="Portafolio">
            <FooterLink href="/portafolio">Catálogo</FooterLink>
            <FooterLink href="/portafolio/destacados">Destacados</FooterLink>
            <FooterLink href="/portafolio/novedades">Novedades</FooterLink>
          </FooterColumn>

          {/* Column 4 — Legal */}
          <FooterColumn title="Legal">
            <FooterLink href="/legal/aviso-legal">Aviso Legal</FooterLink>
            <FooterLink href="/legal/privacidad">Privacidad</FooterLink>
            <FooterLink href="/legal/cookies">Cookies</FooterLink>
          </FooterColumn>
        </div>

        {/* Contact info row (outside grid, below columns) */}
        <div className="mt-[48px] grid gap-x-[80px] gap-y-[16px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div /> {/* Spacer to align with column 1 */}
          <div className="font-sans text-sm leading-[1.5] text-fg-on-inverted/55 md:col-start-2">
            <p className="font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-white">
              Contacto
            </p>
            <ul className="mt-[8px] space-y-[8px]">
              <li>
                <a
                  href="tel:+34922000000"
                  className="text-sm text-fg-on-inverted/55 transition-colors duration-150 hover:text-white"
                >
                  +34 922 000 000
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@domio.es"
                  className="text-sm text-fg-on-inverted/55 transition-colors duration-150 hover:text-white"
                >
                  info@domio.es
                </a>
              </li>
              <li className="text-sm text-fg-on-inverted/55">
                Av. de la Constitución, 1
                <br />
                38001 Santa Cruz de Tenerife
              </li>
            </ul>
          </div>
          <div /> <div /> {/* Spacers */}
        </div>

        {/* Legal row */}
        <div className="mt-[48px] border-t border-white/10 pt-[32px]">
          <div className="flex flex-col gap-[8px] md:flex-row md:items-center md:justify-between">
            <p className="font-sans text-sm text-fg-on-inverted/45">
              &copy; {new Date().getFullYear()} Domio. Todos los derechos
              reservados.
            </p>
            <nav aria-label="Enlaces legales secundarios">
              <ul className="flex flex-wrap gap-x-[24px] gap-y-[4px]">
                <li>
                  <a
                    href="/legal/aviso-legal"
                    className="text-sm text-fg-on-inverted/45 transition-colors duration-150 hover:text-white"
                  >
                    Aviso Legal
                  </a>
                </li>
                <li>
                  <a
                    href="/legal/privacidad"
                    className="text-sm text-fg-on-inverted/45 transition-colors duration-150 hover:text-white"
                  >
                    Privacidad
                  </a>
                </li>
                <li>
                  <a
                    href="/legal/cookies"
                    className="text-sm text-fg-on-inverted/45 transition-colors duration-150 hover:text-white"
                  >
                    Cookies
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="font-mono text-[10px] font-medium tracking-[0.16em] uppercase text-white">
        {title}
      </h4>
      <nav aria-label={title}>
        <ul className="mt-[12px] space-y-[8px]">{children}</ul>
      </nav>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        className="font-sans text-sm leading-[1.5] text-fg-on-inverted/55 transition-colors duration-150 hover:text-white"
      >
        {children}
      </a>
    </li>
  );
}
