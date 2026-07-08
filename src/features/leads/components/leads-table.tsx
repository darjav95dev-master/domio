"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/domain-config";
import { LeadStatusBadge } from "./lead-status-badge";
import type { LeadRow } from "@/infrastructure/db/repositories/lead.repository";
import type { LeadStatus, LeadSource } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const LABEL_CLASS = "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle";
const SELECT_CLASS = [
  "rounded-control border border-border-default bg-bg-surface px-3 py-2.5",
  "font-sans text-sm text-fg-default",
  "transition-colors duration-standard ease-standard",
  "hover:border-border-strong focus:border-accent-default focus-visible:outline-offset-[-2px]",
].join(" ");
const PAGINATION_BTN_CLASS = "rounded-control px-3 py-1.5 font-sans text-sm transition-colors duration-standard ease-standard focus-visible:outline-offset-[-2px]";

const INPUT_CLASS = [
  "rounded-control border border-border-default bg-bg-surface px-3 py-2.5",
  "font-sans text-sm text-fg-default placeholder:text-fg-subtle",
  "transition-colors duration-standard ease-standard",
  "hover:border-border-strong focus:border-accent-default focus-visible:outline-offset-[-2px]",
].join(" ");

const STATUS_OPTIONS: Array<{ value: LeadStatus | ""; label: string }> = [
  { value: "", label: "Todos los estados" },
  { value: "NEW", label: "Nuevo" },
  { value: "CONTACTED", label: "Contactado" },
  { value: "IN_NEGOTIATION", label: "En negociación" },
  { value: "WON", label: "Ganado" },
  { value: "LOST", label: "Perdido" },
];

