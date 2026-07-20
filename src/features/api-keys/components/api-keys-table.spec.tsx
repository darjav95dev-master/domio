/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeysTable } from "./api-keys-table";
import type { ApiKeyResponse } from "@/shared/types/api-key-schema";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetApiKeysAction = vi.hoisted(() => vi.fn());

vi.mock("@/features/api-keys/actions/api-keys.actions", () => ({
  getApiKeysAction: mockGetApiKeysAction,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockKeys: ApiKeyResponse[] = [
  {
    id: "1",
    tenantId: "t-1",
    name: "Production API",
    isActive: true,
    rateLimitPerMin: 60,
    createdBy: "admin-1",
    createdAt: new Date("2026-01-01"),
    lastUsedAt: new Date("2026-06-01"),
  },
  {
    id: "2",
    tenantId: "t-1",
    name: "Staging Key",
    isActive: true,
    rateLimitPerMin: 120,
    createdBy: "admin-1",
    createdAt: new Date("2026-02-01"),
    lastUsedAt: null,
  },
  {
    id: "3",
    tenantId: "t-1",
    name: "Revoked Key",
    isActive: false,
    rateLimitPerMin: 30,
    createdBy: "admin-1",
    createdAt: new Date("2026-03-01"),
    lastUsedAt: new Date("2026-05-01"),
  },
];

function mockSuccess(keys: ApiKeyResponse[], total?: number) {
  mockGetApiKeysAction.mockResolvedValue({
    success: true as const,
    data: { items: keys, total: total ?? keys.length },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ApiKeysTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccess(mockKeys);
  });

  it("renders the table with API key rows", async () => {
    render(<ApiKeysTable />);

    expect(
      screen.getByRole("columnheader", { name: "Nombre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Rate limit" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Último uso" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Estado" }),
    ).toBeInTheDocument();

    expect(await screen.findByText("Production API")).toBeInTheDocument();
    expect(screen.getByText("Staging Key")).toBeInTheDocument();
    expect(screen.getByText("Revoked Key")).toBeInTheDocument();
  });

  it("calls getApiKeysAction on mount", async () => {
    render(<ApiKeysTable />);

    await screen.findByText("Production API");
    expect(mockGetApiKeysAction).toHaveBeenCalledTimes(1);
  });

  it("shows active/revoked badges correctly", async () => {
    render(<ApiKeysTable />);

    await screen.findByText("Production API");

    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Activa")).toHaveLength(2);
    expect(within(table).getByText("Eliminada")).toBeInTheDocument();
  });

  it("does not show a key prefix column", async () => {
    render(<ApiKeysTable />);

    await screen.findByText("Production API");

    expect(
      screen.queryByRole("columnheader", { name: "Key" }),
    ).not.toBeInTheDocument();
  });

  it("shows last used or Nunca", async () => {
    render(<ApiKeysTable />);

    await screen.findByText("Production API");
    // The second key has null lastUsedAt
    expect(screen.getByText("Nunca")).toBeInTheDocument();
  });

  it("filters by status when select changes", async () => {
    const user = userEvent.setup();
    // Second call returns only active keys
    mockGetApiKeysAction
      .mockResolvedValueOnce({
        success: true as const,
        data: { items: mockKeys, total: 3 },
      })
      .mockResolvedValueOnce({
        success: true as const,
        data: { items: [mockKeys[2]], total: 1 },
      });

    render(<ApiKeysTable />);

    await screen.findByText("Production API");

    const statusSelect = screen.getByLabelText("Estado");
    await user.selectOptions(statusSelect, "inactive");

    expect(mockGetApiKeysAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });

  it("shows total count", async () => {
    render(<ApiKeysTable />);

    await screen.findByText("Production API");
    expect(screen.getByText("3 API keys")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockGetApiKeysAction.mockImplementation(
      () => new Promise(() => {}),
    );

    const { container } = render(<ApiKeysTable />);
    expect(container.querySelectorAll(".animate-shimmer").length).toBeGreaterThan(0);
  });

  it("shows empty state when no keys", async () => {
    mockSuccess([], 0);

    render(<ApiKeysTable />);

    expect(await screen.findByText(/no hay api keys/i)).toBeInTheDocument();
  });
});
