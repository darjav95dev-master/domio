"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFilters } from "@/features/catalog/hooks/useFilters";
import { cn } from "@/shared/utils/cn";
import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  CONSTRUCTION_STATUS_LABELS,
  AMENITY_LABELS,
} from "@/shared/constants/domain-labels";
import {
  PROPERTY_TYPES,
  OPERATION_TYPES,
  CONSTRUCTION_STATUSES,
  AMENITIES,
} from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterBarProps {
  initialFilters?: {
    island?: string;
    municipality?: string;
    propertyType?: string;
    operation?: string;
    priceMin?: number;
    priceMax?: number;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string[];
    constructionStatus?: string;
  };
}

interface Option {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const OPERATION_OPTS: Option[] = OPERATION_TYPES.filter(
  (o) => o !== "SALE_AND_RENT",
).map((o) => ({ value: o, label: OPERATION_TYPE_LABELS[o] }));

const TYPE_OPTS: Option[] = PROPERTY_TYPES.map((t) => ({
  value: t,
  label: PROPERTY_TYPE_LABELS[t],
}));

const ISLAND_OPTS: Option[] = [
  "Tenerife",
  "Gran Canaria",
  "Lanzarote",
  "Fuerteventura",
  "La Palma",
  "La Gomera",
  "El Hierro",
].map((i) => ({ value: i, label: i }));

const MUNICIPALITY_OPTS: Option[] = [
  "Las Palmas de Gran Canaria",
  "Telde",
  "Santa Lucía de Tirajana",
  "San Bartolomé de Tirajana",
  "Arucas",
  "Gáldar",
  "Ingenio",
  "Agüimes",
  "Mogán",
  "La Aldea de San Nicolás",
].map((m) => ({ value: m, label: m }));

const STATUS_OPTS: Option[] = CONSTRUCTION_STATUSES.map((s) => ({
  value: s,
  label: CONSTRUCTION_STATUS_LABELS[s],
}));

const BEDROOM_OPTS: Option[] = [1, 2, 3, 4].map((n) => ({
  value: String(n),
  label: `${n}+`,
}));

const BATHROOM_OPTS: Option[] = [1, 2, 3].map((n) => ({
  value: String(n),
  label: `${n}+`,
}));

const PRICE_OPTS: Option[] = [
  { value: "50000", label: "50.000 €" },
  { value: "100000", label: "100.000 €" },
  { value: "150000", label: "150.000 €" },
  { value: "200000", label: "200.000 €" },
  { value: "300000", label: "300.000 €" },
  { value: "500000", label: "500.000 €" },
  { value: "750000", label: "750.000 €" },
  { value: "1000000", label: "1.000.000 €" },
];

function priceShort(v: number): string {
  return v >= 1000000 ? `${v / 1000000}M` : `${v / 1000}k`;
}

/** Counts how many of the given values are truthy (active filters). */
function countTruthy(...values: unknown[]): number {
  return values.reduce<number>((n, v) => n + (v ? 1 : 0), 0);
}

/** Builds the price pill label from the min/max bounds. */
function getPriceLabel(priceMin?: number, priceMax?: number): string {
  if (priceMin && priceMax) {
    return `${priceShort(priceMin)}–${priceShort(priceMax)} €`;
  }
  if (priceMin) return `Desde ${priceShort(priceMin)} €`;
  if (priceMax) return `Hasta ${priceShort(priceMax)} €`;
  return "Precio";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FilterBar({ initialFilters }: FilterBarProps) {
  const { filters, setFilter, toggleAmenity, clearFilters } = useFilters();

  const island = filters.island ?? initialFilters?.island;
  const municipality = filters.municipality ?? initialFilters?.municipality;
  const propertyType = filters.propertyType ?? initialFilters?.propertyType;
  const operation = filters.operation ?? initialFilters?.operation;
  const priceMin = filters.priceMin ?? initialFilters?.priceMin;
  const priceMax = filters.priceMax ?? initialFilters?.priceMax;
  const bedrooms = filters.bedrooms ?? initialFilters?.bedrooms;
  const bathrooms = filters.bathrooms ?? initialFilters?.bathrooms;
  const amenities =
    filters.amenities.length > 0 ? filters.amenities : (initialFilters?.amenities ?? []);
  const status = filters.constructionStatus ?? initialFilters?.constructionStatus;

  const moreCount = countTruthy(
    municipality,
    bathrooms,
    status,
    amenities.length > 0,
  );

  const totalActive =
    countTruthy(island, propertyType, operation, priceMin, priceMax, bedrooms) +
    moreCount;

  const priceLabel = getPriceLabel(priceMin, priceMax);

  return (
    <section
      role="search"
      aria-label="Filtrar promociones"
      className="mx-auto flex max-w-[960px] flex-wrap items-center justify-center gap-2.5"
    >
      <SingleSelect
        placeholder="Operación"
        allLabel="Todas las operaciones"
        value={operation}
        options={OPERATION_OPTS}
        onChange={(v) => setFilter("operation", v)}
      />
      <SingleSelect
        placeholder="Tipo"
        allLabel="Todos los tipos"
        value={propertyType}
        options={TYPE_OPTS}
        onChange={(v) => setFilter("propertyType", v)}
      />
      <SingleSelect
        placeholder="Isla"
        allLabel="Todas las islas"
        value={island}
        options={ISLAND_OPTS}
        onChange={(v) => setFilter("island", v)}
      />
      <SingleSelect
        placeholder="Dormitorios"
        allLabel="Cualquiera"
        value={bedrooms != null ? String(bedrooms) : undefined}
        options={BEDROOM_OPTS}
        onChange={(v) => setFilter("bedrooms", v ? Number(v) : undefined)}
      />

      {/* Precio — custom range dropdown */}
      <Dropdown triggerLabel={priceLabel} active={!!(priceMin || priceMax)}>
        {() => (
          <div className="flex gap-3">
            <PriceColumn
              heading="Desde"
              value={priceMin}
              onSelect={(v) => setFilter("priceMin", v)}
            />
            <PriceColumn
              heading="Hasta"
              value={priceMax}
              onSelect={(v) => setFilter("priceMax", v)}
            />
          </div>
        )}
      </Dropdown>

      {/* Más filtros — municipio, baños, estado, servicios */}
      <Dropdown triggerLabel="Más filtros" active={moreCount > 0} badge={moreCount} panelWidth="w-[300px]">
        {(close) => (
          <div className="flex flex-col gap-4 p-1">
            <PanelField label="Municipio">
              <div className="flex max-h-[150px] flex-col overflow-auto">
                <OptionRow selected={!municipality} onClick={() => setFilter("municipality", undefined)}>
                  Todos los municipios
                </OptionRow>
                {MUNICIPALITY_OPTS.map((o) => (
                  <OptionRow
                    key={o.value}
                    selected={municipality === o.value}
                    onClick={() => setFilter("municipality", o.value)}
                  >
                    {o.label}
                  </OptionRow>
                ))}
              </div>
            </PanelField>

            <PanelField label="Baños">
              <ChipRow
                options={BATHROOM_OPTS}
                value={bathrooms != null ? String(bathrooms) : undefined}
                allLabel="Cualquiera"
                onSelect={(v) => setFilter("bathrooms", v ? Number(v) : undefined)}
              />
            </PanelField>

            <PanelField label="Estado de obra">
              <ChipRow
                options={STATUS_OPTS}
                value={status}
                allLabel="Cualquiera"
                onSelect={(v) => setFilter("constructionStatus", v)}
              />
            </PanelField>

            <PanelField label="Servicios">
              <ul className="flex flex-col gap-0.5">
                {AMENITIES.map((a) => (
                  <li key={a}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 font-sans text-sm text-fg-muted transition-colors hover:bg-bg-surface-sunken">
                      <input
                        type="checkbox"
                        checked={amenities.includes(a)}
                        onChange={() => toggleAmenity(a)}
                        className="h-4 w-4 accent-accent-default"
                      />
                      {AMENITY_LABELS[a as keyof typeof AMENITY_LABELS] ?? a}
                    </label>
                  </li>
                ))}
              </ul>
            </PanelField>

            {moreCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  close();
                }}
                className="self-start font-sans text-[13px] text-accent-default underline decoration-accent-default/30 underline-offset-2 transition-colors hover:decoration-accent-default"
              >
                Limpiar estos filtros
              </button>
            )}
          </div>
        )}
      </Dropdown>

