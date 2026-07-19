"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Key, FunnelSimple } from "@phosphor-icons/react";
import { getApiKeysAction } from "@/features/api-keys/actions/api-keys.actions";
import { Button } from "@/shared/components/button";
import { Skeleton } from "@/shared/components/skeleton";
import { ICON_SIZES } from "@/shared/constants/iconography";
import { cn } from "@/shared/utils/cn";
import type { ApiKeyResponse, PaginatedApiKeys } from "@/shared/types/api-key-schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Revocadas" },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiKeysTableProps {
  onRevokeKey?: (key: ApiKeyResponse) => void;
  /** IDs to hide immediately (optimistic removal after revocation). */
  excludeIds?: Set<string>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApiKeysTable({ onRevokeKey, excludeIds }: ApiKeysTableProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [data, setData] = useState<PaginatedApiKeys | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const mountedRef = useRef(true);

  // ── Data fetching ─────────────────────────────────────────────────────

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: Record<string, unknown> = {};
    if (statusFilter === "active") filters.isActive = true;
    if (statusFilter === "inactive") filters.isActive = false;

    const result = await getApiKeysAction(filters as Parameters<typeof getApiKeysAction>[0]);

    if (!mountedRef.current) return;

    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    mountedRef.current = true;
    fetchKeys();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchKeys]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  function formatLastUsed(date: Date | null): string {
    if (!date) return "Nunca";
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function renderStatusBadge(isActive: boolean) {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 font-sans text-sm text-status-success-default">
          <span className="h-2 w-2 rounded-full bg-status-success-default" aria-hidden="true" />
          Activa
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 font-sans text-sm text-status-danger-default">
        <span className="h-2 w-2 rounded-full bg-status-danger-default" aria-hidden="true" />
        Revocada
      </span>
    );
  }

  function renderSkeletonRows() {
    return Array.from({ length: 5 }).map((_, i) => (
      <tr key={`sk-${i}`}>
        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
        <td className="px-4 py-3"><Skeleton className="h-8 w-20 rounded-md" /></td>
      </tr>
    ));
  }

  function renderEmptyState() {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-16 text-center">
          <Key
            size={40}
            className="mx-auto mb-4 text-fg-subtle/50"
            aria-hidden="true"
          />
          <p className="font-display text-lg font-medium text-fg-default">
            No hay API keys
          </p>
          <p className="mt-1 font-sans text-sm text-fg-subtle">
            {statusFilter !== "all"
              ? "Prueba a cambiar el filtro"
              : "Crea tu primera API key"}
          </p>
        </td>
      </tr>
    );
  }

  function renderErrorState() {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-16 text-center">
          <p className="font-sans text-sm text-status-danger-default">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={fetchKeys}>
            Reintentar
          </Button>
        </td>
      </tr>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="rounded-surface border border-border-default bg-bg-surface shadow-sm">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border-default px-4 py-3">
        <FunnelSimple size={ICON_SIZES.inline} className="text-fg-subtle" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-api-key-status"
            className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
          >
            Estado
          </label>
          <select
            id="filter-api-key-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-control border border-border-default bg-bg-surface px-3 py-1.5 font-sans text-sm text-fg-default transition-colors hover:border-border-strong focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {data && !loading && (
          <p
            className="ml-auto font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle"
            aria-live="polite"
          >
            {data.total} API key{data.total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table role="table" className="w-full">
          <thead>
            <tr className="border-b border-border-default bg-bg-surface-sunken/50">
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                Nombre
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                Rate limit
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                Último uso
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                Estado
              </th>
              <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && renderSkeletonRows()}
            {!loading && error && renderErrorState()}
            {!loading && !error && data?.items.length === 0 && renderEmptyState()}
            {!loading &&
              !error &&
              data?.items.filter((k) => !excludeIds?.has(k.id)).map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-border-default transition-colors hover:bg-accent-subtle/30"
                >
                  <td className="px-4 py-3 font-sans text-sm font-medium text-fg-default">
                    {key.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-muted">
                    {key.rateLimitPerMin}/min
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-fg-muted">
                    {formatLastUsed(key.lastUsedAt)}
                  </td>
                  <td className="px-4 py-3">{renderStatusBadge(key.isActive)}</td>
                  <td className="px-4 py-3 text-right">
                    {key.isActive && (
                      <button
                        type="button"
                        onClick={() => onRevokeKey?.(key)}
                        aria-label={`Revocar ${key.name}`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5",
                          "font-sans text-sm text-status-danger-default transition-colors duration-quick",
                          "hover:bg-status-danger-subtle",
                          "focus-visible:outline-offset-[-2px]",
                        )}
                      >
                        Revocar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
