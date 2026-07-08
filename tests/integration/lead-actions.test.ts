/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before any imports
// ---------------------------------------------------------------------------
const { mockSession, mockRepoInstance } = vi.hoisted(() => {
  const session = {
    userId: "00000000-0000-4000-8000-000000000010",
    tenantId: "00000000-0000-4000-8000-000000000001",
    role: "ADMIN" as const,
    name: "Test Admin",
  };

  const instance = {
    findAll: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    addNote: vi.fn(),
    markAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
    getUnreadLeadIds: vi.fn(),
    reassign: vi.fn(),
    exportCsv: vi.fn(),
    getNotes: vi.fn(),
    getLeadHistory: vi.fn(),
  };

  return { mockSession: session, mockRepoInstance: instance };
});

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}));

vi.mock("@/infrastructure/db/repositories/lead.repository", () => ({
  LeadRepository: vi.fn(() => mockRepoInstance),
}));

// ---------------------------------------------------------------------------
// SUT imports
// ---------------------------------------------------------------------------
import {
  getLeadsAction,
  getUnreadCountAction,
  getLeadDetailAction,
  addNoteAction,
  markAsReadAction,
  updateLeadStatusAction,
  reassignLeadAction,
  exportLeadsCsvAction,
} from "@/features/leads/actions/leads.actions";
import { getServerSession } from "@/infrastructure/auth/session";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const LEAD_ID = "00000000-0000-4000-8000-000000000020";
const USER_ID = mockSession.userId;
const AGENT_ID = "00000000-0000-4000-8000-000000000030";
const PROMOCION_ID = "00000000-0000-4000-8000-000000000040";

const baseLeadRow = {
  id: LEAD_ID,
  tenantId: mockSession.tenantId,
  promocionId: PROMOCION_ID,
  tipologiaId: null,
  source: "commercial" as const,
  channel: "FORM" as const,
  name: "Juan Pérez",
  email: "juan@example.com",
  phone: "+34600123456",
  message: "Quiero información",
  status: "NEW" as const,
  assignedAgentId: AGENT_ID,
  createdAt: new Date("2026-07-08T12:00:00Z"),
  updatedAt: new Date("2026-07-08T12:00:00Z"),
};

const baseNoteRow = {
  id: "note-1",
  tenantId: mockSession.tenantId,
  leadId: LEAD_ID,
  authorId: USER_ID,
  body: "Test note",
  createdAt: new Date("2026-07-08T12:00:00Z"),
};

const baseHistoryRow = {
  id: "history-1",
  tenantId: mockSession.tenantId,
  leadId: LEAD_ID,
  fromStatus: "NEW" as const,
  toStatus: "CONTACTED" as const,
  authorId: USER_ID,
  createdAt: new Date("2026-07-08T12:00:00Z"),
};

