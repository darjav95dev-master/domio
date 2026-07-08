import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HistoryPanel } from "./history-panel";

describe("HistoryPanel", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockHistoryItems = [
    {
      id: "1",
      promocionId: "promo-123",
      field: "name",
      oldValue: "Old Name",
      newValue: "New Name",
      authorName: "Juan Pérez",
      createdAt: "2026-07-08T10:00:00Z",
    },
    {
      id: "2",
      promocionId: "promo-123",
      field: "status",
      oldValue: "DRAFT",
      newValue: "PUBLISHED",
      authorName: "María García",
      createdAt: "2026-07-07T14:30:00Z",
    },
  ];

  it("should show loading state initially", () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}), // never resolves
    );

    render(<HistoryPanel promocionId="promo-123" />);

    expect(screen.getByRole("status")).toBeDefined();
  });

  it("should render history items after fetch", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockHistoryItems }),
    });

    render(<HistoryPanel promocionId="promo-123" />);

    await waitFor(() => {
      expect(screen.getByText("Nombre")).toBeDefined();
    });

    expect(screen.getByText("Estado")).toBeDefined();
    expect(screen.getByText("Juan Pérez")).toBeDefined();
    expect(screen.getByText("María García")).toBeDefined();
  });

  it("should show empty state when no history items", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    render(<HistoryPanel promocionId="promo-123" />);

    await waitFor(() => {
      expect(screen.getByText("No hay cambios registrados")).toBeDefined();
    });
  });

  it("should show error state when fetch fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    render(<HistoryPanel promocionId="promo-123" />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeDefined();
    });
  });

  it("should toggle collapsible entry on click", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockHistoryItems }),
    });

    const user = userEvent.setup();
    render(<HistoryPanel promocionId="promo-123" />);

    await waitFor(() => {
      expect(screen.getByText("Nombre")).toBeDefined();
    });

    // Old/new values should be hidden initially
    const oldValue = screen.queryByText("Old Name");
    expect(oldValue).toBeNull();

    // Click the first entry header to expand
    const header = screen.getByText("Nombre").closest("button");
    expect(header).not.toBeNull();
    await user.click(header!);

    // Values should now be visible
    expect(screen.getByText("Old Name")).toBeDefined();
    expect(screen.getByText("New Name")).toBeDefined();
  });

  it("should map field names to human-readable labels", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockHistoryItems }),
    });

    render(<HistoryPanel promocionId="promo-123" />);

    await waitFor(() => {
      // "name" should map to "Nombre"
      expect(screen.getByText("Nombre")).toBeDefined();
      // "status" should map to "Estado"
      expect(screen.getByText("Estado")).toBeDefined();
    });
  });
});
