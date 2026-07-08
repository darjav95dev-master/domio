import { describe, it, expect } from "vitest";
import { leadCreationSchema } from "@/shared/types/lead-creation-schema";

// ---------------------------------------------------------------------------
// leadCreationSchema
// ---------------------------------------------------------------------------

describe("leadCreationSchema", () => {
  const validInput = {
    promocionId: "550e8400-e29b-41d4-a716-446655440000",
    source: "commercial",
    channel: "FORM",
    name: "Juan Perez",
    email: "juan@example.com",
    phone: "+34600123456",
    message: "Quiero informacion",
    consentLegalBasis: "RGPD consent",
    consentTextAccepted:
      "He leido y acepto la politica de privacidad",
  };

  it("accepts valid lead creation with all fields", () => {
    const result = leadCreationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid lead creation without optional fields", () => {
    const result = leadCreationSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
      source: "commercial",
      name: "Juan Perez",
      email: "juan@example.com",
      consentLegalBasis: "RGPD consent",
      consentTextAccepted: "He leido y acepto la politica de privacidad",
    });
    expect(result.success).toBe(true);
  });

  it("accepts institutional source", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      source: "institutional",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing promocionId", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      promocionId: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for promocionId", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      promocionId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing consentLegalBasis", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      consentLegalBasis: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing consentTextAccepted", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      consentTextAccepted: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty consentLegalBasis", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      consentLegalBasis: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty consentTextAccepted", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      consentTextAccepted: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      source: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid channel", () => {
    const result = leadCreationSchema.safeParse({
      ...validInput,
      channel: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});
