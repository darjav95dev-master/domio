import type { Metadata } from "next";
import { getContactPageData } from "@/features/contact/server/get-contact-data";
import { ContactHeader } from "@/features/contact/components/ContactHeader";
import { QuickBand } from "@/features/contact/components/QuickBand";
import { ContactFormGeneric } from "@/features/contact/components/ContactFormGeneric";
import { OfficeMap } from "@/features/contact/components/OfficeMap";
import * as Sentry from "@sentry/nextjs";
import { buildPageMetadata } from "@/features/seo/server/build-page-metadata";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Contacto | Domio",
    description:
      "Contacta con Domio para recibir información sobre nuestras promociones inmobiliarias en Tenerife.",
    path: "/contacto",
  });
}

/**
 * ContactoPage — /contacto
 *
 * SSR page with:
 * 1. ContactHeader (centered eyebrow + H1 + lead)
 * 2. QuickBand (4-column contact data grid) — or pending banner
 * 3. Main grid 1.4fr 1fr: ContactFormGeneric left + OfficeMap/contact data right
 *
 * Nav and Footer are provided by app/(public)/layout.tsx.
 */
export default async function ContactoPage() {
  const data = await getContactPageData();

  const hasConfig = data.contactConfig !== null;
  const hasCoords =
    data.contactConfig?.officeLat != null &&
    data.contactConfig?.officeLng != null;

  return (
    <>
      <ContactHeader />

      {hasConfig ? (
        <QuickBand config={data.contactConfig} />
      ) : (
        <PendingConfigBanner />
      )}

      {/* Main: form + map/datos */}
      <section className="bg-bg-canvas px-6 py-20">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          {/* Left: form */}
          <div className="rounded-surface bg-bg-surface p-8 md:p-10">
            <h2 className="font-display text-[21px] font-medium tracking-[-0.015em] text-fg-default">
              Envíanos un mensaje
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-fg-muted">
              Rellena el formulario y te responderemos a la mayor brevedad
              posible.
            </p>
            <div className="mt-8">
              <ContactFormGeneric />
            </div>
          </div>

          {/* Right: map + office contact details */}
          <div className="flex flex-col gap-8">
            {hasCoords ? (
              <OfficeMap
                coordinates={[
                  data.contactConfig!.officeLng!,
                  data.contactConfig!.officeLat!,
                ]}
                address={data.contactConfig!.address ?? undefined}
              />
            ) : (
              <div className="rounded-surface border border-border-default bg-bg-surface px-6 py-10 text-center">
                <p className="font-sans text-sm text-fg-muted">
                  Ubicación no disponible
                </p>
              </div>
            )}

            {/* Office details card */}
            <div className="rounded-surface border border-border-default bg-bg-surface p-6">
              <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                Datos de contacto
              </h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="font-sans text-sm font-medium text-fg-default">
                    Dirección
                  </dt>
                  <dd className="font-sans text-sm text-fg-muted">
                    {data.contactConfig?.address ?? "Santa Cruz de Tenerife"}
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-medium text-fg-default">
                    Teléfono
                  </dt>
                  <dd>
                    <a
                      href={
                        data.contactConfig?.phone
                          ? `tel:${data.contactConfig.phone.replace(/\s/g, "")}`
                          : undefined
                      }
                      className="font-sans text-sm text-accent-default hover:text-accent-hover"
                    >
                      {data.contactConfig?.phone ?? "—"}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-medium text-fg-default">
                    Email
                  </dt>
                  <dd>
                    <a
                      href={
                        data.contactConfig?.email
                          ? `mailto:${data.contactConfig.email}`
                          : undefined
                      }
                      className="font-sans text-sm text-accent-default hover:text-accent-hover"
                    >
                      {data.contactConfig?.email ?? "—"}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-sans text-sm font-medium text-fg-default">
                    Horario
                  </dt>
                  <dd className="font-sans text-sm text-fg-muted">
                    {data.contactConfig?.hours ?? "Lun–Vie: 9:00–18:00"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * PendingConfigBanner — shown when contact_config has not been configured yet
 * (instead of rendering QuickBand with empty dashes).
 */
function PendingConfigBanner() {
  Sentry.captureMessage(
    "ContactoPage: contactConfig es null — configuración pendiente",
    "warning",
  );

  return (
    <div className="bg-bg-surface px-6 py-12 text-center">
      <div className="mx-auto max-w-[480px]">
        <p className="font-sans text-sm font-medium text-fg-default">
          Configuración de contacto pendiente
        </p>
        <p className="mt-1 font-sans text-sm text-fg-muted">
          La información de contacto será visible una vez configurada por el
          administrador.
        </p>
      </div>
    </div>
  );
}
