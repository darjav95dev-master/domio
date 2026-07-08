"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
import { LeadStatusBadge } from "./lead-status-badge";
import {
  updateLeadStatusAction,
  addNoteAction,
  reassignLeadAction,
} from "@/features/leads/actions/leads.actions";
import { LEAD_STATUS_TRANSITIONS } from "@/shared/types/lead-schema";
import type {
  LeadRow,
  LeadNoteRow,
  LeadHistoryRow,
} from "@/infrastructure/db/repositories/lead.repository";
import type { LeadStatus, UserRole } from "@/shared/constants/db-enums";

import { LEAD_STATUS_LABELS as STATUS_LABELS } from "@/shared/constants/domain-labels";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUTTON_MONO_CLASS = "px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em]";
const CONTROL_CLASS = [
  "rounded-control border border-border-default bg-bg-surface px-3 py-2",
  "font-sans text-sm text-fg-default",
  "transition-colors duration-standard ease-standard",
  "hover:border-border-strong focus:border-accent-default",
].join(" ");
const INPUT_BASE = [
  "rounded-control border border-border-default px-3 py-2",
  "font-sans text-sm text-fg-default",
  "transition-colors duration-standard ease-standard",
  "hover:border-border-strong focus:border-accent-default",
];

const SOURCE_LABELS: Record<string, string> = {
  commercial: "Comercial",
  institutional: "Institucional",
};

