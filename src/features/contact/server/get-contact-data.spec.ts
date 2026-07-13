import { describe, it, expect, vi, beforeEach } from "vitest";
import { getContactPageData, getSobrePageData } from "./get-contact-data";

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock unstable_cache to just call the wrapped function directly
vi.mock("next/cache", () => ({
  unstable_cache: <T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T>,
  ) => (...args: Args) => fn(...args),
}));

// The schema modules are imported in get-contact-data — we mock them
// at module level via vi.mock calls below.

vi.mock("@/infrastructure/db/schema", () => ({
  contactConfig: { tenantId: "tenant_id" },
  contentBlocks: { tenantId: "tenant_id", pageKey: "page_key" },
}));

// We'll mock drizzle-orm to return controlled data
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
    and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  };
});

// Mock the PublicContext
const TENANT_ID = "t-00000000-0000-0000-0000-000000000001";
const mockGetTenantId = vi.fn().mockReturnValue(TENANT_ID);
const mockWithTransaction = vi.fn();

function makeLimitQuery(rows: unknown[]) {
  return { limit: () => Promise.resolve(rows) };
}

function makeWhereQuery(rows: unknown[]) {
  return { where: () => makeLimitQuery(rows) };
}

function makeFromQuery(rows: unknown[]) {
  return { from: () => makeWhereQuery(rows) };
}

function makeSelectQuery(rows: unknown[]) {
  return { select: () => makeFromQuery(rows) };
}

function fakeTxForSelect(rows: unknown[]) {
  return makeSelectQuery(rows);
}

function fakeTxForContentBlocks(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(rows),
      }),
    }),
  };
}

vi.mock("@/infrastructure/tenant/PublicContext", () => ({
  PublicContext: vi.fn(() => ({
    getTenantId: mockGetTenantId,
    withTransaction: mockWithTransaction,
  })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getContactPageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns contact config with coordinates from PublicContext", async () => {
    const fakeContactConfig = {
      tenantId: TENANT_ID,
      phone: "+34 922 123 456",
      email: "info@wedomio.com",
      address: "Calle Ejemplo 123, Santa Cruz de Tenerife",
      hours: "Lun–Vie 9:00–18:00",
      whatsappNumber: "+34 600 123 456",
      whatsappPrefilledMessage: "Hola, me interesa...",
      officeLat: 28.4636,
      officeLng: -16.2518,
      updatedBy: null,
      updatedAt: new Date(),
    };

    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>) => fn(fakeTxForSelect([fakeContactConfig])),
    );

    const result = await getContactPageData();

    expect(result.contactConfig).not.toBeNull();
    expect(result.contactConfig!.phone).toBe("+34 922 123 456");
    expect(result.contactConfig!.email).toBe("info@wedomio.com");
    expect(result.contactConfig!.officeLat).toBeCloseTo(28.4636, 10);
    expect(result.contactConfig!.officeLng).toBeCloseTo(-16.2518, 10);
    expect(mockGetTenantId).toHaveBeenCalled();
    expect(mockWithTransaction).toHaveBeenCalled();
  });

  it("returns null contactConfig when no config found", async () => {
    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>) => fn(fakeTxForSelect([])),
    );

    const result = await getContactPageData();

    expect(result.contactConfig).toBeNull();
  });
});

describe("getSobrePageData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns hero and cuerpo with validated payload", async () => {
    const fakeBlocks = [
      {
        tenantId: TENANT_ID,
        pageKey: "sobre",
        blockKey: "hero",
        payload: { titulo: "Sobre Domio", lead: "Líder en Canarias" },
        updatedBy: null,
        updatedAt: new Date(),
      },
      {
        tenantId: TENANT_ID,
        pageKey: "sobre",
        blockKey: "cuerpo",
        payload: { parrafos: ["Párrafo 1", "Párrafo 2"] },
        updatedBy: null,
        updatedAt: new Date(),
      },
    ];

    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>) => fn(fakeTxForContentBlocks(fakeBlocks)),
    );

    const result = await getSobrePageData();

    expect(result.hero).toEqual({
      titulo: "Sobre Domio",
      lead: "Líder en Canarias",
    });
    expect(result.cuerpo).toEqual({
      parrafos: ["Párrafo 1", "Párrafo 2"],
    });
  });

  it("returns null hero and cuerpo when no blocks found", async () => {
    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>) => fn(fakeTxForContentBlocks([])),
    );

    const result = await getSobrePageData();

    expect(result.hero).toBeNull();
    expect(result.cuerpo).toBeNull();
  });

  it("returns null hero when payload validation fails", async () => {
    const fakeBlocks = [
      {
        tenantId: TENANT_ID,
        pageKey: "sobre",
        blockKey: "hero",
        // Invalid: missing 'titulo', has unknown shape
        payload: { wrongField: "value" },
        updatedBy: null,
        updatedAt: new Date(),
      },
    ];

    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>) => fn(fakeTxForContentBlocks(fakeBlocks)),
    );

    const result = await getSobrePageData();

    expect(result.hero).toBeNull();
  });

  it("returns null cuerpo when payload validation fails", async () => {
    const fakeBlocks = [
      {
        tenantId: TENANT_ID,
        pageKey: "sobre",
        blockKey: "cuerpo",
        // Invalid: parrafos must be string[]
        payload: { parrafos: "not an array" },
        updatedBy: null,
        updatedAt: new Date(),
      },
    ];

    mockWithTransaction.mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>) => fn(fakeTxForContentBlocks(fakeBlocks)),
    );

    const result = await getSobrePageData();

    expect(result.cuerpo).toBeNull();
  });
});
