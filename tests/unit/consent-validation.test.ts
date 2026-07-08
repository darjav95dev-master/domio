/* eslint-disable sonarjs/no-duplicate-string, sonarjs/no-hardcoded-ip */

import { describe, it, expect } from "vitest";
import {
  consentSchema,
  arsopRequestTypeSchema,
} from "@/shared/types/consent-schema";

const TEST_IP = "192.168.1.1";

// ---------------------------------------------------------------------------
// consentSchema
// ---------------------------------------------------------------------------

describe("consentSchema", () => {
  it("accepts valid consent with all fields", () => {
    const result = consentSchema.safeParse({
      legalBasis: "RGPD consent",
      textAccepted: "He leido y acepto la politica de privacidad",
      ip: TEST_IP,
      userAgent: "Mozilla/5.0",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid consent without optional ip", () => {
    const result = consentSchema.safeParse({
      legalBasis: "RGPD consent",
      textAccepted: "He leido y acepto la politica de privacidad",
      userAgent: "Mozilla/5.0",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ip).toBeUndefined();
    }
  });

  it("accepts valid consent without optional userAgent", () => {
    const result = consentSchema.safeParse({
      legalBasis: "RGPD consent",
      textAccepted: "He leido y acepto la politica de privacidad",
      ip: TEST_IP,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userAgent).toBeUndefined();
    }
  });

  it("accepts valid consent with only required fields", () => {
    const result = consentSchema.safeParse({
      legalBasis: "RGPD consent",
      textAccepted: "He leido y acepto la politica de privacidad",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty legalBasis", () => {
    const result = consentSchema.safeParse({
      legalBasis: "",
      textAccepted: "He leido y acepto la politica de privacidad",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing legalBasis", () => {
    const result = consentSchema.safeParse({
      textAccepted: "He leido y acepto la politica de privacidad",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty textAccepted", () => {
    const result = consentSchema.safeParse({
      legalBasis: "RGPD consent",
      textAccepted: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing textAccepted", () => {
    const result = consentSchema.safeParse({
      legalBasis: "RGPD consent",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = consentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// arsopRequestTypeSchema
// ---------------------------------------------------------------------------

describe("arsopRequestTypeSchema", () => {
  it("accepts EXPORT", () => {
    const result = arsopRequestTypeSchema.safeParse("EXPORT");
    expect(result.success).toBe(true);
  });

  it("accepts DELETE", () => {
    const result = arsopRequestTypeSchema.safeParse("DELETE");
    expect(result.success).toBe(true);
  });

  it("rejects invalid request type", () => {
    const result = arsopRequestTypeSchema.safeParse("UPDATE");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = arsopRequestTypeSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects lowercase export", () => {
    const result = arsopRequestTypeSchema.safeParse("export");
    expect(result.success).toBe(false);
  });
});
