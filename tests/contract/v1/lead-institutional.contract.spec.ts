import { describe, it, expect } from "vitest";
import { leadInstitutionalSchema } from "@/features/api-public/schemas/lead-institutional.schema";
import {
  serializeSchema,
  isUpdateMode,
} from "@/features/api-public/openapi/snapshot-serializer";
import * as fs from "node:fs";
import * as path from "node:path";

describe("Lead Institutional Contract (v1)", () => {
  const VALID_CONSENT = { legalBasis: "RGPD consent", textAccepted: "Acepto la política de privacidad" };

  const buildPayload = (overrides: Record<string, unknown> = {}) => ({
    name: "Juan Pérez",
    email: "juan@example.com",
    phone: "+34600000000",
    message: "Estoy interesado en la promoción",
    promocionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    tipologiaId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    consent: VALID_CONSENT,
    ...overrides,
  });

  describe("Payload validation", () => {
    it("should accept a complete valid payload", () => {
      const result = leadInstitutionalSchema.safeParse(buildPayload());
      expect(result.success).toBe(true);
    });

    it("should accept payload without optional fields (phone, message, tipologiaId)", () => {
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

      if (!result.success) {
        const fields = result.error.flatten().fieldErrors;
        expect(fields).toHaveProperty("consent");
      }
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

    it("should reject empty payload", () => {
      const result = leadInstitutionalSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject payload where consent is an empty object", () => {
      const result = leadInstitutionalSchema.safeParse(
        buildPayload({ consent: {} }),
      );
      expect(result.success).toBe(false);
    });
  });

  describe("Snapshot comparison", () => {
    const SNAPSHOT_FILE = "lead-institutional.schema.json";
    const SNAPSHOTS_DIR = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "tests/contract/v1/snapshots",
    );

    it("should match the stored schema snapshot", () => {
      const current = serializeSchema(leadInstitutionalSchema);
      const filePath = path.join(SNAPSHOTS_DIR, SNAPSHOT_FILE);

      let stored: Record<string, unknown> | null = null;
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        stored = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // Snapshot does not exist — will fail comparison
      }

      if (stored === null) {
        fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(current, null, 2) + "\n");
        expect(stored).not.toBeNull();
        return;
      }

      if (isUpdateMode()) {
        fs.writeFileSync(filePath, JSON.stringify(current, null, 2) + "\n");
        return;
      }

      expect(current).toEqual(stored);
    });
  });
});
