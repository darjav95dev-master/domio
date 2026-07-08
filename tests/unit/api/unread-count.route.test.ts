import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSession = vi.hoisted(() => ({
  getServerSession: vi.fn<() => Promise<{
    userId: string;
    tenantId: string;
    role: string;
    name: string | null;
  } | null>>(),
}));

const mockRepository = vi.hoisted(() => ({
  DashboardRepository: vi.fn(),
}));

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockSession.getServerSession,
}));

vi.mock("@/infrastructure/db/repositories/dashboard.repository", () => ({
  DashboardRepository: mockRepository.DashboardRepository,
}));

const { GET } = await import(
  "@/../app/api/internal/leads/unread-count/route"
);

describe("GET /api/internal/leads/unread-count", () => {
  const validSession = {
    userId: "user-1",
    tenantId: "tenant-1",
    role: "AGENT" as const,
    name: "Test Agent",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with count when session is valid", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);

    const mockGetUnreadLeadsCount = vi.fn().mockResolvedValue(5);
    mockRepository.DashboardRepository.mockImplementation(() => ({
      getUnreadLeadsCount: mockGetUnreadLeadsCount,
    }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ count: 5 });
    // getUnreadLeadsCount now takes no arguments — tenantId and userId
    // come from the AuthenticatedContext injected via the constructor.
    expect(mockGetUnreadLeadsCount).toHaveBeenCalledWith();
  });

  it("returns 401 when no session exists", async () => {
    mockSession.getServerSession.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toHaveProperty("error");
  });

  it("returns 500 when repository throws", async () => {
    mockSession.getServerSession.mockResolvedValue(validSession);

    mockRepository.DashboardRepository.mockImplementation(() => ({
      getUnreadLeadsCount: vi.fn().mockRejectedValue(
        new Error("DB error"),
      ),
    }));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
  });
});