      {totalActive > 0 && (
        <button
          type="button"
          onClick={clearFilters}
          className="ml-1 font-sans text-[13px] text-accent-default underline decoration-accent-default/30 underline-offset-2 transition-colors hover:decoration-accent-default"
        >
          Limpiar ({totalActive})
        </button>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Custom dropdown primitives — styled with the site's own typography/tokens
// ---------------------------------------------------------------------------

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function Dropdown({
  triggerLabel,
  active,
  badge,
  panelWidth = "min-w-[200px]",
  children,
}: {
  triggerLabel: string;
  active: boolean;
  badge?: number;
  panelWidth?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useOutsideClose(open, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 whitespace-nowrap rounded-pill border px-4 py-[9px]",
          "font-sans text-[13.5px] font-medium transition-colors duration-standard ease-standard",
          "focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2",
          active || open
            ? "border-fg-default bg-bg-surface text-fg-default"
            : "border-border-default bg-bg-surface text-fg-muted hover:border-fg-default hover:text-fg-default",
        )}
      >
        <span>{triggerLabel}</span>
        {badge ? (
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-default px-1 font-mono text-[10px] leading-none text-white">
            {badge}
          </span>
        ) : null}
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute left-1/2 top-full z-dropdown mt-2 -translate-x-1/2 rounded-surface border border-border-default bg-bg-surface p-1.5",
            "shadow-[0_12px_32px_rgba(var(--shadow-tint),0.16)]",
            panelWidth,
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

function SingleSelect({
  placeholder,
  allLabel,
  value,
  options,
  onChange,
}: {
  placeholder: string;
  allLabel: string;
  value: string | undefined;
  options: Option[];
  onChange: (value: string | undefined) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Dropdown triggerLabel={current ? current.label : placeholder} active={!!value}>
      {(close) => (
        <div className="flex max-h-[300px] min-w-[190px] flex-col overflow-auto">
          <OptionRow
            selected={!value}
            onClick={() => {
              onChange(undefined);
              close();
            }}
          >
            {allLabel}
          </OptionRow>
          {options.map((o) => (
            <OptionRow
              key={o.value}
              selected={value === o.value}
              onClick={() => {
                onChange(o.value);
                close();
              }}
            >
              {o.label}
            </OptionRow>
          ))}
        </div>
      )}
    </Dropdown>
  );
}

function OptionRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-left",
        "font-sans text-sm transition-colors duration-quick ease-standard",
        selected
          ? "bg-accent-subtle font-medium text-accent-default"
          : "text-fg-muted hover:bg-bg-surface-sunken hover:text-fg-default",
      )}
    >
      <span>{children}</span>
      {selected && <Check />}
    </button>
  );
}

