import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server actions
const mockGetLeadsAction = vi.fn();
const mockExportLeadsCsvAction = vi.fn();
vi.mock("@/features/leads/actions/leads.actions", () => ({
  getLeadsAction: (...args: unknown[]) => mockGetLeadsAction(...args),
  exportLeadsCsvAction: (...args: unknown[]) => mockExportLeadsCsvAction(...args),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/panel/leads",
}));

import { LeadsPageContent } from "../leads-page-content";
import type { LeadRow } from "@/infrastructure/db/repositories/lead.repository";

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

describe("LeadsPageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLeadsAction.mockResolvedValue({ items: [makeLead()], total: 1 });
    mockExportLeadsCsvAction.mockResolvedValue("ID,Nombre\nlead-1,Juan");
  });

  it("renders the page title", () => {
    render(
      <LeadsPageContent
        initialLeads={[makeLead()]}
        initialTotal={1}
        initialPage={1}
      />,
    );

    expect(screen.getByText("Leads")).toBeInTheDocument();
  });

  it("renders export CSV button", () => {
    render(
      <LeadsPageContent
        initialLeads={[makeLead()]}
        initialTotal={1}
        initialPage={1}
      />,
    );

    expect(
      screen.getByRole("button", { name: /exportar.*csv/i }),
    ).toBeInTheDocument();
  });

  it("renders the leads table with initial data", () => {
    render(
      <LeadsPageContent
        initialLeads={[makeLead({ name: "Test Lead" })]}
        initialTotal={1}
        initialPage={1}
      />,
    );

    expect(screen.getByText("Test Lead")).toBeInTheDocument();
  });
});
