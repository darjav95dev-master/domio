import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSession, mockRevertContentAction } = vi.hoisted(() => ({
  mockSession: {
    userId: "user-1",
    tenantId: "tenant-1",
    role: "ADMIN" as const,
    name: "Test Admin",
  },
  mockRevertContentAction: vi.fn(),
}));

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/features/contenidos/actions/content-history.actions", () => ({
  revertContent: mockRevertContentAction,
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
const { POST } = await import(
  "@/../app/api/internal/content/revert/route"
);

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const BASE_URL = "http://localhost:3000/api/internal/content/revert";
const HISTORY_ID = "history-1";

// ---------------------------------------------------------------------------
// Tests — POST /api/internal/content/revert
// ---------------------------------------------------------------------------

describe("POST /api/internal/content/revert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevertContentAction.mockReset();
  });

  it("returns 401 when no session", async () => {
    const { getServerSession } = await import(
      "@/infrastructure/auth/session"
    );
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId: HISTORY_ID }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 when role is AGENT", async () => {
    const { getServerSession } = await import(
      "@/infrastructure/auth/session"
    );
    vi.mocked(getServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: "AGENT",
    });

    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId: HISTORY_ID }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when historyId is missing", async () => {
    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Missing required field: historyId");
  });

  it("returns 200 when successful", async () => {
    mockRevertContentAction.mockResolvedValue({
      success: true,
    });

    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId: HISTORY_ID }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockRevertContentAction).toHaveBeenCalledWith(HISTORY_ID);
  });

  it("returns 400 when revertContent returns error", async () => {
    mockRevertContentAction.mockResolvedValue({
      success: false,
      error: "Entrada histórica no encontrada",
    });

    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId: HISTORY_ID }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Entrada histórica no encontrada");
  });
});
