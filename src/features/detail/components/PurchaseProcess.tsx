// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PurchaseProcessProps {
  /** Operation drives which process copy is shown. */
  operation: string | null;
}

interface Step {
  title: string;
  desc: string;
}

// ---------------------------------------------------------------------------
// Process definitions (standard Spanish real-estate flow)
// ---------------------------------------------------------------------------

const SALE_STEPS: Step[] = [
  {
    title: "Visita",
    desc: "Concertamos una visita al inmueble y resolvemos todas tus dudas sin compromiso.",
  },
  {
    title: "Reserva",
    desc: "Formalizas la reserva del inmueble para retirarlo del mercado mientras se prepara la documentación.",
  },
  {
    title: "Contrato de arras",
    desc: "Firmamos el contrato de arras con las condiciones de la compraventa y el calendario acordado.",
  },
  {
    title: "Firma de escritura",
    desc: "Firma ante notario y entrega de llaves. Te acompañamos en cada paso del proceso.",
  },
];

const RENT_STEPS: Step[] = [
  {
    title: "Visita",
    desc: "Concertamos una visita al inmueble y resolvemos todas tus dudas sin compromiso.",
  },
  {
    title: "Solicitud",
    desc: "Presentas la documentación necesaria y estudiamos la solicitud de alquiler.",
  },
  {
    title: "Contrato y fianza",
    desc: "Firmamos el contrato de arrendamiento y se deposita la fianza según la normativa vigente.",
  },
  {
    title: "Entrega de llaves",
    desc: "Entrega de llaves y puesta a disposición del inmueble en la fecha acordada.",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PurchaseProcess — the four-step column layout from the reference "Plan de
 * aportaciones", adapted to the standard real-estate process (purchase or
 * rental depending on operation). Same visual system, agency content.
 */
export function PurchaseProcess({ operation }: PurchaseProcessProps) {
  const steps = operation === "RENT" ? RENT_STEPS : SALE_STEPS;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step.title} className="relative border-t border-border-default pt-8">
          <span
            className="pointer-events-none absolute right-0 top-[18px] font-display text-[64px] font-normal italic leading-none tracking-[-0.02em] text-fg-subtle opacity-50"
            aria-hidden="true"
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="mb-[14px] pr-14 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-terracota">
            Paso {index + 1}
          </div>
          <div className="mb-[14px] font-display text-[28px] font-normal leading-none tracking-[-0.025em] text-fg-default">
            {step.title}
          </div>
          <p className="max-w-[240px] text-[13px] leading-[1.65] text-fg-muted">
            {step.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
