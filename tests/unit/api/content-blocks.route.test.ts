/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any imports
// ---------------------------------------------------------------------------
const { mockSession, mockSaveBlockAction, mockFindByTenantAndPage } =
  vi.hoisted(() => ({
    mockSession: {
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN" as const,
      name: "Test Admin",
    },
    mockSaveBlockAction: vi.fn(),
    mockFindByTenantAndPage: vi.fn(),
  }));

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/features/contenidos/actions/content-block.actions", () => ({
  saveContentBlock: mockSaveBlockAction,
}));

vi.mock(
  "@/features/contenidos/server/content-block.repository",
  () => ({
    ContentBlockRepository: vi.fn(),
  }),
);

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
const { GET, POST } = await import(
  "@/../app/api/internal/content/blocks/route"
);
import { ContentBlockRepository } from "@/features/contenidos/server/content-block.repository";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const BASE_URL = "http://localhost:3000/api/internal/content/blocks";
const PAGE_KEY = "home";
const BLOCK_KEY = "hero";

const PAYLOAD = {
  claim: "Arquitectura que inspira",
  lead: "Comercialización inmobiliaria con enfoque editorial",
  ctaPrimary: "Ver portafolio",
  ctaSecondary: "Contactar",
  backgroundImageId: null,
};

const mockBlockRow = {
  id: "block-1",
  tenantId: "tenant-1",
  pageKey: PAGE_KEY,
  blockKey: BLOCK_KEY,
  payload: PAYLOAD,
  updatedBy: "user-1",
  updatedAt: new Date("2026-07-08T10:00:00Z"),
};

// ---------------------------------------------------------------------------
// Tests - GET /api/internal/content/blocks
// ---------------------------------------------------------------------------

describe("GET /api/internal/content/blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByTenantAndPage.mockReset();
  });

  it("returns 401 when no session", async () => {
    const { getServerSession } = await import(
      "@/infrastructure/auth/session"
    );
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const request = new Request(`${BASE_URL}?pageKey=${PAGE_KEY}`);
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
  });

  it("returns 403 when role is AGENT", async () => {
    const { getServerSession } = await import(
      "@/infrastructure/auth/session"
    );
    vi.mocked(getServerSession).mockResolvedValueOnce({
      ...mockSession,
      role: "AGENT",
    });

    const request = new Request(`${BASE_URL}?pageKey=${PAGE_KEY}`);
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when pageKey is missing", async () => {
    const request = new Request(BASE_URL);
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Missing required query parameter: pageKey",
    );
  });

  it("returns 200 with list of blocks", async () => {
    mockFindByTenantAndPage.mockResolvedValue([mockBlockRow]);
    vi.mocked(ContentBlockRepository).mockImplementation(
      () =>
        ({
          findByTenantAndPage: mockFindByTenantAndPage,
        }) as unknown as InstanceType<typeof ContentBlockRepository>,
    );

    const request = new Request(`${BASE_URL}?pageKey=${PAGE_KEY}`);
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.blocks).toHaveLength(1);
    expect(body.blocks[0].id).toBe("block-1");
    expect(body.blocks[0].pageKey).toBe(PAGE_KEY);
    expect(body.blocks[0].blockKey).toBe(BLOCK_KEY);
  });
});

// ---------------------------------------------------------------------------
// Tests - POST /api/internal/content/blocks
// ---------------------------------------------------------------------------

describe("POST /api/internal/content/blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveBlockAction.mockReset();
  });

  it("returns 401 when no session", async () => {
    const { getServerSession } = await import(
      "@/infrastructure/auth/session"
    );
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKey: PAGE_KEY,
        blockKey: BLOCK_KEY,
        payload: PAYLOAD,
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthenticated");
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
      body: JSON.stringify({
        pageKey: PAGE_KEY,
        blockKey: BLOCK_KEY,
        payload: PAYLOAD,
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 when pageKey is missing", async () => {
    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockKey: BLOCK_KEY,
        payload: PAYLOAD,
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Missing required fields: pageKey, blockKey, payload",
    );
  });

  it("returns 400 when blockKey is missing", async () => {
    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKey: PAGE_KEY,
        payload: PAYLOAD,
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Missing required fields: pageKey, blockKey, payload",
    );
  });

  it("returns 400 when payload is missing", async () => {
    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKey: PAGE_KEY,
        blockKey: BLOCK_KEY,
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Missing required fields: pageKey, blockKey, payload",
    );
  });

  it("returns 200 when successful", async () => {
    mockSaveBlockAction.mockResolvedValue({ success: true });

    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKey: PAGE_KEY,
        blockKey: BLOCK_KEY,
        payload: PAYLOAD,
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSaveBlockAction).toHaveBeenCalledWith(
      PAGE_KEY,
      BLOCK_KEY,
      PAYLOAD,
    );
  });

  it("returns 400 when saveContentBlock returns error", async () => {
    mockSaveBlockAction.mockResolvedValue({
      success: false,
      error: "Payload inválido",
      details: [{ message: "El claim es obligatorio" }],
    });

    const request = new Request(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKey: PAGE_KEY,
        blockKey: BLOCK_KEY,
        payload: {},
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Payload inválido");
    expect(body.details).toBeDefined();
  });
});
