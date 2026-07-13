"use client";

import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
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
  if (currentUserRole !== "ADMIN") return null;

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
  );
}
