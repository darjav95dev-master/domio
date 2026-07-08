import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any imports
// ---------------------------------------------------------------------------
const { mockSession, mockRepoInstance } = vi.hoisted(() => {
  const session = {
    userId: "00000000-0000-4000-8000-000000000010",
    tenantId: "00000000-0000-4000-8000-000000000001",
    role: "ADMIN" as const,
    name: "Test Admin",
  };

  const instance = {
    exportLead: vi.fn(),
    deleteLead: vi.fn(),
  };

  return { mockSession: session, mockRepoInstance: instance };
});

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/infrastructure/db/repositories/arsop.repository", () => ({
  ArsopRepository: vi.fn(() => mockRepoInstance),
}));

vi.mock("@/infrastructure/media/media.service", () => ({
  MediaService: vi.fn(),
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
import {
  exportLeadAction,
  deleteLeadAction,
} from "@/features/leads/actions/arsop.actions";
import { getServerSession } from "@/infrastructure/auth/session";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const LEAD_ID = "00000000-0000-4000-8000-000000000020";

describe("ArsopActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Ensure getServerSession returns the mock session by default
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  // -----------------------------------------------------------------------
  // exportLeadAction — ADMIN only
  // -----------------------------------------------------------------------
  describe("exportLeadAction", () => {
    it("throws when role is AGENT", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        role: "AGENT",
      });

      await expect(exportLeadAction(LEAD_ID)).rejects.toThrow(
        "Only ADMIN can export lead data",
      );
    });

    it("throws when role is OPERATOR", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        role: "OPERATOR",
      });

      await expect(exportLeadAction(LEAD_ID)).rejects.toThrow(
        "Only ADMIN can export lead data",
      );
    });
  });

  // -----------------------------------------------------------------------
  // deleteLeadAction — ADMIN only
  // -----------------------------------------------------------------------
  describe("deleteLeadAction", () => {
    it("throws when role is AGENT", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        role: "AGENT",
      });

      await expect(deleteLeadAction(LEAD_ID)).rejects.toThrow(
        "Only ADMIN can delete lead data",
      );
    });

    it("throws when role is OPERATOR", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        role: "OPERATOR",
      });

      await expect(deleteLeadAction(LEAD_ID)).rejects.toThrow(
        "Only ADMIN can delete lead data",
      );
    });
  });
});
