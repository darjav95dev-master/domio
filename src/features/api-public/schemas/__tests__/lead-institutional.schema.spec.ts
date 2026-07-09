import { describe, it, expect } from "vitest";
import { leadInstitutionalSchema } from "../lead-institutional.schema";

describe("leadInstitutionalSchema", () => {
  const VALID_CONSENT = { legalBasis: "RGPD: consentimiento informado para cesión de datos", textAccepted: "He leído y acepto la política de privacidad" };
  const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

  const buildPayload = (overrides: Record<string, unknown> = {}) => ({
    name: "Juan Pérez",
    email: "juan@example.com",
    phone: "+34600000000",
    message: "Estoy interesado en esta propiedad",
    promocionId: VALID_UUID,
    tipologiaId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    consent: VALID_CONSENT,
    ...overrides,
  });

  it("should accept a valid payload with all fields", () => {
    const result = leadInstitutionalSchema.safeParse(buildPayload());
    expect(result.success).toBe(true);
  });

  it("should accept a valid payload without optional fields (phone, message, tipologiaId)", () => {
    const minimal = buildPayload();
    delete (minimal as Record<string, unknown>).phone;
    delete (minimal as Record<string, unknown>).message;
    delete (minimal as Record<string, unknown>).tipologiaId;
    const result = leadInstitutionalSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("should reject payload without consent", () => {
    const withoutConsent = buildPayload();
    delete (withoutConsent as Record<string, unknown>).consent;
    const result = leadInstitutionalSchema.safeParse(withoutConsent);
    expect(result.success).toBe(false);
  });

  it("should reject payload with empty legalBasis in consent", () => {
    const result = leadInstitutionalSchema.safeParse(
      buildPayload({ consent: { legalBasis: "", textAccepted: "accepted" } }),
    );
    expect(result.success).toBe(false);
  });

  it("should reject payload with empty textAccepted in consent", () => {
    const result = leadInstitutionalSchema.safeParse(
      buildPayload({ consent: { legalBasis: "RGPD basis", textAccepted: "" } }),
    );
    expect(result.success).toBe(false);
  });

  it("should reject payload without name", () => {
    const withoutName = buildPayload();
    delete (withoutName as Record<string, unknown>).name;
    const result = leadInstitutionalSchema.safeParse(withoutName);
    expect(result.success).toBe(false);
  });

  it("should reject payload with invalid email", () => {
    const result = leadInstitutionalSchema.safeParse(
      buildPayload({ email: "not-an-email" }),
    );
    expect(result.success).toBe(false);
  });

  it("should reject payload with invalid promocionId (non-UUID)", () => {
    const result = leadInstitutionalSchema.safeParse(
      buildPayload({ promocionId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("should reject payload with invalid tipologiaId (non-UUID)", () => {
    const result = leadInstitutionalSchema.safeParse(
      buildPayload({ tipologiaId: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("should reject empty payload", () => {
    const result = leadInstitutionalSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
