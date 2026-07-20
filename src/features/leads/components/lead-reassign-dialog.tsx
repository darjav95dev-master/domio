"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
import { getUsersAction } from "@/features/team/actions/team.actions";
import type { UserRole } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUTTON_MONO_CLASS = "px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em]";
const INPUT_BASE = [
  "rounded-control border border-border-default px-3 py-2",
  "font-sans text-sm text-fg-default",
  "transition-colors duration-standard ease-standard",
  "hover:border-border-strong focus:border-accent-default",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentOption {
  id: string;
  label: string;
}

interface LeadReassignDialogProps {
  currentUserRole: UserRole;
  showReassign: boolean;
  reassignAgentId: string;
  isPending: boolean;
  handleReassign: (formData: FormData) => Promise<void>;
  setShowReassign: (show: boolean) => void;
  setReassignAgentId: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadReassignDialog({
  currentUserRole,
  showReassign,
  reassignAgentId,
  isPending,
  handleReassign,
  setShowReassign,
  setReassignAgentId,
}: LeadReassignDialogProps) {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Load active agents when the reassign form is opened.
  useEffect(() => {
    if (!showReassign) return;

    let alive = true;
    setLoadingAgents(true);
    getUsersAction({ role: "AGENT", isActive: true }).then((result) => {
      if (!alive) return;
      if (result.success) {
        setAgents(
          result.data.items.map((u) => ({ id: u.id, label: u.name ?? u.email })),
        );
      }
      setLoadingAgents(false);
    });

    return () => {
      alive = false;
    };
  }, [showReassign]);

  if (currentUserRole !== "ADMIN") return null;

  let placeholderLabel = "Selecciona un agente";
  if (loadingAgents) placeholderLabel = "Cargando agentes…";
  else if (agents.length === 0) placeholderLabel = "No hay agentes activos";

  return (
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
              Nuevo agente
            </label>
            <select
              id="reassign-agent"
              name="agentId"
              value={reassignAgentId}
              onChange={(e) => setReassignAgentId(e.target.value)}
              disabled={loadingAgents || agents.length === 0}
              className={cn(
                INPUT_BASE.join(" "),
                "mt-1 w-full bg-bg-canvas disabled:opacity-60",
              )}
            >
              <option value="">{placeholderLabel}</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.label}
                </option>
              ))}
            </select>
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
  );
}
