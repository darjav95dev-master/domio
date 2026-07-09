"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UsersThree, FunnelSimple } from "@phosphor-icons/react";
import { getUsersAction } from "@/features/team/actions/team.actions";
import { Button } from "@/shared/components/button";
import { Skeleton } from "@/shared/components/skeleton";
import { USER_ROLES, type UserRole } from "@/shared/constants/db-enums";
import { USER_ROLE_LABELS } from "@/shared/constants/domain-labels";
import { ICON_SIZES } from "@/shared/constants/iconography";
import { cn } from "@/shared/utils/cn";
import type { UserResponse, PaginatedUsers } from "@/shared/types/user-schema";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsersTableProps {
  /** Optional callback when edit is clicked */
  onEditUser?: (user: UserResponse) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsersTable({ onEditUser }: UsersTableProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [data, setData] = useState<PaginatedUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  // Track mounted state to avoid state updates after unmount
  const mountedRef = useRef(true);

  // ── Data fetching ─────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: Record<string, unknown> = {};
    if (roleFilter !== "all") filters.role = roleFilter;
    if (statusFilter === "active") filters.isActive = true;
    if (statusFilter === "inactive") filters.isActive = false;

    const result = await getUsersAction(filters as Parameters<typeof getUsersAction>[0]);

    if (!mountedRef.current) return;

    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    mountedRef.current = true;
    fetchUsers();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchUsers]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter]);

  // ── Render helpers ─────────────────────────────────────────────────────

  function renderRoleBadge(role: UserRole) {
    const roleStyles: Record<UserRole, string> = {
      ADMIN: "bg-accent-subtle text-accent-default",
      OPERATOR: "bg-status-info-subtle text-status-info-default",
      AGENT: "bg-status-success-subtle text-status-success-default",
    };

    return (
      <span
        className={cn(
          "inline-block rounded-pill px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em]",
          roleStyles[role],
        )}
      >
        {USER_ROLE_LABELS[role]}
      </span>
    );
  }

  function renderStatusBadge(isActive: boolean) {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 font-sans text-sm text-status-success-default">
          <span className="h-2 w-2 rounded-full bg-status-success-default" aria-hidden="true" />
          Activo
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 font-sans text-sm text-fg-subtle">
        <span className="h-2 w-2 rounded-full bg-fg-subtle" aria-hidden="true" />
        Inactivo
      </span>
    );
  }

  function renderSkeletonRows() {
    return Array.from({ length: 5 }).map((_, i) => (
      <tr key={`skeleton-${i}`}>
        <td className="px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </td>
        <td className="px-4 py-3">
          <Skeleton className="h-4 w-48" />
        </td>
        <td className="px-4 py-3">
          <Skeleton className="h-5 w-24 rounded-pill" />
        </td>
        <td className="px-4 py-3">
          <Skeleton className="h-4 w-16" />
        </td>
        <td className="px-4 py-3">
          <Skeleton className="h-8 w-16 rounded-md" />
        </td>
      </tr>
    ));
  }

  function renderEmptyState() {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-16 text-center">
          <UsersThree
            size={40}
            className="mx-auto mb-4 text-fg-subtle/50"
            aria-hidden="true"
          />
          <p className="font-display text-lg font-medium text-fg-default">
            No hay usuarios
          </p>
          <p className="mt-1 font-sans text-sm text-fg-subtle">
            {roleFilter !== "all" || statusFilter !== "all"
              ? "Prueba a cambiar los filtros"
              : "Invita a tu primer colaborador"}
          </p>
        </td>
      </tr>
    );
  }

  function renderErrorState() {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-16 text-center">
          <p className="font-sans text-sm text-status-danger-default">
            {error}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={fetchUsers}
          >
            Reintentar
          </Button>
        </td>
      </tr>
    );
  }

  function renderPagination() {
    if (!data || totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between border-t border-border-default px-4 py-3">
        <p className="font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle">
          Página {page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="Página anterior"
            className={cn(
              "rounded-md px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] transition-colors duration-quick",
              page <= 1
                ? "cursor-not-allowed text-fg-subtle/50"
                : "text-fg-muted hover:bg-accent-subtle hover:text-accent-default",
            )}
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            aria-label="Página siguiente"
            className={cn(
              "rounded-md px-3 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] transition-colors duration-quick",
              page >= totalPages
                ? "cursor-not-allowed text-fg-subtle/50"
                : "text-fg-muted hover:bg-accent-subtle hover:text-accent-default",
            )}
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="rounded-surface border border-border-default bg-bg-surface shadow-sm">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border-default px-4 py-3">
        <FunnelSimple size={ICON_SIZES.inline} className="text-fg-subtle" aria-hidden="true" />

        {/* Role filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-role"
            className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
          >
            Rol
          </label>
          <select
            id="filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-control border border-border-default bg-bg-surface px-3 py-1.5 font-sans text-sm text-fg-default transition-colors hover:border-border-strong focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2"
          >
            <option value="all">Todos</option>
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="filter-status"
            className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
          >
            Estado
          </label>
          <select
            id="filter-status"
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

        {/* Result count */}
        {data && !loading && (
          <p
            className="ml-auto font-mono text-[11px] tracking-[0.04em] tabular-nums text-fg-subtle"
            aria-live="polite"
          >
            {data.total} {data.total === 1 ? "usuario" : "usuarios"}
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
                Email
              </th>
              <th className="px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
                Rol
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
            {!loading && !error && data && data.items.length === 0 && renderEmptyState()}
            {!loading &&
              !error &&
              data?.items.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border-default transition-colors hover:bg-accent-subtle/30"
                >
                  <td className="px-4 py-3 font-sans text-sm font-medium text-fg-default">
                    {user.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-sans text-sm text-fg-muted">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">{renderRoleBadge(user.role)}</td>
                  <td className="px-4 py-3">{renderStatusBadge(user.isActive)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="link"
                      className="text-sm"
                      onClick={() => onEditUser?.(user)}
                      aria-label={`Editar ${user.name ?? user.email}`}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}
