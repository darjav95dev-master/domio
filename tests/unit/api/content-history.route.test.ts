import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockSession, mockGetContentHistoryAction } = vi.hoisted(() => ({
  mockSession: {
    userId: "user-1",
    tenantId: "tenant-1",
    role: "ADMIN" as const,
    name: "Test Admin",
  },
  mockGetContentHistoryAction: vi.fn(),
}));

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/features/contenidos/actions/content-history.actions", () => ({
  getContentHistory: mockGetContentHistoryAction,
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
const { GET } = await import(
  "@/../app/api/internal/content/history/route"
);

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const BASE_URL = "http://localhost:3000/api/internal/content/history";
const CONTENT_TYPE = "block";
const CONTENT_KEY = "home:hero";

const mockHistoryEntries = [
  {
    id: "history-1",
    tenantId: "tenant-1",
    contentType: "block",
    contentKey: "home:hero",
    payloadSnapshot: { claim: "Original claim" },
    updatedBy: "user-1",
    createdAt: new Date("2026-07-08T10:00:00Z").toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Tests — GET /api/internal/content/history
// ---------------------------------------------------------------------------

describe("GET /api/internal/content/history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetContentHistoryAction.mockReset();
  });

  it("returns 401 when no session", async () => {
    const { getServerSession } = await import(
      "@/infrastructure/auth/session"
    );
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const request = new Request(
      `${BASE_URL}?contentType=${CONTENT_TYPE}&contentKey=${CONTENT_KEY}`,
    );
    const response = await GET(request);
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

    const request = new Request(
      `${BASE_URL}?contentType=${CONTENT_TYPE}&contentKey=${CONTENT_KEY}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when contentType is missing", async () => {
    const request = new Request(
      `${BASE_URL}?contentKey=${CONTENT_KEY}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Missing required query parameters: contentType, contentKey",
    );
  });

  it("returns 400 when contentKey is missing", async () => {
    const request = new Request(
      `${BASE_URL}?contentType=${CONTENT_TYPE}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Missing required query parameters: contentType, contentKey",
    );
  });

  it("returns 200 with history list", async () => {
    mockGetContentHistoryAction.mockResolvedValue({
      success: true,
      data: mockHistoryEntries,
    });

    const request = new Request(
      `${BASE_URL}?contentType=${CONTENT_TYPE}&contentKey=${CONTENT_KEY}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.history).toHaveLength(1);
    expect(body.history[0].id).toBe("history-1");
    expect(mockGetContentHistoryAction).toHaveBeenCalledWith(
      CONTENT_TYPE,
      CONTENT_KEY,
      undefined,
    );
  });

  it("returns 200 with limit parameter", async () => {
    mockGetContentHistoryAction.mockResolvedValue({
      success: true,
      data: mockHistoryEntries,
    });

    const request = new Request(
      `${BASE_URL}?contentType=${CONTENT_TYPE}&contentKey=${CONTENT_KEY}&limit=10`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.history).toHaveLength(1);
    expect(mockGetContentHistoryAction).toHaveBeenCalledWith(
      CONTENT_TYPE,
      CONTENT_KEY,
      10,
    );
  });

  it("returns 400 when getContentHistory returns error", async () => {
    mockGetContentHistoryAction.mockResolvedValue({
      success: false,
      error: "No autorizado",
    });

    const request = new Request(
      `${BASE_URL}?contentType=${CONTENT_TYPE}&contentKey=${CONTENT_KEY}`,
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("No autorizado");
  });
});