function PriceColumn({
  heading,
  value,
  onSelect,
}: {
  heading: string;
  value: number | undefined;
  onSelect: (value: number | undefined) => void;
}) {
  return (
    <div className="min-w-[130px]">
      <p className="mb-1.5 px-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
        {heading}
      </p>
      <div className="flex max-h-[240px] flex-col overflow-auto">
        <OptionRow selected={!value} onClick={() => onSelect(undefined)}>
          Sin límite
        </OptionRow>
        {PRICE_OPTS.map((o) => (
          <OptionRow
            key={o.value}
            selected={value === Number(o.value)}
            onClick={() => onSelect(Number(o.value))}
          >
            {o.label}
          </OptionRow>
        ))}
      </div>
    </div>
  );
}

function ChipRow({
  options,
  value,
  allLabel,
  onSelect,
}: {
  options: Option[];
  value: string | undefined;
  allLabel: string;
  onSelect: (value: string | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <MiniChip active={!value} onClick={() => onSelect(undefined)}>
        {allLabel}
      </MiniChip>
      {options.map((o) => (
        <MiniChip key={o.value} active={value === o.value} onClick={() => onSelect(o.value)}>
          {o.label}
        </MiniChip>
      ))}
    </div>
  );
}

function MiniChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-pill px-3 py-1 font-sans text-[12.5px] font-medium transition-colors duration-quick ease-standard",
        active
          ? "bg-fg-default text-bg-canvas"
          : "border border-border-default text-fg-muted hover:border-fg-default hover:text-fg-default",
      )}
    >
      {children}
    </button>
  );
}

function PanelField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-fg-subtle">
        {label}
      </p>
      {children}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={cn(
        "h-3 w-3 shrink-0 text-fg-subtle transition-transform duration-standard",
        open && "rotate-180",
      )}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-accent-default"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m3 8 3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