describe("LeadActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Ensure getServerSession returns the mock session by default
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
  });

  // -----------------------------------------------------------------------
  // getLeadsAction
  // -----------------------------------------------------------------------
  describe("getLeadsAction", () => {
    it("returns paginated leads for the tenant", async () => {
      const items = [{ ...baseLeadRow, id: "l1" }];
      mockRepoInstance.findAll.mockResolvedValue({ items, total: 1 });

      const result = await getLeadsAction({}, 1);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockRepoInstance.findAll).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 20 },
      );
    });

    it("throws Permission denied when session is null", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(getLeadsAction({}, 1)).rejects.toThrow("Permission denied");
    });
  });

  // -----------------------------------------------------------------------
  // getUnreadCountAction
  // -----------------------------------------------------------------------
  describe("getUnreadCountAction", () => {
    it("returns the unread count for current user", async () => {
      mockRepoInstance.getUnreadCount.mockResolvedValue(3);

      const result = await getUnreadCountAction();

      expect(result).toBe(3);
      expect(mockRepoInstance.getUnreadCount).toHaveBeenCalledWith(USER_ID);
    });

    it("throws Permission denied when session is null", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      await expect(getUnreadCountAction()).rejects.toThrow("Permission denied");
    });
  });

  // -----------------------------------------------------------------------
  // getLeadDetailAction
  // -----------------------------------------------------------------------
  describe("getLeadDetailAction", () => {
    it("returns lead detail with notes and history", async () => {
      mockRepoInstance.findById.mockResolvedValue(baseLeadRow);
      mockRepoInstance.getNotes.mockResolvedValue([baseNoteRow]);
      mockRepoInstance.getLeadHistory.mockResolvedValue([baseHistoryRow]);

      const result = await getLeadDetailAction(LEAD_ID);

      expect(result.lead.id).toBe(LEAD_ID);
      expect(result.notes).toHaveLength(1);
      expect(result.history).toHaveLength(1);
      expect(mockRepoInstance.findById).toHaveBeenCalledWith(LEAD_ID);
      expect(mockRepoInstance.getNotes).toHaveBeenCalledWith(LEAD_ID);
      expect(mockRepoInstance.getLeadHistory).toHaveBeenCalledWith(LEAD_ID);
    });

    it("throws Lead not found when lead does not exist", async () => {
      mockRepoInstance.findById.mockResolvedValue(null);

      await expect(getLeadDetailAction(LEAD_ID)).rejects.toThrow(
        "Lead not found",
      );
    });
  });

  // -----------------------------------------------------------------------
  // addNoteAction
  // -----------------------------------------------------------------------
  describe("addNoteAction", () => {
    it("adds a note to the lead and returns it", async () => {
      const noteText = "Cliente interesado en piso";
      mockRepoInstance.addNote.mockResolvedValue({
        ...baseNoteRow,
        body: noteText,
      });

      const result = await addNoteAction(LEAD_ID, noteText);

      expect(result.body).toBe(noteText);
      expect(mockRepoInstance.addNote).toHaveBeenCalledWith(
        LEAD_ID,
        noteText,
        USER_ID,
      );
    });

    it("rejects empty note text", async () => {
      await expect(addNoteAction(LEAD_ID, "")).rejects.toThrow();
    });

    it("rejects note text exceeding max length", async () => {
      await expect(addNoteAction(LEAD_ID, "x".repeat(5001))).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // markAsReadAction
  // -----------------------------------------------------------------------
  describe("markAsReadAction", () => {
    it("marks the lead as read for the current user", async () => {
      const readMark = {
        tenantId: mockSession.tenantId,
        leadId: LEAD_ID,
        userId: USER_ID,
        readAt: new Date("2026-07-08T12:00:00Z"),
      };
      mockRepoInstance.markAsRead.mockResolvedValue(readMark);

      const result = await markAsReadAction(LEAD_ID);

      expect(result.leadId).toBe(LEAD_ID);
      expect(result.userId).toBe(USER_ID);
      expect(mockRepoInstance.markAsRead).toHaveBeenCalledWith(
        LEAD_ID,
        USER_ID,
      );
    });
  });

  // -----------------------------------------------------------------------
  // updateLeadStatusAction
  // -----------------------------------------------------------------------
  describe("updateLeadStatusAction", () => {
    it("updates lead status when transition is valid", async () => {
      const lead = { ...baseLeadRow, status: "NEW" as const };
      const updatedLead = { ...baseLeadRow, status: "CONTACTED" as const };
      mockRepoInstance.findById.mockResolvedValue(lead);
      mockRepoInstance.updateStatus.mockResolvedValue(updatedLead);

      const result = await updateLeadStatusAction(LEAD_ID, "CONTACTED");

      expect(result.status).toBe("CONTACTED");
      expect(mockRepoInstance.findById).toHaveBeenCalledWith(LEAD_ID);
      expect(mockRepoInstance.updateStatus).toHaveBeenCalledWith(
        LEAD_ID,
        "CONTACTED",
        USER_ID,
      );
    });

    it("throws Lead not found when lead does not exist", async () => {
      mockRepoInstance.findById.mockResolvedValue(null);

      await expect(
        updateLeadStatusAction(LEAD_ID, "CONTACTED"),
      ).rejects.toThrow("Lead not found");
    });

    it("rejects invalid status transition (NEW -> WON)", async () => {
      const lead = { ...baseLeadRow, status: "NEW" as const };
      mockRepoInstance.findById.mockResolvedValue(lead);

      await expect(
        updateLeadStatusAction(LEAD_ID, "WON"),
      ).rejects.toThrow("Invalid status transition");
    });
  });

  // -----------------------------------------------------------------------
  // reassignLeadAction — ADMIN only
  // -----------------------------------------------------------------------
  describe("reassignLeadAction", () => {
    it("reassigns lead when caller is ADMIN", async () => {
      const newAgentId = "00000000-0000-4000-8000-000000000050";
      const updatedLead = {
        ...baseLeadRow,
        assignedAgentId: newAgentId,
      };
      mockRepoInstance.reassign.mockResolvedValue(updatedLead);

      const result = await reassignLeadAction(LEAD_ID, newAgentId);

      expect(result.assignedAgentId).toBe(newAgentId);
      expect(mockRepoInstance.reassign).toHaveBeenCalledWith(
        LEAD_ID,
        newAgentId,
      );
    });

    it("throws when caller is not ADMIN", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...mockSession,
        role: "AGENT",
      });

      await expect(
        reassignLeadAction(LEAD_ID, AGENT_ID),
      ).rejects.toThrow("Only ADMIN can reassign leads");
    });

    it("throws when newAgentId is not a valid UUID", async () => {
      await expect(
        reassignLeadAction(LEAD_ID, "not-a-uuid"),
      ).rejects.toThrow(ZodError);
    });

    it("throws when leadId is not a valid UUID", async () => {
      await expect(
        reassignLeadAction("not-a-uuid", AGENT_ID),
      ).rejects.toThrow(ZodError);
    });
  });

  // -----------------------------------------------------------------------
  // exportLeadsCsvAction
  // -----------------------------------------------------------------------
  describe("exportLeadsCsvAction", () => {
    it("generates CSV string from lead data", async () => {
      const leads = [
        baseLeadRow,
        { ...baseLeadRow, id: "lead-2", name: "María García", email: "maria@example.com" },
      ];
      mockRepoInstance.exportCsv.mockResolvedValue(leads);

      const csv = await exportLeadsCsvAction({});

      expect(typeof csv).toBe("string");
      expect(csv).toContain("ID,Nombre,Email,Teléfono");
      expect(csv).toContain("Juan Pérez");
      expect(csv).toContain("María García");
      expect(csv).toContain(LEAD_ID);
      expect(mockRepoInstance.exportCsv).toHaveBeenCalledWith(
        {},
        USER_ID,
        "ADMIN",
      );
    });

    it("includes header row and data rows", async () => {
      mockRepoInstance.exportCsv.mockResolvedValue([baseLeadRow]);

      const csv = await exportLeadsCsvAction();

      const lines = csv.split("\n");
      expect(lines[0]).toBe(
        "ID,Nombre,Email,Teléfono,Estado,Source,Canal,Promoción ID,Agente Asignado,Mensaje,Creado,Actualizado",
      );
      expect(lines.length).toBe(2); // header + 1 data row
    });

    it("escapes fields with commas or quotes", async () => {
      const leadWithComma = {
        ...baseLeadRow,
        name: "Pérez, Juan",
        message: 'Dijo "hola"',
      };
      mockRepoInstance.exportCsv.mockResolvedValue([leadWithComma]);

      const csv = await exportLeadsCsvAction();

      expect(csv).toContain('"Pérez, Juan"');
      expect(csv).toContain('"Dijo ""hola"""');
    });
  });
});
