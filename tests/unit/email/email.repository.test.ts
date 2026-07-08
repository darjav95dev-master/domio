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

  describe("findPendingEligible", () => {
    it("calls db.execute with FOR UPDATE SKIP LOCKED", async () => {
      const mockResult = { rows: [] };
      mockExecute.mockResolvedValue(mockResult);

      const result = await repository.findPendingEligible(10);

      expect(mockExecute).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

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
