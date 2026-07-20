"use client";

import { useReducer, useState, useCallback, useRef } from "react";
import { useAutosave } from "./use-autosave";
import { useDraftRestore } from "./use-draft-restore";
import { usePublishValidation } from "./use-publish-validation";
import type { TipologiaEditorItem } from "../components/tipologia-editor";
import type {
  IdentitySectionValues,
  IdentitySectionErrors,
} from "../components/promocion-section-identity";
import type {
  CommercialStatusSectionValues,
  CommercialStatusSectionErrors,
} from "../components/promocion-section-commercial-status";
import type {
  LocationSectionValues,
  LocationSectionErrors,
} from "../components/promocion-section-location";
import type {
  SeoSectionValues,
  SeoSectionErrors,
} from "../components/promocion-section-seo";
import type {
  AgentSectionValues,
  AgentSectionErrors,
} from "../components/promocion-section-agent";

// ---------------------------------------------------------------------------
// Types (originally defined in promocion-form.tsx, moved here for SRP)
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
  lng: number | null;
  lat: number | null;
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

// ---------------------------------------------------------------------------
// Form state (useReducer)
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
// Types
// ---------------------------------------------------------------------------

interface SubmitState {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

export interface UsePromocionFormProps {
  promocionId: string;
  initialData: PromocionFormData;
  initialDraftPayload: Record<string, unknown> | null;
  currentStatus: string;
  publishBlocked: PublishBlockedInfo | null;
  autosaveIntervalMs: number;
}

export interface UsePromocionFormReturn {
  formState: PromocionFormData;
  dispatch: React.Dispatch<FormAction>;
  sectionErrors: SectionErrors;
  submitState: SubmitState;
  isLoading: boolean;
  hasDraft: boolean;
  lastSavedAt: string | null;
  isAutoSaving: boolean;
  autosaveError: string | null;
  onIdentityChange: (values: IdentitySectionValues) => void;
  onCommercialStatusChange: (values: CommercialStatusSectionValues) => void;
  onLocationChange: (values: LocationSectionValues) => void;
  onSeoChange: (values: SeoSectionValues) => void;
  onAgentChange: (values: AgentSectionValues) => void;
  onTipologiasChange: (tipologias: TipologiaEditorItem[]) => void;
  handleSaveDraft: () => Promise<void>;
  handlePublish: () => Promise<void>;
  handleDiscardDraft: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Field-to-section mapping
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePromocionForm({
  promocionId,
  initialData,
  initialDraftPayload,
  currentStatus,
  publishBlocked,
  autosaveIntervalMs,
}: UsePromocionFormProps): UsePromocionFormReturn {
  // ── Track whether draft was restored on mount ─────────────────────────
  const draftRestoredRef = useRef(false);

  // ── Draft restore hook (T033) ─────────────────────────────────────────
  const {
    hasDraft,
    discardDraft,
  } = useDraftRestore(promocionId, initialData as unknown as Record<string, unknown>, initialDraftPayload);

  // ── Form state ─────────────────────────────────────────────────────────
  const [formState, dispatch] = useReducer(
    formReducer,
    // If a draft exists, restore it on initial render
    hasDraft && !draftRestoredRef.current
      ? ({ ...initialData, ...initialDraftPayload } as PromocionFormData)
      : initialData,
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
  } = useAutosave(formState as unknown as Record<string, unknown>, promocionId, autosaveIntervalMs);

  // ── Publish validation hook ───────────────────────────────────────────

  const { validatePublish } = usePublishValidation({ formState, publishBlocked });

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
      // Include location when both coordinates are set
      ...(formState.lng !== null && formState.lat !== null
        ? { location: { lng: formState.lng, lat: formState.lat } }
        : {}),
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
      dispatch({ type: "SET_FIELD", field: "municipality", value: values.municipality });
      dispatch({ type: "SET_FIELD", field: "address", value: values.address });
      dispatch({ type: "SET_FIELD", field: "lng", value: values.lng });
      dispatch({ type: "SET_FIELD", field: "lat", value: values.lat });
      dispatch({ type: "SET_FIELD", field: "mapPrivacyMode", value: values.mapPrivacyMode });
    },
    [],
  );

  const onSeoChange = useCallback(
    (values: SeoSectionValues) => {
      dispatch({ type: "SET_FIELD", field: "seoTitle", value: values.seoTitle });
      dispatch({ type: "SET_FIELD", field: "seoDescription", value: values.seoDescription });
    },
    [],
  );

  const onAgentChange = useCallback(
    (values: AgentSectionValues) => {
      dispatch({ type: "SET_FIELD", field: "assignedAgentId", value: values.assignedAgentId });
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
    const success = await sendPatch(buildPayload({ status: currentStatus }));
    // After saving to the main record, clear any stale autosave draftPayload
    // so it doesn't override current data on the next page load.
    if (success && hasDraft) {
      try {
        await discardDraft();
      } catch {
        // Non-critical: if clearing draft fails, it will be overwritten on next autosave
      }
    }
  }, [buildPayload, currentStatus, discardDraft, hasDraft, sendPatch]);

  // ── Publish ───────────────────────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    // validatePublish builds the payload from the current formState, which
    // already has the draft applied on initial render. Do NOT re-merge the
    // initialDraftPayload here — that would override current edits with stale data.
    const { payload, sectionErrors: newErrors, message } = validatePublish({
      status: "PUBLISHED",
    });

    if (!payload) {
      setSectionErrors(newErrors);
      setSubmitState({ status: "error", message: message ?? "Error al publicar" });
      return;
    }

    await sendPatch(payload);
  }, [sendPatch, validatePublish]);

  // ── Discard draft ─────────────────────────────────────────────────────

  const handleDiscardDraft = useCallback(async () => {
    await discardDraft();
    dispatch({ type: "RESET", data: initialData });
  }, [discardDraft, initialData]);

  // ── Submit state feedback ─────────────────────────────────────────────

  const isLoading = submitState.status === "loading" || isAutoSaving;

  return {
    formState,
    dispatch,
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
  };
}
