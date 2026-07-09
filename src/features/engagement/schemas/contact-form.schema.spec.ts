import { describe, it, expect } from "vitest";
import { contactFormSchema } from "./contact-form.schema";

describe("contactFormSchema", () => {
  const validInput = {
    name: "Juan Pérez",
    email: "juan@example.com",
    phone: "+34 612 345 678",
    message: "Me interesa esta promoción, quisiera más información.",
    tipologiaId: "550e8400-e29b-41d4-a716-446655440000",
    consent: true as const,
  };

  it("accepts valid contact form input", () => {
    const result = contactFormSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts input without optional fields (phone, tipologiaId)", () => {
    const input = {
      name: "Ana García",
      email: "ana@example.com",
      message: "Quisiera recibir más información.",
      consent: true as const,
    };
    const result = contactFormSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = contactFormSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = contactFormSchema.safeParse({ ...validInput, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = contactFormSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects message shorter than 10 characters", () => {
    const result = contactFormSchema.safeParse({ ...validInput, message: "Corto" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone format if phone is provided", () => {
    const result = contactFormSchema.safeParse({ ...validInput, phone: "abc" });
    expect(result.success).toBe(false);
  });

  it("accepts valid Spanish phone number", () => {
    const result = contactFormSchema.safeParse({ ...validInput, phone: "612345678" });
    expect(result.success).toBe(true);
  });

  it("accepts international phone format", () => {
    const result = contactFormSchema.safeParse({ ...validInput, phone: "+34612345678" });
    expect(result.success).toBe(true);
  });

  it("rejects consent when it is false", () => {
    const result = contactFormSchema.safeParse({ ...validInput, consent: false });
    expect(result.success).toBe(false);
  });

  it("rejects consent when it is missing", () => {
    const inputWithoutConsent: Record<string, unknown> = { ...validInput };
    delete inputWithoutConsent.consent;
    const result = contactFormSchema.safeParse(inputWithoutConsent);
    expect(result.success).toBe(false);
  });

  it("rejects invalid tipologiaId format", () => {
    const result = contactFormSchema.safeParse({ ...validInput, tipologiaId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
