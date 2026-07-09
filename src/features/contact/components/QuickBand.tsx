import { Phone, Envelope, MapPin, Clock } from "@phosphor-icons/react/dist/ssr";
import type { ContactConfigData } from "@/features/contact/types";

interface QuickBandItem {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
}

/**
 * QuickBand — 4-column grid showing contact data from contact_config.
 *
 * Matches design.md §13.4 block #3:
 *   bg.surface, 4 columns. Each cell: icon + caption + value.
 *
 * Server Component — no interactivity.
 */
export function QuickBand({ config }: { config: ContactConfigData | null }) {
  const items: QuickBandItem[] = [
    {
      icon: <Phone size={20} weight="regular" aria-hidden="true" />,
      label: "Teléfono",
      value: config?.phone ?? null,
      href: config?.phone ? `tel:${config.phone.replace(/\s/g, "")}` : undefined,
    },
    {
      icon: <Envelope size={20} weight="regular" aria-hidden="true" />,
      label: "Email",
      value: config?.email ?? null,
      href: config?.email ? `mailto:${config.email}` : undefined,
    },
    {
      icon: <MapPin size={20} weight="regular" aria-hidden="true" />,
      label: "Oficina",
      value: config?.address ?? null,
    },
    {
      icon: <Clock size={20} weight="regular" aria-hidden="true" />,
      label: "Horario",
      value: config?.hours ?? null,
    },
  ];

  return (
    <div className="bg-bg-surface">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-px bg-border-subtle md:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-4 bg-bg-surface px-6 py-12 text-center"
          >
            {/* Icon */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-subtle text-accent-default">
              {item.icon}
            </div>

            {/* Label */}
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
              {item.label}
            </p>

            {/* Value */}
            {item.href ? (
              <a
                href={item.href}
                className="font-sans text-base leading-[1.55] text-fg-default transition-colors duration-150 ease-standard hover:text-accent-default focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-3"
              >
                {item.value ?? "—"}
              </a>
            ) : (
              <p className="font-sans text-base leading-[1.55] text-fg-default">
                {item.value ?? "—"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
