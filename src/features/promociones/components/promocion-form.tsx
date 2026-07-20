"use client";

import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
import { usePromocionForm, type PromocionFormData, type PublishBlockedInfo } from "../hooks/use-promocion-form";
import { DraftIndicator } from "./draft-indicator";
import { PromocionSectionIdentity } from "./promocion-section-identity";
import { PromocionSectionCommercialStatus } from "./promocion-section-commercial-status";
import type { ConstructionWarning } from "@/shared/utils/construction-warning";
import { PromocionSectionLocation } from "./promocion-section-location";
import { PromocionSectionSeo } from "./promocion-section-seo";
import { PromocionSectionAgent } from "./promocion-section-agent";
import type { AgentOption } from "./promocion-section-agent";
import { TipologiaEditor } from "./tipologia-editor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromocionFormProps {
  promocionId: string;
  initialData: PromocionFormData;
  agents: AgentOption[];
  constructionWarning: ConstructionWarning | null;
  /** The draft payload if one exists, or null. */
  initialDraftPayload: Record<string, unknown> | null;
  /** Current status before editing (used to detect first-publish). */
  currentStatus: string;
  /** If the promotion has blocks with invalid data, publishing is blocked. */
  publishBlocked?: PublishBlockedInfo | null;
  /** Override the autosave interval in milliseconds. Defaults to 30000. */
  autosaveIntervalMs?: number;
  /** When false (AGENT role), the Publicar button is hidden. */
  canPublish?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PromocionForm — formulario principal de edición de promoción.
 *
 * Delega toda la lógica de estado y acciones al hook `usePromocionForm`.
 * Este componente se ocupa exclusivamente del renderizado y la composición
 * de secciones.
 *
 * **A11y:**
 * - Botones con estados de carga (loading spinner + texto)
 * - `aria-live="polite"` en mensajes de error/success
 * - Validación en submit con feedback visual
 */
export function PromocionForm({
  promocionId,
  initialData,
  agents,
  constructionWarning,
  initialDraftPayload,
  currentStatus,
  publishBlocked = null,
  autosaveIntervalMs = 30000,
  canPublish = true,
}: PromocionFormProps) {
  const {
    formState,
    sectionErrors,
    submitState,
    isLoading,
    hasDraft,
    lastSavedAt,
    isAutoSaving,
    autosaveError,
    onIdentityChange,
    onCommercialStatusChange,
    onLocationChange,
    onSeoChange,
    onAgentChange,
    onTipologiasChange,
    handleSaveDraft,
    handlePublish,
    handleDiscardDraft,
  } = usePromocionForm({
    promocionId,
    initialData,
    initialDraftPayload,
    currentStatus,
    publishBlocked,
    autosaveIntervalMs,
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Global feedback */}
      {submitState.message && (
        <div
          role="alert"
          aria-live="polite"
          className={cn(
            "rounded-card border p-4 font-sans text-sm",
            submitState.status === "error" &&
              "border-status-danger-default bg-status-danger-subtle text-status-danger-default",
            submitState.status === "success" &&
              "border-status-success-default bg-status-success-subtle text-status-success-default",
          )}
        >
          <p>{submitState.message}</p>
          {/* Show media publish errors when they exist */}
          {publishBlocked?.mediaErrors && publishBlocked.mediaErrors.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-1">
              {publishBlocked.mediaErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Draft restore banner (T033) */}
      {hasDraft && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-card border border-status-warning-default bg-status-warning-subtle p-4"
        >
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-gold"
          />
          <p className="font-sans text-sm text-fg-default">
            Restaurando borrador guardado…
          </p>
        </div>
      )}

      {/* Autosave indicator (T032) */}
      <DraftIndicator
        isSaving={isAutoSaving}
        lastSavedAt={lastSavedAt}
        error={autosaveError}
      />

      {/* Sections */}
      <PromocionSectionIdentity
        values={{
          name: formState.name,
          propertyType: formState.propertyType,
          operation: formState.operation,
          kind: formState.kind,
        }}
        errors={sectionErrors.identity}
        onChange={onIdentityChange}
      />

      <PromocionSectionCommercialStatus
        values={{
          status: formState.status,
          constructionStatus: formState.constructionStatus,
        }}
        errors={sectionErrors.commercialStatus}
        constructionWarning={constructionWarning}
        onChange={onCommercialStatusChange}
      />

      <PromocionSectionLocation
        values={{
          island: formState.island,
          municipality: formState.municipality,
          address: formState.address,
          lng: formState.lng,
          lat: formState.lat,
          mapPrivacyMode: formState.mapPrivacyMode,
        }}
        errors={sectionErrors.location}
        onChange={onLocationChange}
      />

      <PromocionSectionSeo
        values={{
          seoTitle: formState.seoTitle,
          seoDescription: formState.seoDescription,
        }}
        errors={sectionErrors.seo}
        onChange={onSeoChange}
      />

      <PromocionSectionAgent
        values={{
          assignedAgentId: formState.assignedAgentId,
        }}
        errors={sectionErrors.agent}
        agents={agents}
        onChange={onAgentChange}
      />

      {/* Tipologías */}
      <TipologiaEditor
        tipologias={formState.tipologias}
        onChange={onTipologiasChange}
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          variant="primary"
          disabled={isLoading}
          onClick={handleSaveDraft}
        >
          {isLoading ? "Guardando…" : "Guardar borrador"}
        </Button>

        {canPublish && (
          <Button
            type="button"
            variant="primary"
            disabled={isLoading}
            onClick={handlePublish}
          >
            {isLoading ? "Publicando…" : "Publicar"}
          </Button>
        )}

        {hasDraft && (
          <button
            type="button"
            disabled={isLoading}
            onClick={handleDiscardDraft}
            className={cn(
              "font-sans text-sm text-status-danger-default underline underline-offset-4",
              "transition-colors duration-standard ease-standard",
              "hover:text-accent-hover",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            Descartar borrador
          </button>
        )}
      </div>
    </div>
  );
}
