"use client";

import { useReducer, useState, useCallback, useRef } from "react";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/button";
import { PromocionUpdateSchema } from "@/shared/schemas/promocion.schema";
import { useAutosave } from "../hooks/use-autosave";
import { useDraftRestore } from "../hooks/use-draft-restore";
import { DraftIndicator } from "./draft-indicator";
import { PromocionSectionIdentity } from "./promocion-section-identity";
import type { IdentitySectionValues, IdentitySectionErrors } from "./promocion-section-identity";
import { PromocionSectionCommercialStatus } from "./promocion-section-commercial-status";
import type { CommercialStatusSectionValues, CommercialStatusSectionErrors, ConstructionWarning } from "./promocion-section-commercial-status";
import { PromocionSectionLocation } from "./promocion-section-location";
import type { LocationSectionValues, LocationSectionErrors } from "./promocion-section-location";
import { PromocionSectionSeo } from "./promocion-section-seo";
import type { SeoSectionValues, SeoSectionErrors } from "./promocion-section-seo";
import { PromocionSectionAgent } from "./promocion-section-agent";
import type { AgentSectionValues, AgentSectionErrors, AgentOption } from "./promocion-section-agent";
import {
  TipologiaEditor,
  type TipologiaEditorItem,
} from "./tipologia-editor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromocionFormData {
  name: string;
  kind: string;
  status: string;
  propertyType: string | null;
  operation: string | null;
  constructionStatus: string | null;
  island: string | null;
  municipality: string | null;
  address: string | null;
  mapPrivacyMode: string;
  seoTitle: string | null;
  seoDescription: string | null;
  assignedAgentId: string | null;
  tipologias: TipologiaEditorItem[];
}

export interface SectionErrors {
  identity?: IdentitySectionErrors;
  commercialStatus?: CommercialStatusSectionErrors;
  location?: LocationSectionErrors;
  seo?: SeoSectionErrors;
  agent?: AgentSectionErrors;
}

export interface PublishBlockedInfo {
  message: string;
  errors: Array<{ blockType: string; issues: string[] }>;
  /** Media validation errors that block publishing. */
  mediaErrors?: string[];
}

export interface PromocionFormProps {
  promocionId: string;
  initialData: PromocionFormData;
  agents: AgentOption[];
  constructionWarning: ConstructionWarning | null;
  /** Initial tipologías to populate the TipologiaEditor. */
  initialTipologias?: TipologiaEditorItem[];
  /**
   * The draft payload if one exists, or null.
   * Replaces the previous `hasDraftPayload: boolean` to allow
   * draft restoration (T033) and autosave integration (T034).
   */
  initialDraftPayload: Record<string, unknown> | null;
  /** Current status before editing (used to detect first-publish). */
  currentStatus: string;
  /**
   * If the promotion has blocks with invalid data, publishing is blocked.
   * Comes from server-side validation (T030-T031).
   */
  publishBlocked?: PublishBlockedInfo | null;
}

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

type FormAction =
  | { type: "SET_FIELD"; field: string; value: string | number | boolean | null }
  | { type: "SET_TIPOLOGIAS"; tipologias: TipologiaEditorItem[] }
  | { type: "RESET"; data: PromocionFormData };

