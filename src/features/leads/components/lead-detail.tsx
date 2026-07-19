"use client";

import { cn } from "@/shared/utils/cn";
import { LeadStatusBadge } from "./lead-status-badge";
import { LeadNotesSection } from "./lead-notes-section";
import { LeadHistorySection } from "./lead-history-section";
import { LeadReassignDialog } from "./lead-reassign-dialog";
import { useLeadDetail } from "@/features/leads/hooks/use-lead-detail";
import type {
  LeadRow,
  LeadNoteRow,
  LeadHistoryRow,
} from "@/infrastructure/db/repositories/lead.repository";
import type { UserRole } from "@/shared/constants/db-enums";

import { LEAD_STATUS_LABELS as STATUS_LABELS } from "@/shared/constants/domain-labels";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTROL_CLASS = [
  "rounded-control border border-border-default bg-bg-surface px-3 py-2",
  "font-sans text-sm text-fg-default",
  "transition-colors duration-standard ease-standard",
  "hover:border-border-strong focus:border-accent-default",
].join(" ");

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
  const {
    notes,
    history,
    currentStatus,
    noteText,
    noteError,
    isPending,
    validTransitions,
    handleStatusChange,
    handleAddNote,
    handleReassign,
    setNoteText,
    showReassign,
    setShowReassign,
    reassignAgentId,
    setReassignAgentId,
  } = useLeadDetail(lead, initialNotes, initialHistory);

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
        <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle">
          Estado
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm text-fg-muted">Actual:</span>
            <span className="font-sans text-sm font-medium text-fg-default">
              {STATUS_LABELS[currentStatus] ?? currentStatus}
            </span>
          </div>

          {validTransitions.length > 0 ? (
            <div className="flex items-center gap-2">
              <label
                htmlFor="lead-status-change"
                className="font-sans text-sm text-fg-muted"
              >
                Cambiar a:
              </label>
              <select
                id="lead-status-change"
                value=""
                onChange={(e) => {
                  if (e.target.value) handleStatusChange(e.target.value);
                }}
                disabled={isPending}
                className={cn(CONTROL_CLASS, "disabled:cursor-not-allowed disabled:opacity-50")}
                aria-label="Cambiar estado del lead"
              >
                <option value="" disabled>Seleccionar…</option>
                {validTransitions.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="rounded-pill bg-bg-subtle px-3 py-1 font-sans text-xs text-fg-muted">
              Estado terminal — sin más transiciones
            </span>
          )}

          {isPending && (
            <span className="font-sans text-xs text-fg-subtle">Guardando…</span>
          )}
        </div>
      </section>

      <LeadNotesSection
        notes={notes}
        noteText={noteText}
        noteError={noteError}
        isPending={isPending}
        handleAddNote={handleAddNote}
        setNoteText={setNoteText}
      />

      <LeadHistorySection history={history} />

      <LeadReassignDialog
        currentUserRole={currentUserRole}
        showReassign={showReassign}
        reassignAgentId={reassignAgentId}
        isPending={isPending}
        handleReassign={handleReassign}
        setShowReassign={setShowReassign}
        setReassignAgentId={setReassignAgentId}
      />
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