const SOURCE_OPTIONS: Array<{ value: LeadSource | ""; label: string }> = [
  { value: "", label: "Todos los sources" },
  { value: "commercial", label: "Comercial" },
  { value: "institutional", label: "Institucional" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadsTableFilters {
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
}

export interface LeadsTableProps {
  leads: LeadRow[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onFiltersChange: (filters: LeadsTableFilters, page?: number) => void;
  unreadLeadIds?: Set<string>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadsTable({
  leads,
  total,
  page,
  onPageChange,
  onFiltersChange,
  unreadLeadIds = new Set(),
}: LeadsTableProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Local filter state for controlled inputs
  const [localStatus, setLocalStatus] = useState<string>("");
  const [localSource, setLocalSource] = useState<string>("");
  const [localSearch, setLocalSearch] = useState<string>("");

  const handleStatusChange = useCallback(
    (value: string) => {
      setLocalStatus(value);
      if (value === "") {
        onFiltersChange({ source: localSource ? (localSource as LeadSource) : undefined, search: localSearch || undefined }, 1);
      } else {
        onFiltersChange({ status: value as LeadStatus, source: localSource ? (localSource as LeadSource) : undefined, search: localSearch || undefined }, 1);
      }
    },
    [localSource, localSearch, onFiltersChange],
  );

  const handleSourceChange = useCallback(
    (value: string) => {
      setLocalSource(value);
      if (value === "") {
        onFiltersChange({ status: localStatus ? (localStatus as LeadStatus) : undefined, search: localSearch || undefined }, 1);
      } else {
        onFiltersChange({ status: localStatus ? (localStatus as LeadStatus) : undefined, source: value as LeadSource, search: localSearch || undefined }, 1);
      }
    },
    [localStatus, localSearch, onFiltersChange],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      onFiltersChange({ status: localStatus ? (localStatus as LeadStatus) : undefined, source: localSource ? (localSource as LeadSource) : undefined, search: value || undefined }, 1);
    },
    [localStatus, localSource, onFiltersChange],
  );

  const navigateToDetail = useCallback(
    (leadId: string) => {
      router.push(`/panel/leads/${leadId}`);
    },
    [router],
  );

  // ── Empty state ────────────────────────────────────────────────────────

  if (leads.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <FilterBar
          status={localStatus}
          source={localSource}
          search={localSearch}
          onStatusChange={handleStatusChange}
          onSourceChange={handleSourceChange}
          onSearchChange={handleSearchChange}
        />
        <div className="flex flex-col items-center justify-center rounded-card border border-border-default bg-bg-surface py-16">
          <p className="font-sans text-base text-fg-muted">
            No se encontraron leads
          </p>
          <p className="mt-1 font-sans text-sm text-fg-subtle">
            Prueba a ajustar los filtros o crear un nuevo lead.
          </p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <FilterBar
        status={localStatus}
        source={localSource}
        search={localSearch}
        onStatusChange={handleStatusChange}
        onSourceChange={handleSourceChange}
        onSearchChange={handleSearchChange}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-border-default bg-bg-surface">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-default bg-bg-surface-sunken">
              <Th>Nombre</Th>
              <Th>Email</Th>
              <Th>Estado</Th>
              <Th>Source</Th>
              <Th>Fecha</Th>
              <Th className="w-10">
                <span className="sr-only">Leído</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const isUnread = unreadLeadIds.has(lead.id);

              return (
                <tr
                  key={lead.id}
                  onClick={() => navigateToDetail(lead.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigateToDetail(lead.id);
                    }
                  }}
                  tabIndex={0}
                  role="row"
                  aria-label={`${lead.name} — ${lead.email} — ${lead.status}`}
                  className={cn(
                    "cursor-pointer border-b border-border-default transition-colors duration-standard ease-standard",
                    "hover:bg-accent-subtle/30 focus-visible:outline-offset-[-2px]",
                    isUnread && "font-medium",
                  )}
                >
                  <Td>
                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full bg-accent-default"
                          aria-label="No leído"
                        />
                      )}
                      <span className={cn(isUnread && "font-semibold")}>
                        {lead.name}
                      </span>
                    </div>
                  </Td>
                  <Td className="text-fg-muted">{lead.email}</Td>
                  <Td>
                    <LeadStatusBadge
                      status={lead.status as LeadStatus}
                    />
                  </Td>
                  <Td className="font-sans text-sm text-fg-muted">
                    {lead.source === "commercial" ? "Comercial" : "Institucional"}
                  </Td>
                  <Td className="font-sans text-sm text-fg-muted whitespace-nowrap">
                    {formatDate(lead.createdAt)}
                  </Td>
                  <Td>
                    <span aria-hidden="true" />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FilterBarProps {
  status: string;
  source: string;
  search: string;
  onStatusChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

function FilterBar({
  status,
  source,
  search,
  onStatusChange,
  onSourceChange,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Status filter */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-status"
          className={LABEL_CLASS}
        >
          Estado
        </label>
        <select
          id="filter-status"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className={SELECT_CLASS}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Source filter */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-source"
          className={LABEL_CLASS}
        >
          Source
        </label>
        <select
          id="filter-source"
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          className={SELECT_CLASS}
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="filter-search"
          className="sr-only"
        >
          Buscar
        </label>
        <input
          id="filter-search"
          type="search"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(INPUT_CLASS, "min-w-[200px]")}
        />
      </div>
    </div>
  );
}

interface ThProps {
  children: React.ReactNode;
  className?: string;
}

function Th({ children, className }: ThProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-fg-subtle",
        className,
      )}
    >
      {children}
    </th>
  );
}

interface TdProps {
  children: React.ReactNode;
  className?: string;
}

function Td({ children, className }: TdProps) {
  return (
    <td className={cn("px-4 py-3 font-sans text-sm", className)}>
      {children}
    </td>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  total,
  onPageChange,
}: PaginationProps) {
  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between"
    >
      <p className="font-sans text-sm text-fg-muted">
        {total} lead{total !== 1 ? "s" : ""} — página {currentPage} de{" "}
        {totalPages}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
          className={cn(
            PAGINATION_BTN_CLASS,
            "hover:bg-accent-subtle",
            currentPage <= 1
              ? "cursor-not-allowed text-fg-subtle opacity-50"
              : "text-fg-default",
          )}
        >
          Anterior
        </button>

        {generatePageNumbers(currentPage, totalPages).map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 font-sans text-sm text-fg-subtle"
              aria-hidden="true"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              aria-label={`Ir a página ${p}`}
              aria-current={currentPage === p ? "page" : undefined}
              className={cn(
                PAGINATION_BTN_CLASS,
                currentPage === p
                  ? "bg-accent-default text-fg-on-inverted"
                  : "text-fg-default hover:bg-accent-subtle",
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Página siguiente"
          className={cn(
            PAGINATION_BTN_CLASS,
            "hover:bg-accent-subtle",
            currentPage >= totalPages
              ? "cursor-not-allowed text-fg-subtle opacity-50"
              : "text-fg-default",
          )}
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePageNumbers(
  current: number,
  total: number,
): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "..."> = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push("...");
  }

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  // Always show last page
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
