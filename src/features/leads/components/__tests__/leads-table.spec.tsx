import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/panel/leads",
}));

import { LeadsTable, type LeadsTableProps } from "../leads-table";
import type { LeadRow } from "@/infrastructure/db/repositories/lead.repository";

// ─── Fake data ───────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "lead-1",
    tenantId: "tenant-1",
    promocionId: "promo-1",
    tipologiaId: null,
    source: "commercial",
    channel: "FORM",
    name: "Juan Pérez",
    email: "juan@example.com",
    phone: "+34 600 000 000",
    message: "Quiero información",
    status: "NEW",
    assignedAgentId: "agent-1",
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  };
}

const defaultProps: LeadsTableProps = {
  leads: [makeLead()],
  total: 1,
  page: 1,
  onPageChange: vi.fn(),
  onFiltersChange: vi.fn(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LeadsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the table with lead data", () => {
    render(<LeadsTable {...defaultProps} />);

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
  });

  it("renders status badges inside table cells", () => {
    render(<LeadsTable {...defaultProps} />);

    // Query inside table cells specifically — avoids the select option match
    const table = screen.getByRole("table");
    const badge = within(table).getByText("Nuevo");
    expect(badge).toBeInTheDocument();
  });

  it("shows unread indicator dot for leads in unreadLeadIds", () => {
    const leads = [makeLead({ id: "lead-1", name: "No leído" })];
    const unreadIds = new Set(["lead-1"]);
    render(
      <LeadsTable
        {...defaultProps}
        leads={leads}
        unreadLeadIds={unreadIds}
      />,
    );

    // The dot has aria-label "No leído"
    expect(screen.getByLabelText("No leído")).toBeInTheDocument();
  });

  it("navigates to lead detail on row click", async () => {
    const user = userEvent.setup();
    render(<LeadsTable {...defaultProps} />);

    const row = screen.getByRole("row", { name: /juan pérez/i });
    await user.click(row);

    expect(mockPush).toHaveBeenCalledWith("/panel/leads/lead-1");
  });

  it("renders pagination when total > limit", () => {
    const leads = Array.from({ length: 25 }, (_, i) =>
      makeLead({ id: `lead-${i + 1}`, name: `Lead ${i + 1}` }),
    );
    render(<LeadsTable {...defaultProps} leads={leads} total={50} />);

    expect(screen.getByRole("button", { name: /siguiente/i })).toBeInTheDocument();
  });

  it("renders filter controls: status select, source select, search input", () => {
    render(<LeadsTable {...defaultProps} />);

    expect(screen.getByLabelText(/^Estado$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Source$/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument();
  });

  it("calls onFiltersChange when status filter changes", async () => {
    const onFiltersChange = vi.fn();
    const user = userEvent.setup();

    render(
      <LeadsTable {...defaultProps} onFiltersChange={onFiltersChange} />,
    );

    // Select the status filter by its label
    const statusSelect = screen.getByLabelText(/^Estado$/i);
    await user.selectOptions(statusSelect, "NEW");

    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "NEW" }),
      1,
    );
  });

  it("renders empty state when no leads", () => {
    render(<LeadsTable {...defaultProps} leads={[]} total={0} page={1} />);

    expect(
      screen.getByText(/no se encontraron leads/i),
    ).toBeInTheDocument();
  });
});
