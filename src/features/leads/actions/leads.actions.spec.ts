import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateLeadStatusAction } from "./leads.actions";
import type { LeadStatus } from "@/shared/constants/db-enums";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.hoisted(() => vi.fn());
vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

const mockFindById = vi.hoisted(() => vi.fn());
const mockUpdateStatus = vi.hoisted(() => vi.fn());

vi.mock("@/infrastructure/db/repositories/lead.repository", () => ({
  LeadRepository: vi.fn(() => ({
    findById: mockFindById,
    updateStatus: mockUpdateStatus,
  })),
}));

vi.mock("@/infrastructure/tenant/AuthenticatedContext", () => ({
  AuthenticatedContext: vi.fn(() => ({})),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const session = {
  userId: "user-1",
  tenantId: "tenant-1",
  role: "AGENT" as const,
  name: "Ana García",
};

function makeLead(status: LeadStatus) {
  return { id: "lead-1", status };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("updateLeadStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue(session);
  });

  it("updates status on a valid transition (NEW → CONTACTED)", async () => {
    mockFindById.mockResolvedValue(makeLead("NEW"));
    mockUpdateStatus.mockResolvedValue({ id: "lead-1", status: "CONTACTED" });

    const result = await updateLeadStatusAction("lead-1", "CONTACTED");

    expect(mockUpdateStatus).toHaveBeenCalledWith("lead-1", "CONTACTED", session.userId);
    expect(result).toMatchObject({ status: "CONTACTED" });
  });

  it("throws a friendly error on invalid transition (NEW → WON)", async () => {
    mockFindById.mockResolvedValue(makeLead("NEW"));

    await expect(
      updateLeadStatusAction("lead-1", "WON"),
    ).rejects.toThrow("Transición de estado no permitida");

    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("throws a friendly error on invalid transition (WON → NEW)", async () => {
    mockFindById.mockResolvedValue(makeLead("WON"));

    await expect(
      updateLeadStatusAction("lead-1", "NEW"),
    ).rejects.toThrow("Transición de estado no permitida");

    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("throws when lead not found", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      updateLeadStatusAction("ghost-id", "CONTACTED"),
    ).rejects.toThrow("Lead not found");

    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("throws when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(
      updateLeadStatusAction("lead-1", "CONTACTED"),
    ).rejects.toThrow("Permission denied");

    expect(mockFindById).not.toHaveBeenCalled();
  });
});
