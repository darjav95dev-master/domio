"use client";

import { Button } from "@/shared/components/button";
import { cn } from "@/shared/utils/cn";
import { PROMOTION_STATUS_LABELS } from "@/shared/constants/domain-labels";
import { PROMOTION_STATUS_COLORS } from "@/shared/constants/status-colors";
import { NAV_ITEMS } from "@/features/backoffice/constants/nav-items";
import type { UserRole } from "@/shared/constants/db-enums";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export interface DashboardContentProps {
  userName: string;
  userRole: UserRole;
  unreadLeadsCount: number;
  recentPromociones: Array<{
    id: string;
    name: string;
    status: string;
    updatedAt: Date;
  }>;
}

/* ─── Relative time helper (server-safe) ───────────────────────────────────── */

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "hace unos segundos";
  if (diffMinutes < 60) return `hace ${diffMinutes} minutos`;
  if (diffHours < 24) return `hace ${diffHours} horas`;
  if (diffDays < 2) return "hace 1 día";
  return `hace ${diffDays} días`;
}

/* ─── Section heading component ────────────────────────────────────────────── */

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default"
    >
      {children}
    </h2>
  );
}

/* ─── DashboardContent ─────────────────────────────────────────────────────── */

// Quick links derived from NAV_ITEMS — the centralized nav config,
// filtered by the user's role for the set of link hrefs we expose.
const QUICK_LINK_HREFS = ["/panel/catalogo", "/panel/leads", "/panel/contenidos"] as const;

export function DashboardContent({
  userName,
  userRole,
  unreadLeadsCount,
  recentPromociones,
}: DashboardContentProps) {
  const quickLinks = NAV_ITEMS.filter(
    (item) =>
      QUICK_LINK_HREFS.includes(item.href as typeof QUICK_LINK_HREFS[number]) &&
      item.allowedRoles.includes(userRole),
  );
  return (
    <div className="space-y-10">
      {/* ── Section 1: Saludo ──────────────────────────────────────────── */}
      <section aria-labelledby="greeting-heading">
        <h1
          id="greeting-heading"
          className="font-display text-[clamp(28px,3.5vw,48px)] font-normal tracking-[-0.035em] leading-[1.05] text-fg-default"
        >
          Hola, {userName}
        </h1>
      </section>

      {/* ── Section 2: Contador de leads no leídos ─────────────────────── */}
      <section aria-labelledby="leads-heading">
        <h2 id="leads-heading" className="sr-only">
          Leads no leídos
        </h2>

        {unreadLeadsCount > 0 ? (
          <div className="flex flex-col">
            <span
              className="font-display italic text-[32px] font-normal tracking-[-0.02em] leading-tight text-accent-default"
              aria-live="polite"
            >
              {unreadLeadsCount}
            </span>
            <span className="text-[14px] leading-normal text-fg-subtle">
              Leads no leídos
            </span>
          </div>
        ) : (
          <p className="text-[14px] leading-normal text-fg-muted">
            No tienes leads pendientes
          </p>
        )}
      </section>

      {/* ── Section 3: Enlaces rápidos ─────────────────────────────────── */}
      <section aria-labelledby="quick-links-heading">
        <SectionHeading id="quick-links-heading">
          Enlaces rápidos
        </SectionHeading>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-card border border-border-subtle bg-bg-surface px-5 py-4",
                  "transition-colors duration-quick ease-standard",
                  "hover:bg-bg-surface-raised focus-visible:outline-offset-[-2px]",
                )}
              >
                <Icon size={24} aria-hidden="true" className="text-accent-default" />
                <span className="text-base font-medium text-fg-default">
                  {link.label}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* ── Section 4: Últimas promociones editadas ────────────────────── */}
      <section aria-labelledby="recent-promos-heading">
        <SectionHeading id="recent-promos-heading">
          Últimas promociones editadas
        </SectionHeading>

        {recentPromociones.length > 0 ? (
          <ul className="mt-4 divide-y divide-border-subtle rounded-card border border-border-subtle bg-bg-surface">
            {recentPromociones.slice(0, 5).map((promo) => (
              <li key={promo.id}>
                <a
                  href={`/panel/catalogo/${promo.id}`}
                  className={cn(
                    "flex items-center justify-between gap-4 px-5 py-3",
                    "transition-colors duration-quick ease-standard",
                    "hover:bg-bg-surface-raised",
                  )}
                >
                  <span className="text-base font-medium text-fg-default">
                    {promo.name}
                  </span>

                  <span className="flex items-center gap-3 shrink-0">
                    <span
                      className={cn(
                        "inline-block rounded-pill border px-2.5 py-0.5",
                        "font-mono text-[11px] font-medium uppercase tracking-[0.04em]",
                        (PROMOTION_STATUS_COLORS[promo.status] as string) ??
                          "bg-bg-surface-sunken text-fg-subtle border-border-default",
                      )}
                    >
                      {PROMOTION_STATUS_LABELS[promo.status as keyof typeof PROMOTION_STATUS_LABELS] ?? promo.status}
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle whitespace-nowrap">
                      {relativeTime(promo.updatedAt)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[14px] leading-normal text-fg-muted">
            Aún no has editado promociones
          </p>
        )}
      </section>

      {/* ── Section 5: Atajos rápidos ──────────────────────────────────── */}
      <section aria-labelledby="shortcuts-heading">
        <SectionHeading id="shortcuts-heading">Atajos rápidos</SectionHeading>

        <div className="mt-4 flex flex-wrap gap-4">
          <a href="/panel/catalogo/nueva">
            <Button variant="primary">Nueva promoción</Button>
          </a>
          <a href="/panel/leads">
            <Button variant="secondary">Ver bandeja</Button>
          </a>
        </div>
      </section>
    </div>
  );
}
