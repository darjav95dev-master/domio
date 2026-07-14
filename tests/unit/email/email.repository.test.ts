import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailRepository } from "@/infrastructure/email/email.repository";

const mockExecute = vi.fn();
const mockUpdateWhere = vi.fn();
const TEST_ID = "test-id-123";

const mockDb = {
  execute: mockExecute,
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: mockUpdateWhere,
    })),
  })),
};

describe("EmailRepository", () => {
  let repository: EmailRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new EmailRepository(mockDb as never);
  });

  // findPendingEligible se prueba contra Postgres real en
  // tests/integration/email/email-repository-db.test.ts. Aquí había un test con
  // mock que solo afirmaba "llama a db.execute" y que el resultado era [] (lo que
  // el propio mock devolvía): pasaba en verde mientras la consulta devolvía
  // to_email en vez de toEmail y ningún email llegaba a enviarse. Un mock no
  // puede validar el mapeo columna→propiedad; hace falta la base de datos.

  describe("markSent", () => {
    it("updates status to SENT", async () => {
      mockUpdateWhere.mockResolvedValue(undefined);

      await repository.markSent(TEST_ID);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdateWhere).toHaveBeenCalled();
    });
  });

  describe("markFailed", () => {
    it("updates status to FAILED with error message", async () => {
      mockUpdateWhere.mockResolvedValue(undefined);

      await repository.markFailed(TEST_ID, "Rate limit exceeded");

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdateWhere).toHaveBeenCalled();
    });
  });

  describe("markRetry", () => {
    it("updates with next_attempt_at and error", async () => {
      const nextAttempt = new Date("2026-07-08T12:00:00Z");
      mockUpdateWhere.mockResolvedValue(undefined);

      await repository.markRetry(TEST_ID, "Timeout", nextAttempt);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockUpdateWhere).toHaveBeenCalled();
    });
  });
});
