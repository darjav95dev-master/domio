import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server actions
const mockUpdateStatus = vi.fn();
const mockAddNote = vi.fn();
const mockReassign = vi.fn();
vi.mock("@/features/leads/actions/leads.actions", () => ({
  updateLeadStatusAction: (...args: unknown[]) => mockUpdateStatus(...args),
  addNoteAction: (...args: unknown[]) => mockAddNote(...args),
  reassignLeadAction: (...args: unknown[]) => mockReassign(...args),
  getLeadDetailAction: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/panel/leads/lead-1",
}));

import { LeadDetail } from "../lead-detail";
import type {
  LeadRow,
  LeadNoteRow,
  LeadHistoryRow,
} from "@/infrastructure/db/repositories/lead.repository";

// ─── Fixtures ────────────────────────────────────────────────────────────────

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
    message: "Quiero información sobre la promoción",
    status: "NEW",
    assignedAgentId: "agent-1",
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  };
}

function makeNote(overrides: Partial<LeadNoteRow> = {}): LeadNoteRow {
  return {
    id: "note-1",
    tenantId: "tenant-1",
    leadId: "lead-1",
    authorId: "agent-1",
    body: "Nota de prueba",
    createdAt: new Date("2026-07-02T10:00:00Z"),
    ...overrides,
  };
}

function makeHistoryEntry(
  overrides: Partial<LeadHistoryRow> = {},
): LeadHistoryRow {
  return {
    id: "hist-1",
    tenantId: "tenant-1",
    leadId: "lead-1",
    fromStatus: "NEW",
    toStatus: "CONTACTED",
    authorId: "agent-1",
    createdAt: new Date("2026-07-02T12:00:00Z"),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LeadDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders lead contact information", () => {
    const lead = makeLead();
    render(
      <LeadDetail
        lead={lead}
        notes={[]}
        history={[]}
        currentUserRole="AGENT"
      />,
    );

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    expect(screen.getByText("+34 600 000 000")).toBeInTheDocument();
  });

  it("renders current status badge", () => {
    render(
      <LeadDetail
        lead={makeLead({ status: "NEW" })}
        notes={[]}
        history={[]}
        currentUserRole="AGENT"
      />,
    );

    expect(screen.getByLabelText(/estado: nuevo/i)).toBeInTheDocument();
  });

  it("renders notes section with list and add form", () => {
    const notes = [makeNote({ body: "Primer contacto realizado" })];

    render(
      <LeadDetail
        lead={makeLead()}
        notes={notes}
        history={[]}
        currentUserRole="AGENT"
      />,
    );

    expect(screen.getByText("Primer contacto realizado")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/escribe una nota/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /añadir nota/i })).toBeInTheDocument();
  });

  it("adds a note when the form is submitted", async () => {
    const user = userEvent.setup();
    mockAddNote.mockResolvedValue(makeNote());

    render(
      <LeadDetail
        lead={makeLead()}
        notes={[]}
        history={[]}
        currentUserRole="AGENT"
      />,
    );

    const input = screen.getByPlaceholderText(/escribe una nota/i);
    await user.type(input, "Nota nueva");

    const btn = screen.getByRole("button", { name: /añadir nota/i });
    await user.click(btn);

    expect(mockAddNote).toHaveBeenCalledWith("lead-1", "Nota nueva");
  });

  it("renders history timeline entries", () => {
    const history = [makeHistoryEntry()];

    render(
      <LeadDetail
        lead={makeLead()}
        notes={[]}
        history={history}
        currentUserRole="AGENT"
      />,
    );

    // The timeline shows the label "Contactado" (toStatus) and "Nuevo" (fromStatus)
    const timeline = screen.getByLabelText("Histórico de cambios");
    expect(timeline).toHaveTextContent("Contactado");
    expect(timeline).toHaveTextContent("Nuevo");
  });

  it("shows status transition selector with valid options for NEW status", () => {
    render(
      <LeadDetail
        lead={makeLead({ status: "NEW" })}
        notes={[]}
        history={[]}
        currentUserRole="AGENT"
      />,
    );

    // Should show a status selector — use the id
    const statusSelect = screen.getByLabelText("Cambiar estado del lead");
    expect(statusSelect).toBeInTheDocument();

    // NEW can only go to CONTACTED — make sure the option exists
    const options = within(statusSelect).getAllByRole("option");
    const optionValues = options.map((o) => o.getAttribute("value"));
    expect(optionValues).toContain("CONTACTED");
    // WON and LOST should not be valid from NEW
    expect(optionValues).not.toContain("WON");
    expect(optionValues).not.toContain("LOST");
  });

  it("calls updateLeadStatusAction when status changes", async () => {
    const user = userEvent.setup();
    mockUpdateStatus.mockResolvedValue(makeLead({ status: "CONTACTED" }));

    render(
      <LeadDetail
        lead={makeLead({ status: "NEW" })}
        notes={[]}
        history={[]}
        currentUserRole="AGENT"
      />,
    );

    const statusSelect = screen.getByLabelText("Cambiar estado del lead");
    await user.selectOptions(statusSelect, "CONTACTED");

    expect(mockUpdateStatus).toHaveBeenCalledWith("lead-1", "CONTACTED");
  });

  it("does NOT show reassign button for AGENT role", () => {
    render(
      <LeadDetail
        lead={makeLead()}
        notes={[]}
        history={[]}
        currentUserRole="AGENT"
      />,
    );

    expect(
      screen.queryByRole("button", { name: /reasignar/i }),
    ).not.toBeInTheDocument();
  });

  it("shows reassign button for ADMIN role", () => {
    render(
      <LeadDetail
        lead={makeLead()}
        notes={[]}
        history={[]}
        currentUserRole="ADMIN"
      />,
    );

    expect(
      screen.getByRole("button", { name: /reasignar/i }),
    ).toBeInTheDocument();
  });

  it("calls reassignLeadAction when reassign is submitted", async () => {
    const user = userEvent.setup();
    mockReassign.mockResolvedValue(makeLead());

    render(
      <LeadDetail
        lead={makeLead()}
        notes={[]}
        history={[]}
        currentUserRole="ADMIN"
      />,
    );

    // Click reassign button to reveal the form
    const reassignBtn = screen.getByRole("button", { name: /reasignar/i });
    await user.click(reassignBtn);

    // Should show agent ID input
    const agentInput = screen.getByLabelText(/nuevo agente/i);
    await user.type(agentInput, "agent-2");

    const confirmBtn = screen.getByRole("button", { name: /confirmar/i });
    await user.click(confirmBtn);

    expect(mockReassign).toHaveBeenCalledWith("lead-1", "agent-2");
  });
});
