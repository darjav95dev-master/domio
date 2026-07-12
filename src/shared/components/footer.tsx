import Link from "next/link";
import { getContactPageData } from "@/features/contact/server/get-contact-data";
import { LogoMark } from "@/shared/components/logo-mark";

/**
 * Footer — slate 4-column institutional footer, ported from the CoviCanarias
 * `.footer` reference: brand + tagline + address in column 1, three link
 * columns, and a bottom bar with inline contact chips + social icons + legal.
 */
export async function Footer() {
  const { contactConfig } = await getContactPageData();
  const phone = contactConfig?.phone ?? "+34 928 000 000";
  const email = contactConfig?.email ?? "info@domio.es";
  const hours = contactConfig?.hours ?? "Lun–Vie · 9:00–18:00";

  return (
    <footer role="contentinfo" className="bg-bg-inverted text-fg-on-inverted/70">
      <div className="mx-auto max-w-[1200px] px-[24px] pb-[28px] pt-[40px] md:px-[56px] md:pt-[48px]">
        {/* ── Grid: brand + 3 link columns ───────────────────────────────── */}
        <div className="grid gap-x-[48px] gap-y-[32px] border-b border-white/[0.08] pb-[40px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          {/* Column 1 — brand + tagline + address */}
          <div>
            <div className="mb-[16px] flex items-center gap-[12px]">
              <LogoMark id="logo-mark-footer" className="h-[30px] w-[42px] shrink-0" />
              <span className="font-display text-[20px] font-medium tracking-[-0.01em] text-fg-on-inverted">
                Domio
              </span>
            </div>
            <p className="mb-4 max-w-[340px] font-display text-[18px] italic leading-[1.4] tracking-[-0.01em] text-fg-on-inverted/85">
              &ldquo;Te ayudamos a encontrar casa donde otros solo ven un
              negocio.&rdquo;
            </p>
            <address className="text-[12.5px] not-italic leading-[1.6] text-fg-on-inverted/50">
              C/ León y Castillo, 43 · Planta 2
              <br />
              35003 Las Palmas de Gran Canaria
              <br />
              {phone} · {email}
            </address>
          </div>

          {/* Column 2 — Domio */}
          <FooterColumn title="Domio">
            <FooterLink href="/#como">Cómo funciona</FooterLink>
            <FooterLink href="/sobre">Sobre nosotros</FooterLink>
            <FooterLink href="/sobre">Equipo</FooterLink>
            <FooterLink href="/contacto">Contacto</FooterLink>
          </FooterColumn>

          {/* Column 3 — Promociones */}
          <FooterColumn title="Promociones">
            <FooterLink href="/portafolio">Ver todas</FooterLink>
            <FooterLink href="/portafolio?island=Gran+Canaria">En Gran Canaria</FooterLink>
            <FooterLink href="/portafolio?island=Lanzarote">En Lanzarote</FooterLink>
            <FooterLink href="/portafolio?island=Fuerteventura">En Fuerteventura</FooterLink>
          </FooterColumn>

          {/* Column 4 — Recursos */}
          <FooterColumn title="Recursos">
            <FooterLink href="/#faq">Preguntas frecuentes</FooterLink>
            <FooterLink href="/contacto">Contactar</FooterLink>
            <FooterLink href="/legal/aviso-legal">Aviso legal</FooterLink>
            <FooterLink href="/legal/privacidad">Privacidad</FooterLink>
          </FooterColumn>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────────────── */}
        <div className="mt-0 flex flex-wrap items-center justify-between gap-y-4 pt-[20px] text-[12px] lg:flex-nowrap">
          {/* Left: copyright + inline contact chips */}
          <div className="flex flex-wrap items-center gap-y-2 text-fg-on-inverted/50 lg:min-w-0 lg:flex-nowrap lg:overflow-hidden">
            <span className="text-fg-on-inverted/55">
              &copy; {new Date().getFullYear()} Domio ·{" "}
              <span className="font-medium text-fg-on-inverted/80">
                Inmobiliaria en Canarias
              </span>
            </span>
            <span className="mx-[14px] h-[11px] w-px shrink-0 bg-white/20" aria-hidden="true" />

            <ContactChip
              href={`mailto:${email}`}
              icon={
                <>
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </>
              }
            >
              {email}
            </ContactChip>
            <ContactChip
              href={`tel:${phone.replace(/\s/g, "")}`}
              icon={
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.49 12 19.79 19.79 0 0 1 1.31 3.32 2 2 0 0 1 3.32 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6.29 6.29l.76-.76a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              }
            >
              {phone}
            </ContactChip>
            <ContactChip
              icon={
                <>
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </>
              }
            >
              Las Palmas
            </ContactChip>
            <ContactChip
              last
              icon={
                <>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </>
              }
            >
              {hours}
            </ContactChip>
          </div>

          {/* Right: social icons + legal */}
          <div className="flex shrink-0 items-center gap-[5px] lg:ml-5">
            <SocialLink label="Facebook">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" fill="currentColor" stroke="none" />
            </SocialLink>
            <SocialLink label="Instagram">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </SocialLink>
            <SocialLink label="LinkedIn">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" fill="currentColor" stroke="none" />
              <rect x="2" y="9" width="4" height="12" fill="currentColor" stroke="none" />
              <circle cx="4" cy="4" r="2" fill="currentColor" stroke="none" />
            </SocialLink>
            <SocialLink label="WhatsApp">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </SocialLink>

            <span className="mx-2 h-[11px] w-px bg-white/20" aria-hidden="true" />
            <Link
              href="/legal/privacidad"
              className="text-[12px] text-fg-on-inverted/45 transition-colors duration-200 hover:text-white"
            >
              Privacidad
            </Link>
            <Link
              href="/legal/cookies"
              className="ml-3 text-[12px] text-fg-on-inverted/45 transition-colors duration-200 hover:text-white"
            >
              Cookies
            </Link>
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
      <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-white">
        {title}
      </h3>
      <nav aria-label={title}>
        <ul className="mt-4 space-y-[10px]">{children}</ul>
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
        className="font-sans text-[14px] leading-[1.5] text-fg-on-inverted/55 transition-colors duration-250 hover:text-fg-on-dark-em"
      >
        {children}
      </a>
    </li>
  );
}

function ContactChip({
  href,
  icon,
  children,
  last = false,
}: {
  href?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  last?: boolean;
}) {
  const inner = (
    <span
      className={`inline-flex items-center gap-[5px] text-fg-on-inverted/50 ${last ? "" : "mr-[14px]"}`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icon}
      </svg>
      {children}
    </span>
  );

  return href ? (
    <a href={href} className="transition-colors duration-200 hover:text-white">
      {inner}
    </a>
  ) : (
    inner
  );
}

function SocialLink({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-[7px] border border-white/[0.16] text-fg-on-inverted/50 transition-colors duration-200 hover:border-white/45 hover:text-white"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
