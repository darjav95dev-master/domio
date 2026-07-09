import { describe, it, expect } from "vitest";
import { contactFormSchema } from "./submit-contact.schema";

describe("contactFormSchema", () => {
  const VALID_EMAIL = "juan@example.com";
  const SHORT_MSG = "Hola";

  // ─── Valid inputs ───────────────────────────────────────────────────────

  it("accepts valid minimal input", () => {
    const result = contactFormSchema.safeParse({
      name: "Juan",
      email: VALID_EMAIL,
      message: "Quiero información",
    });
    expect(result.success).toBe(true);
  });

  it("accepts maximum length name and message", () => {
    const result = contactFormSchema.safeParse({
      name: "A".repeat(100),
      email: "test@example.com",
      message: "B".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("accepts email with special characters", () => {
    const result = contactFormSchema.safeParse({
      name: "María García",
      email: "maria.garcia+test@domio.es",
      message: SHORT_MSG,
    });
    expect(result.success).toBe(true);
  });

  // ─── Invalid inputs ─────────────────────────────────────────────────────

  it("rejects empty name", () => {
    const result = contactFormSchema.safeParse({
      name: "",
      email: VALID_EMAIL,
      message: SHORT_MSG,
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 characters", () => {
    const result = contactFormSchema.safeParse({
      name: "A".repeat(101),
      email: VALID_EMAIL,
      message: SHORT_MSG,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = contactFormSchema.safeParse({
      name: "Juan",
      email: "not-an-email",
      message: SHORT_MSG,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = contactFormSchema.safeParse({
      name: "Juan",
      email: "",
      message: SHORT_MSG,
    });
    expect(result.success).toBe(false);
  });

  it("rejects email exceeding 255 characters", () => {
    const result = contactFormSchema.safeParse({
      name: "Juan",
      email: `${"a".repeat(246)}@example.com`,
      message: SHORT_MSG,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty message", () => {
    const result = contactFormSchema.safeParse({
      name: "Juan",
      email: VALID_EMAIL,
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message exceeding 2000 characters", () => {
    const result = contactFormSchema.safeParse({
      name: "Juan",
      email: VALID_EMAIL,
      message: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
