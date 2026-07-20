"use client";

import { useState, type FormEvent } from "react";
import { PencilSimple, X, Trash, Power } from "@phosphor-icons/react";
import {
  updateUserAction,
  deactivateUserAction,
  reactivateUserAction,
  deleteUserAction,
} from "@/features/team/actions/team.actions";
import { Button } from "@/shared/components/button";
import { Input } from "@/shared/components/input";
import { USER_ROLES, type UserRole } from "@/shared/constants/db-enums";
import { USER_ROLE_LABELS } from "@/shared/constants/domain-labels";
import { cn } from "@/shared/utils/cn";
import type { UserResponse } from "@/shared/types/user-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserActionsProps {
  user: UserResponse;
  onUpdated: () => void;
  currentUserId?: string;
}

// ---------------------------------------------------------------------------
// Shared button class fragments (extracted to satisfy sonarjs/no-duplicate-string)
// ---------------------------------------------------------------------------

const ACTION_BUTTON_BASE =
  "inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-sans text-sm transition-colors duration-quick focus-visible:outline-offset-[-2px]";
const ACTION_BUTTON_MUTED =
  "text-fg-muted hover:bg-accent-subtle hover:text-accent-default";
const ACTION_BUTTON_DANGER =
  "text-status-danger-default hover:bg-status-danger-subtle";
const ACTION_BUTTON_SUCCESS =
  "text-status-success-default hover:bg-status-success-subtle disabled:opacity-60";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserActions({ user, onUpdated, currentUserId }: UserActionsProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // ── Edit handlers ──────────────────────────────────────────────────────

  function handleCancelEdit() {
    setEditing(false);
    setName(user.name ?? "");
    setEmail(user.email);
    setRole(user.role);
    setError(null);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result = await updateUserAction(user.id, { name, email, role });

    setSaving(false);

    if (result.success) {
      setEditing(false);
      onUpdated();
    } else {
      setError(result.error);
    }
  }

  // ── Deactivate handlers ────────────────────────────────────────────────

  async function handleDeactivate() {
    setDeactivating(true);
    setWarning(null);
    const result = await deactivateUserAction(user.id);
    setDeactivating(false);

    if (result.success) {
      if ("warning" in result && result.warning) {
        setWarning(result.warning);
      }
      setConfirmDeactivate(false);
      onUpdated();
    } else {
      setError(result.error);
    }
  }

  // ── Reactivate handlers ────────────────────────────────────────────────

  async function handleReactivate() {
    setReactivating(true);
    setError(null);
    const result = await reactivateUserAction(user.id);
    setReactivating(false);

    if (result.success) {
      onUpdated();
    } else {
      setError(result.error);
    }
  }

  // ── Delete handlers ────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteUserAction(user.id);
    setDeleting(false);

    if (result.success) {
      setConfirmDelete(false);
      onUpdated();
    } else {
      setError(result.error);
    }
  }

  // ── Render: edit form ──────────────────────────────────────────────────

  if (editing) {
    return (
      <div
        aria-label="Editar usuario"
        className="rounded-surface border border-border-default bg-bg-surface p-4 text-left"
      >
        <form onSubmit={handleEditSubmit}>
          <div className="flex flex-col gap-3">
            <Input
              id={`edit-name-${user.id}`}
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              id={`edit-email-${user.id}`}
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Role select */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor={`edit-role-${user.id}`}
                className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
              >
                Rol
              </label>
              <select
                id={`edit-role-${user.id}`}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="rounded-control border border-border-default bg-bg-surface px-4 py-3 font-sans text-base text-fg-default transition-colors hover:border-border-strong focus:border-accent-default focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-2"
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {USER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p
                role="alert"
                aria-live="polite"
                className="font-sans text-sm text-status-danger-default"
              >
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="text-sm"
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEdit}
                disabled={saving}
                className="text-sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ── Render: deactivate confirmation ────────────────────────────────────

  if (confirmDeactivate) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar desactivación"
        className="rounded-surface border border-border-default bg-bg-surface p-6 text-center"
      >
        <p className="font-sans text-base font-semibold text-fg-default">
          ¿Desactivar a {user.name ?? user.email}?
        </p>
        <p className="mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-fg-subtle">
          El usuario no podrá acceder al panel. Sus asignaciones históricas
          se mantendrán.
        </p>

        {user.id === currentUserId && (
          <p
            role="alert"
            className="mx-auto mt-4 max-w-md rounded-md border border-status-warning-default/40 bg-status-warning-subtle px-3 py-2 font-sans text-sm text-status-warning-default"
          >
            Te has desactivado a ti mismo. Si eras el último ADMIN, el
            tenant queda sin acceso.
          </p>
        )}

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-3 font-sans text-sm text-status-danger-default"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Button
            variant="primary"
            onClick={handleDeactivate}
            disabled={deactivating}
            className="text-sm"
          >
            {deactivating ? "Desactivando..." : "Sí, desactivar"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setConfirmDeactivate(false)}
            disabled={deactivating}
            className="text-sm"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: delete confirmation ────────────────────────────────────────

  if (confirmDelete) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar eliminación"
        className="rounded-surface border border-status-danger-default/40 bg-bg-surface p-6 text-center"
      >
        <p className="font-sans text-base font-semibold text-fg-default">
          ¿Eliminar a {user.name ?? user.email}?
        </p>
        <p className="mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-fg-subtle">
          Esta acción es <strong className="text-fg-default">definitiva</strong>.
          El usuario se borrará del tenant y ya no podrá iniciar sesión.
          Las asignaciones de leads y promociones se liberarán (set null);
          el historial asociado al usuario se eliminará en cascada.
        </p>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="mx-auto mt-3 max-w-md rounded-md border border-status-danger-default/40 bg-status-danger-subtle px-3 py-2 font-sans text-sm text-status-danger-default"
          >
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-2">
          <Button
            variant="primary"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm"
          >
            {deleting ? "Eliminando..." : "Sí, eliminar"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmDelete(false);
              setError(null);
            }}
            disabled={deleting}
            className="text-sm"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ── Render: default (action buttons) ───────────────────────────────────

  return (
    <div>
      {warning && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-status-warning-default/40 bg-status-warning-subtle px-3 py-2 font-sans text-sm text-status-warning-default"
        >
          {warning}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Editar ${user.name ?? user.email}`}
        className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_MUTED)}
      >
        <PencilSimple size={14} aria-hidden="true" />
        Editar
      </button>

      {user.isActive ? (
        <button
          type="button"
          onClick={() => setConfirmDeactivate(true)}
          aria-label={`Desactivar ${user.name ?? user.email}`}
          className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DANGER)}
        >
          <X size={14} aria-hidden="true" />
          Desactivar
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={handleReactivate}
            disabled={reactivating}
            aria-label={`Reactivar ${user.name ?? user.email}`}
            className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_SUCCESS)}
          >
            <Power size={14} aria-hidden="true" />
            {reactivating ? "Activando..." : "Activar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Eliminar ${user.name ?? user.email}`}
            className={cn(ACTION_BUTTON_BASE, ACTION_BUTTON_DANGER)}
          >
            <Trash size={14} aria-hidden="true" />
            Eliminar
          </button>
        </>
      )}
    </div>
    </div>
  );
}
