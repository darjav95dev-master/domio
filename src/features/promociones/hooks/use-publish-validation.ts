"use client";

import { useCallback } from "react";
import { PromocionUpdateSchema } from "@/shared/schemas/promocion.schema";
import type { PromocionFormData, SectionErrors, PublishBlockedInfo } from "./use-promocion-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PublishValidationResult {
  /** The validated payload ready to send, or null if validation failed. */
  payload: Record<string, unknown> | null;
  /** Section-scoped errors if validation failed. */
  sectionErrors: SectionErrors;
  /** A user-facing message describing the failure. */
  message?: string;
}

export interface UsePublishValidationOptions {
  formState: PromocionFormData;
  publishBlocked: PublishBlockedInfo | null;
}

// ---------------------------------------------------------------------------
// Helpers
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

/**
 * Maps Zod validation issues into section-scoped errors.
 */
function mapZodErrorsToSections(
  issues: { path: (string | number | symbol)[]; message: string }[],
): SectionErrors {
  const newSectionErrors: SectionErrors = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    const section = fieldToSection(field);
    newSectionErrors[section] = {
      ...newSectionErrors[section],
      [field]: issue.message,
    } as never;
  }
  return newSectionErrors;
}

/**
 * Builds the payload object from form state with optional overrides.
 */
export function buildPublishPayload(
  formState: PromocionFormData,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook that encapsulates the publication validation logic.
 *
 * Validates form state + publishBlocked + PromocionUpdateSchema before
 * allowing a publish action. Returns the validated payload and any
 * section-scoped errors.
 */
export function usePublishValidation({
  formState,
  publishBlocked,
}: UsePublishValidationOptions): {
  validatePublish: (overrides?: Record<string, unknown>) => PublishValidationResult;
} {
  const validatePublish = useCallback(
    (overrides: Record<string, unknown> = {}): PublishValidationResult => {
      // 1. Check block validation (block errors or media errors block publishing)
      if (publishBlocked) {
        return {
          payload: null,
          sectionErrors: {},
          message: publishBlocked.message,
        };
      }

      // 2. Build payload
      const payload = buildPublishPayload(formState, overrides);

      // 3. Client-side validation with Zod
      const validation = PromocionUpdateSchema.safeParse(payload);
      if (!validation.success) {
        return {
          payload: null,
          sectionErrors: mapZodErrorsToSections(validation.error.issues),
          message: "Corrige los errores antes de publicar",
        };
      }

      return { payload, sectionErrors: {} };
    },
    [formState, publishBlocked],
  );

  return { validatePublish };
}
