"use client";

import { cn } from "@/shared/utils/cn";
import { LABEL_STYLE, SELECT_STYLE } from "@/shared/styles/backoffice-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentOption {
  id: string;
  name: string | null;
  email: string;
}

export interface AgentSectionValues {
  assignedAgentId: string | null;
}

export interface AgentSectionErrors {
  assignedAgentId?: string;
}

export interface AgentSectionProps {
  values: AgentSectionValues;
  errors?: AgentSectionErrors;
  agents: AgentOption[];
  onChange: (values: AgentSectionValues) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_BASE =
  "rounded-control border bg-bg-surface px-4 py-3 font-sans text-base text-fg-default transition-colors duration-standard ease-standard hover:border-border-strong focus:border-accent-default";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PromocionSectionAgent — sección de agente asignado.
 *
 * Select poblado con la lista de usuarios con rol AGENT del tenant.
 * La lista se pasa como prop desde el servidor.
 *
 * **A11y:**
 * - `<label>` asociado vía `htmlFor`.
 * - `aria-describedby` para errores.
 */
export function PromocionSectionAgent({
  values,
  errors = {},
  agents,
  onChange,
}: AgentSectionProps) {
  return (
    <fieldset className="rounded-card border border-border-default bg-bg-surface p-6">
      <legend className="font-display text-lg font-semibold text-fg-default">
        Agente asignado
      </legend>

      <div className="mt-6 flex flex-col gap-stack-xs">
        <label htmlFor="promocion-agent" className={LABEL_STYLE}>
          Agente
        </label>
        <select
          id="promocion-agent"
          value={values.assignedAgentId ?? ""}
          onChange={(e) =>
            onChange({
              assignedAgentId: e.target.value || null,
            })
          }
          aria-invalid={Boolean(errors.assignedAgentId)}
          aria-describedby={
            errors.assignedAgentId
              ? "promocion-agent-error"
              : undefined
          }
          className={cn(
            INPUT_BASE,
            SELECT_STYLE,
            errors.assignedAgentId && "border-status-danger-default",
          )}
        >
          <option value="">Sin asignar</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name ?? agent.email}
            </option>
          ))}
        </select>
        {errors.assignedAgentId && (
          <p
            id="promocion-agent-error"
            role="alert"
            aria-live="polite"
            className="font-sans text-sm text-status-danger-default"
          >
            {errors.assignedAgentId}
          </p>
        )}
      </div>
    </fieldset>
  );
}