const CHANNEL_LABELS: Record<string, string> = {
  FORM: "Formulario web",
  WHATSAPP: "WhatsApp",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeadDetailProps {
  lead: LeadRow;
  notes: LeadNoteRow[];
  history: LeadHistoryRow[];
  currentUserRole: UserRole;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadDetail({
  lead,
  notes: initialNotes,
  history: initialHistory,
  currentUserRole,
}: LeadDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state
  const [notes, setNotes] = useState<LeadNoteRow[]>(initialNotes);
  const [history, setHistory] = useState<LeadHistoryRow[]>(initialHistory);
  const [currentStatus, setCurrentStatus] = useState<LeadStatus>(
    lead.status as LeadStatus,
  );
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  // Reassign state
  const [showReassign, setShowReassign] = useState(false);
  const [reassignAgentId, setReassignAgentId] = useState("");

  // ── Status change ──────────────────────────────────────────────────────

  const validTransitions = LEAD_STATUS_TRANSITIONS[currentStatus] ?? [];

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      const status = newStatus as LeadStatus;
      if (!validTransitions.includes(status)) return;

      setNoteError(null);
      startTransition(async () => {
        try {
          const updated = await updateLeadStatusAction(lead.id, status);
          setCurrentStatus(updated.status as LeadStatus);

          // Re-fetch history to show the new entry
          const { getLeadDetailAction } = await import(
            "@/features/leads/actions/leads.actions"
          );
          const detail = await getLeadDetailAction(lead.id);
          setHistory(detail.history);
        } catch (err) {
          setNoteError(
            err instanceof Error ? err.message : "Error al cambiar estado",
          );
        }
      });
    },
    [lead.id, validTransitions],
  );

  // ── Add note ───────────────────────────────────────────────────────────

  const handleAddNote = useCallback(
    async (formData: FormData) => {
      const text = formData.get("note") as string;
      if (!text?.trim()) {
        setNoteError("La nota no puede estar vacía");
        return;
      }

      setNoteError(null);
      startTransition(async () => {
        try {
          const newNote = await addNoteAction(lead.id, text.trim());
          setNotes((prev) => [newNote, ...prev]);
          setNoteText("");
        } catch (err) {
          setNoteError(
            err instanceof Error ? err.message : "Error al añadir nota",
          );
        }
      });
    },
    [lead.id],
  );

  // ── Reassign ───────────────────────────────────────────────────────────

  const handleReassign = useCallback(
    async (formData: FormData) => {
      const agentId = formData.get("agentId") as string;
      if (!agentId?.trim()) {
        return;
      }

      startTransition(async () => {
        try {
          await reassignLeadAction(lead.id, agentId.trim());
          setShowReassign(false);
          setReassignAgentId("");
          router.refresh();
        } catch (err) {
          setNoteError(
            err instanceof Error ? err.message : "Error al reasignar lead",
          );
        }
      });
    },
    [lead.id, router],
  );

  // ── Source display ─────────────────────────────────────────────────────

  const sourceLabel = SOURCE_LABELS[lead.source] ?? lead.source;
  const channelLabel = lead.channel
    ? CHANNEL_LABELS[lead.channel] ?? lead.channel
    : null;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg-default">
            {lead.name}
          </h1>
          <p className="mt-1 font-sans text-base text-fg-muted">{lead.email}</p>
        </div>

        <LeadStatusBadge status={currentStatus} />
      </div>

      {/* ── Contact Info ────────────────────────────────────────── */}
      <section
        aria-label="Información de contacto"
        className="rounded-card border border-border-default bg-bg-surface p-6"
      >
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
          Información de contacto
        </h2>

        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              Teléfono
            </dt>
            <dd className="mt-1 font-sans text-sm text-fg-default">
              {lead.phone ?? "—"}
            </dd>
          </div>

          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              Source
            </dt>
            <dd className="mt-1 font-sans text-sm text-fg-default">
              {sourceLabel}
            </dd>
          </div>

          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              Canal
            </dt>
            <dd className="mt-1 font-sans text-sm text-fg-default">
              {channelLabel ?? "—"}
            </dd>
          </div>

          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              Creado
            </dt>
            <dd className="mt-1 font-sans text-sm text-fg-default">
              {formatDate(lead.createdAt)}
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
              Mensaje
            </dt>
            <dd className="mt-1 font-sans text-sm text-fg-default">
              {lead.message ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Status Change ───────────────────────────────────────── */}
      <section
        aria-label="Cambiar estado"
        className="rounded-card border border-border-default bg-bg-surface p-6"
      >
        <div className="flex items-center gap-4">
          <label
            htmlFor="lead-status-change"
            className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
          >
            Cambiar estado
          </label>

          <select
            id="lead-status-change"
            value=""
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={validTransitions.length === 0 || isPending}
            className={cn(CONTROL_CLASS, "disabled:cursor-not-allowed disabled:opacity-50")}
            aria-label="Cambiar estado del lead"
          >
            <option value="" disabled>
              {validTransitions.length === 0
                ? "Estado terminal"
                : "Seleccionar…"}
            </option>
            {validTransitions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Notes ───────────────────────────────────────────────── */}
      <section
        aria-label="Notas internas"
        className="rounded-card border border-border-default bg-bg-surface p-6"
      >
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
          Notas internas
        </h2>

        {/* Note list */}
        <div className="mt-4 space-y-3">
          {notes.length === 0 && (
            <p className="font-sans text-sm text-fg-subtle">
              No hay notas todavía.
            </p>
          )}

          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border-subtle bg-bg-canvas p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-sans text-sm text-fg-default">{note.body}</p>
              </div>
              <p className="mt-1 font-mono text-[10px] text-fg-subtle">
                {formatDate(note.createdAt)}
              </p>
            </div>
          ))}
        </div>

        {/* Add note form */}
        <form
          action={handleAddNote}
          className="mt-4 flex items-start gap-3"
        >
          <div className="flex-1">
            <label htmlFor="note-input" className="sr-only">
              Nueva nota
            </label>
            <textarea
              id="note-input"
              name="note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Escribe una nota…"
              rows={2}
              className={cn(
                INPUT_BASE.join(" "),
                "w-full bg-bg-canvas placeholder:text-fg-subtle resize-none",
              )}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isPending || !noteText.trim()}
            aria-label="Añadir nota"
            className={cn(BUTTON_MONO_CLASS)}
          >
            {isPending ? "Guardando…" : "Añadir nota"}
          </Button>
        </form>

        {noteError && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-2 font-sans text-sm text-status-danger-default"
          >
            {noteError}
          </p>
        )}
      </section>

      {/* ── History Timeline ────────────────────────────────────── */}
      <section
        aria-label="Histórico de cambios"
        className="rounded-card border border-border-default bg-bg-surface p-6"
      >
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
          Histórico de cambios
        </h2>

        {history.length === 0 && (
          <p className="mt-4 font-sans text-sm text-fg-subtle">
            No hay cambios registrados.
          </p>
        )}

        {history.length > 0 && (
          <ol className="mt-4 space-y-0">
            {history.map((entry, idx) => (
              <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Timeline line */}
                {idx < history.length - 1 && (
                  <div
                    className="absolute left-[7px] top-5 h-full w-px bg-border-default"
                    aria-hidden="true"
                  />
                )}

                {/* Timeline dot */}
                <div className="relative flex shrink-0 items-start pt-1">
                  <div
                    className={cn(
                      "h-3.5 w-3.5 rounded-full border-2",
                      idx === 0
                        ? "border-accent-default bg-accent-subtle"
                        : "border-border-strong bg-bg-surface",
                    )}
                    aria-hidden="true"
                  />
                </div>

                {/* Timeline content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-sans text-sm font-medium text-fg-default">
                      {STATUS_LABELS[entry.toStatus as LeadStatus] ??
                        entry.toStatus}
                    </span>
                    <span className="font-sans text-xs text-fg-subtle">
                      {entry.fromStatus
                        ? `desde ${STATUS_LABELS[entry.fromStatus as LeadStatus] ?? entry.fromStatus}`
                        : "Estado inicial"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
                    {formatDate(entry.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Reassign (ADMIN only) ───────────────────────────────── */}
      {currentUserRole === "ADMIN" && (
        <section
          aria-label="Reasignar lead"
          className="rounded-card border border-border-default bg-bg-surface p-6"
        >
          {!showReassign ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowReassign(true)}
              aria-label="Reasignar lead a otro agente"
              className={cn("font-mono text-[11px] uppercase tracking-[0.08em]")}
            >
              Reasignar
            </Button>
          ) : (
            <form action={handleReassign} className="flex items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="reassign-agent"
                  className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle"
                >
                  Nuevo agente (ID)
                </label>
                <input
                  id="reassign-agent"
                  name="agentId"
                  type="text"
                  value={reassignAgentId}
                  onChange={(e) => setReassignAgentId(e.target.value)}
                  placeholder="ID del agente…"
                className={cn(
                  INPUT_BASE.join(" "),
                  "mt-1 w-full bg-bg-canvas placeholder:text-fg-subtle",
                )}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isPending || !reassignAgentId.trim()}
                aria-label="Confirmar reasignación"
                className={cn(BUTTON_MONO_CLASS)}
              >
                {isPending ? "Reasignando…" : "Confirmar"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowReassign(false);
                  setReassignAgentId("");
                }}
                aria-label="Cancelar reasignación"
                className={cn(BUTTON_MONO_CLASS)}
              >
                Cancelar
              </Button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