function formReducer(
  state: PromocionFormData,
  action: FormAction,
): PromocionFormData {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_TIPOLOGIAS":
      return { ...state, tipologias: action.tipologias };
    case "RESET":
      return action.data;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Component helpers
// ---------------------------------------------------------------------------

interface SubmitState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PromocionForm — formulario principal de edición de promoción.
 *
 * Compone los cinco bloques de sección (identidad, estado comercial,
 * ubicación, SEO, agente) y gestiona el estado del formulario con
 * `useReducer`. Valida con `PromocionUpdateSchema` al enviar y muestra
 * errores a nivel de campo y sección.
 *
 * Acciones principales:
 * - "Guardar borrador" → PATCH con datos actuales, status sin cambios
 * - "Publicar" → PATCH con status=PUBLISHED
 * - "Descartar borrador" → PATCH limpiando draftPayload
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
  initialTipologias = [],
  publishBlocked = null,
}: PromocionFormProps) {
  // ── Track whether draft was restored on mount ─────────────────────────
  const draftRestoredRef = useRef(false);

  // ── Draft restore hook (T033) ─────────────────────────────────────────
  const {
    hasDraft,
    applyDraft,
    discardDraft,
  } = useDraftRestore(promocionId, initialData as unknown as Record<string, unknown>, initialDraftPayload);

  // ── Form state ─────────────────────────────────────────────────────────
  const tipologiaAwareInitial = {
    ...initialData,
    tipologias: initialTipologias,
  };
  const [formState, dispatch] = useReducer(
    formReducer,
    // If a draft exists, restore it on initial render
    hasDraft && !draftRestoredRef.current
      ? ({ ...tipologiaAwareInitial, ...initialDraftPayload } as PromocionFormData)
      : tipologiaAwareInitial,
  );
  // Mark draft as restored after first render
  if (hasDraft && !draftRestoredRef.current) {
    draftRestoredRef.current = true;
  }

  const [sectionErrors, setSectionErrors] = useState<SectionErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });

  // ── Autosave hook (T031) ──────────────────────────────────────────────
  const {
    lastSavedAt,
    isSaving: isAutoSaving,
    error: autosaveError,
  } = useAutosave(formState as unknown as Record<string, unknown>, promocionId);

  // ── Field-to-section mapping ──────────────────────────────────────────

  const identityFields = ["name", "propertyType", "operation", "kind"];
  const commercialFields = ["status", "constructionStatus"];
  const locationFields = ["mapPrivacyMode", "island", "municipality", "address"];
  const seoFields = ["seoTitle", "seoDescription"];

  function fieldToSection(field: string): keyof SectionErrors {
    if (identityFields.includes(field)) return "identity";
    if (commercialFields.includes(field)) return "commercialStatus";
    if (locationFields.includes(field)) return "location";
    if (seoFields.includes(field)) return "seo";
    return "agent";
  }

  // ── PATCH helper ──────────────────────────────────────────────────────

  const sendPatch = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      setSubmitState({ status: "loading", message: "" });
      setSectionErrors({});

      try {
        const response = await fetch(
          `/api/internal/promociones/${promocionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);

          if (response.status === 400 && errorData?.details) {
            const newSectionErrors: SectionErrors = {};
            for (const detail of errorData.details) {
              const field = detail.field as string;
              const section = fieldToSection(field);
              newSectionErrors[section] = {
                ...newSectionErrors[section],
                [field]: detail.message,
              } as never;
            }
            setSectionErrors(newSectionErrors);
          }

          setSubmitState({
            status: "error",
            message: errorData?.error ?? "Error al guardar",
          });
          return false;
        }

        setSubmitState({ status: "success", message: "Guardado correctamente" });
        return true;
      } catch {
        setSubmitState({
          status: "error",
          message: "Error de conexión. Inténtalo de nuevo.",
        });
        return false;
      }
    },
    [promocionId],
  );

  // ── Build payload helper ──────────────────────────────────────────────

  const buildPayload = useCallback(
    (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
      name: formState.name,
      kind: formState.kind,
      propertyType: formState.propertyType || null,
      operation: formState.operation || null,
      constructionStatus: formState.constructionStatus || null,
      island: formState.island || null,
      municipality: formState.municipality || null,
      address: formState.address || null,
      mapPrivacyMode: formState.mapPrivacyMode,
      seoTitle: formState.seoTitle || null,
      seoDescription: formState.seoDescription || null,
      assignedAgentId: formState.assignedAgentId || null,
      tipologias: formState.tipologias,
      ...overrides,
    }),
    [formState],
  );

  // ── Section onChange handlers ─────────────────────────────────────────

  const onIdentityChange = useCallback(
    (values: IdentitySectionValues) => {
      dispatch({ type: "SET_FIELD", field: "name", value: values.name });
      dispatch({ type: "SET_FIELD", field: "propertyType", value: values.propertyType });
      dispatch({ type: "SET_FIELD", field: "operation", value: values.operation });
      dispatch({ type: "SET_FIELD", field: "kind", value: values.kind });
    },
    [],
  );

  const onCommercialStatusChange = useCallback(
    (values: CommercialStatusSectionValues) => {
      dispatch({ type: "SET_FIELD", field: "status", value: values.status });
      dispatch({
        type: "SET_FIELD",
        field: "constructionStatus",
        value: values.constructionStatus,
      });
    },
    [],
  );

  const onLocationChange = useCallback(
    (values: LocationSectionValues) => {
      dispatch({ type: "SET_FIELD", field: "island", value: values.island });
      dispatch({
        type: "SET_FIELD",
        field: "municipality",
        value: values.municipality,
      });
      dispatch({ type: "SET_FIELD", field: "address", value: values.address });
      dispatch({
        type: "SET_FIELD",
        field: "mapPrivacyMode",
        value: values.mapPrivacyMode,
      });
    },
    [],
  );

  const onSeoChange = useCallback(
    (values: SeoSectionValues) => {
      dispatch({ type: "SET_FIELD", field: "seoTitle", value: values.seoTitle });
      dispatch({
        type: "SET_FIELD",
        field: "seoDescription",
        value: values.seoDescription,
      });
    },
    [],
  );

  const onAgentChange = useCallback(
    (values: AgentSectionValues) => {
      dispatch({
        type: "SET_FIELD",
        field: "assignedAgentId",
        value: values.assignedAgentId,
      });
    },
    [],
  );

  const onTipologiasChange = useCallback(
    (tipologias: TipologiaEditorItem[]) => {
      dispatch({ type: "SET_TIPOLOGIAS", tipologias });
    },
    [],
  );

  // ── Save as draft ─────────────────────────────────────────────────────

  const handleSaveDraft = useCallback(async () => {
    await sendPatch(buildPayload({ status: currentStatus }));
  }, [buildPayload, currentStatus, sendPatch]);

  // ── Publish ───────────────────────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    // Check block validation before publishing (T030-T031)
    if (publishBlocked) {
      setSubmitState({
        status: "error",
        message: publishBlocked.message,
      });
      return;
    }

    // If there is a draft, apply it over the current form data
    const mergedData = hasDraft
      ? ({ ...formState, ...applyDraft() } as PromocionFormData)
      : formState;

    const payload = {
      name: mergedData.name,
      kind: mergedData.kind,
      propertyType: mergedData.propertyType || null,
      operation: mergedData.operation || null,
      constructionStatus: mergedData.constructionStatus || null,
      island: mergedData.island || null,
      municipality: mergedData.municipality || null,
      address: mergedData.address || null,
      mapPrivacyMode: mergedData.mapPrivacyMode,
      seoTitle: mergedData.seoTitle || null,
      seoDescription: mergedData.seoDescription || null,
      assignedAgentId: mergedData.assignedAgentId || null,
      tipologias: mergedData.tipologias,
      status: "PUBLISHED",
    };

    // Client-side validation
    const validation = PromocionUpdateSchema.safeParse(payload);
    if (!validation.success) {
      const newSectionErrors: SectionErrors = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as string;
        const section = fieldToSection(field);
        newSectionErrors[section] = {
          ...newSectionErrors[section],
          [field]: issue.message,
        } as never;
      }
      setSectionErrors(newSectionErrors);
      setSubmitState({
        status: "error",
        message: "Corrige los errores antes de publicar",
      });
      return;
    }

    await sendPatch(payload);
  }, [formState, hasDraft, applyDraft, sendPatch, publishBlocked]);

  // ── Discard draft ─────────────────────────────────────────────────────

  const handleDiscardDraft = useCallback(async () => {
    await discardDraft();
    dispatch({ type: "RESET", data: initialData });
  }, [discardDraft, initialData]);

  // ── Submit state feedback ─────────────────────────────────────────────

  const isLoading = submitState.status === "loading" || isAutoSaving;

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
          lng: null,
          lat: null,
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

        <Button
          type="button"
          variant="primary"
          disabled={isLoading}
          onClick={handlePublish}
        >
          {isLoading ? "Publicando…" : "Publicar"}
        </Button>

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
