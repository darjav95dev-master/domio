/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import { LeadRepository } from "@/infrastructure/db/repositories/lead.repository";
import {
  createMockAuthCtx,
  setupMockTransaction,
} from "@/infrastructure/db/repositories/__tests__/test-utils";
import type { LeadStatus } from "@/shared/constants/db-enums";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const AGENT_ID = "agent-1";
const ADMIN_ID = "admin-1";
const LEAD_ID = "lead-1";
const PROMOCION_ID = "promo-1";
const NOW = new Date("2026-07-08T12:00:00Z");

const baseLeadRow = {
  id: LEAD_ID,
  tenantId: TENANT_ID,
  promocionId: PROMOCION_ID,
  tipologiaId: null,
  source: "commercial" as const,
  channel: "FORM" as const,
  name: "Juan Pérez",
  email: "juan@example.com",
  phone: "+34600123456",
  message: "Quiero información",
  status: "NEW" as LeadStatus,
  assignedAgentId: AGENT_ID,
  createdAt: NOW,
  updatedAt: NOW,
};

const baseLeadNoteRow = {
  id: "note-1",
  tenantId: TENANT_ID,
  leadId: LEAD_ID,
  authorId: USER_ID,
  body: "Cliente interesado en piso de 3 dormitorios",
  createdAt: NOW,
};

const baseLeadReadMarkRow = {
  tenantId: TENANT_ID,
  leadId: LEAD_ID,
  userId: USER_ID,
  readAt: NOW,
};

// ---------------------------------------------------------------------------
// LeadRepository
// ---------------------------------------------------------------------------
describe("LeadRepository", () => {
  describe("findAll", () => {
    it("returns all leads for the tenant with pagination", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [
        { ...baseLeadRow, id: "l1", name: "Lead 1" },
        { ...baseLeadRow, id: "l2", name: "Lead 2" },
      ];
      setupMockTransaction(mockWithTx, [items, [{ count: "2" }]]);

      const result = await repo.findAll({}, { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]?.id).toBe("l1");
    });

    it("applies status filter when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [{ ...baseLeadRow, status: "NEW" }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { status: "NEW" },
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.status).toBe("NEW");
    });

    it("applies source filter when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [{ ...baseLeadRow, source: "institutional" }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { source: "institutional" },
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.source).toBe("institutional");
    });

    it("applies search filter matching name or email", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [{ ...baseLeadRow, name: "Juan Pérez" }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { search: "Juan" },
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(1);
    });

    it("applies promocionId filter when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [{ ...baseLeadRow, promocionId: PROMOCION_ID }];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { promocionId: PROMOCION_ID },
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(1);
    });

    it("applies date range filter when provided", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [baseLeadRow];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { dateFrom: "2026-01-01", dateTo: "2026-12-31" },
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(1);
    });

    it("applies multiple combined filters with AND", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [
        {
          ...baseLeadRow,
          status: "NEW" as LeadStatus,
          source: "commercial" as const,
        },
      ];
      setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

      const result = await repo.findAll(
        { status: "NEW", source: "commercial" },
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(1);
    });

    describe("OPERATOR role blocked", () => {
      it("throws Forbidden for OPERATOR role in findAll", async () => {
        const { ctx, mockWithTx } = createMockAuthCtx({
          tenantId: TENANT_ID,
          userId: USER_ID,
          role: "OPERATOR",
        });
        setupMockTransaction(mockWithTx, [[]]);
        const repo = new LeadRepository(ctx);

        await expect(
          repo.findAll({}, { page: 1, limit: 10 }),
        ).rejects.toThrow("Forbidden");
      });
    });

    describe("AGENT role scope", () => {
      it("auto-filters by assignedAgentId for AGENT role", async () => {
        const { ctx, mockWithTx } = createMockAuthCtx({
          tenantId: TENANT_ID,
          userId: AGENT_ID,
          role: "AGENT",
        });
        const repo = new LeadRepository(ctx);
        const items = [{ ...baseLeadRow, assignedAgentId: AGENT_ID }];
        setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

        const result = await repo.findAll({}, { page: 1, limit: 10 });

        expect(result.items).toHaveLength(1);
      });

      it("AGENT ignores explicit assignedAgentId filter and uses own userId", async () => {
        const { ctx, mockWithTx } = createMockAuthCtx({
          tenantId: TENANT_ID,
          userId: AGENT_ID,
          role: "AGENT",
        });
        const repo = new LeadRepository(ctx);
        const items = [{ ...baseLeadRow, assignedAgentId: AGENT_ID }];
        setupMockTransaction(mockWithTx, [items, [{ count: "1" }]]);

        const result = await repo.findAll(
          { assignedAgentId: "other-agent" },
          { page: 1, limit: 10 },
        );

        expect(result.items).toHaveLength(1);
      });
    });
  });

  describe("findById", () => {
    it("returns the lead with all fields when found", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      setupMockTransaction(mockWithTx, [[baseLeadRow]]);

      const result = await repo.findById(LEAD_ID);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(LEAD_ID);
      expect(result!.name).toBe("Juan Pérez");
      expect(result!.status).toBe("NEW");
    });

    it("returns null when lead does not exist", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("updates lead status and inserts history entry", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const oldLead = { ...baseLeadRow, status: "NEW" as LeadStatus };
      const updatedLead = { ...baseLeadRow, status: "CONTACTED" as LeadStatus };

      // Sequence: fetch current, update lead, insert history, re-fetch
      setupMockTransaction(mockWithTx, [
        [oldLead], // fetch current
        [updatedLead], // update lead
        [{ id: "history-1" }], // insert history
        [updatedLead], // re-fetch result
      ]);

      const result = await repo.updateStatus(LEAD_ID, "CONTACTED", USER_ID);

      expect(result).not.toBeNull();
      expect(result.status).toBe("CONTACTED");
    });

    it("rejects invalid transition (NEW -> WON)", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const oldLead = { ...baseLeadRow, status: "NEW" as LeadStatus };

      // Only one query: fetch current lead to check transition
      setupMockTransaction(mockWithTx, [[oldLead]]);

      await expect(
        repo.updateStatus(LEAD_ID, "WON", USER_ID),
      ).rejects.toThrow("Invalid status transition");
    });

    it("rejects transition from terminal state WON", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const oldLead = { ...baseLeadRow, status: "WON" as LeadStatus };
      setupMockTransaction(mockWithTx, [[oldLead]]);

      await expect(
        repo.updateStatus(LEAD_ID, "CONTACTED", USER_ID),
      ).rejects.toThrow("Invalid status transition");
    });

    it("rejects transition from terminal state LOST", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const oldLead = { ...baseLeadRow, status: "LOST" as LeadStatus };
      setupMockTransaction(mockWithTx, [[oldLead]]);

      await expect(
        repo.updateStatus(LEAD_ID, "CONTACTED", USER_ID),
      ).rejects.toThrow("Invalid status transition");
    });

    it("rejects same status transition (no-op)", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const oldLead = { ...baseLeadRow, status: "NEW" as LeadStatus };
      setupMockTransaction(mockWithTx, [[oldLead]]);

      await expect(
        repo.updateStatus(LEAD_ID, "NEW", USER_ID),
      ).rejects.toThrow("Invalid status transition");
    });
  });

  describe("addNote", () => {
    it("inserts a new note for the lead", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const createdNote = { ...baseLeadNoteRow };
      setupMockTransaction(mockWithTx, [[createdNote]]);

      const result = await repo.addNote(LEAD_ID, "Cliente interesado en piso de 3 dormitorios", USER_ID);

      expect(result).not.toBeNull();
      expect(result.body).toBe("Cliente interesado en piso de 3 dormitorios");
      expect(result.authorId).toBe(USER_ID);
    });
  });

  describe("markAsRead", () => {
    it("inserts a read mark for the lead and user", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const readMark = { ...baseLeadReadMarkRow };
      setupMockTransaction(mockWithTx, [[readMark]]);

      const result = await repo.markAsRead(LEAD_ID, USER_ID);

      expect(result).not.toBeNull();
      expect(result.leadId).toBe(LEAD_ID);
      expect(result.userId).toBe(USER_ID);
    });

    it("upserts when read mark already exists", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const updatedMark = {
        ...baseLeadReadMarkRow,
        readAt: new Date("2026-07-08T13:00:00Z"),
      };
      setupMockTransaction(mockWithTx, [[updatedMark]]);

      const result = await repo.markAsRead(LEAD_ID, USER_ID);

      expect(result).not.toBeNull();
      expect(result.readAt).toEqual(new Date("2026-07-08T13:00:00Z"));
    });
  });

  describe("getUnreadCount", () => {
    it("returns the count of unread leads for a user", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "AGENT",
      });
      const repo = new LeadRepository(ctx);

      setupMockTransaction(mockWithTx, [[{ count: "5" }]]);

      const result = await repo.getUnreadCount(USER_ID);

      expect(result).toBe(5);
    });

    it("returns 0 when all leads are read", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: USER_ID,
        role: "AGENT",
      });
      const repo = new LeadRepository(ctx);

      setupMockTransaction(mockWithTx, [[{ count: "0" }]]);

      const result = await repo.getUnreadCount(USER_ID);

      expect(result).toBe(0);
    });
  });

  describe("getUnreadLeadIds", () => {
    it("returns IDs of unread leads for a user", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: AGENT_ID,
        role: "AGENT",
      });
      const repo = new LeadRepository(ctx);

      const unreadRows = [
        { id: "lead-1" },
        { id: "lead-2" },
        { id: "lead-3" },
      ];
      setupMockTransaction(mockWithTx, [unreadRows]);

      const result = await repo.getUnreadLeadIds(AGENT_ID);

      expect(result).toHaveLength(3);
      expect(result).toContain("lead-1");
      expect(result).toContain("lead-2");
      expect(result).toContain("lead-3");
    });

    it("returns empty array when all leads are read", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: AGENT_ID,
        role: "AGENT",
      });
      const repo = new LeadRepository(ctx);

      setupMockTransaction(mockWithTx, [[]]);

      const result = await repo.getUnreadLeadIds(AGENT_ID);

      expect(result).toHaveLength(0);
    });
  });

  describe("reassign", () => {
    it("updates assigned_agent_id and deletes read marks atomically", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);

      const updatedLead = {
        ...baseLeadRow,
        assignedAgentId: "new-agent-1",
      };

      // Sequence: update lead, delete read marks, re-fetch
      setupMockTransaction(mockWithTx, [
        [updatedLead], // update lead
        [], // delete read marks
        [updatedLead], // re-fetch result
      ]);

      const result = await repo.reassign(LEAD_ID, "new-agent-1");

      expect(result).not.toBeNull();
      expect(result.assignedAgentId).toBe("new-agent-1");
    });
  });

  describe("create", () => {
    it("inserts a new lead and returns it with all fields", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const createdLead = {
        ...baseLeadRow,
        id: "new-lead-id",
        name: "New Lead",
        email: "new@example.com",
      };
      setupMockTransaction(mockWithTx, [[createdLead]]);

      const result = await repo.create({
        promocionId: PROMOCION_ID,
        source: "commercial",
        channel: "FORM",
        name: "New Lead",
        email: "new@example.com",
      });

      expect(result).not.toBeNull();
      expect(result.name).toBe("New Lead");
      expect(result.email).toBe("new@example.com");
      expect(result.tenantId).toBe(TENANT_ID);
      expect(result.id).toBe("new-lead-id");
    });

    it("inserts a lead with optional fields", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const createdLead = {
        ...baseLeadRow,
        id: "lead-with-optional",
        phone: "+34600123456",
        message: "Con mensaje",
        tipologiaId: "tipo-1",
        source: "institutional",
      };
      setupMockTransaction(mockWithTx, [[createdLead]]);

      const result = await repo.create({
        promocionId: PROMOCION_ID,
        source: "institutional",
        name: "Lead con opcionales",
        email: "opcionales@example.com",
        phone: "+34600123456",
        message: "Con mensaje",
        tipologiaId: "tipo-1",
      });

      expect(result).not.toBeNull();
      expect(result.phone).toBe("+34600123456");
      expect(result.message).toBe("Con mensaje");
      expect(result.source).toBe("institutional");
    });
  });

  describe("exportCsv", () => {
    it("returns leads for ADMIN (all tenant leads)", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [
        { ...baseLeadRow, id: "l1" },
        { ...baseLeadRow, id: "l2" },
      ];
      setupMockTransaction(mockWithTx, [items]);

      const result = await repo.exportCsv({}, ADMIN_ID, "ADMIN");

      expect(result).toHaveLength(2);
    });

    it("returns only assigned leads for AGENT", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: AGENT_ID,
        role: "AGENT",
      });
      const repo = new LeadRepository(ctx);
      const items = [{ ...baseLeadRow, assignedAgentId: AGENT_ID }];
      setupMockTransaction(mockWithTx, [items]);

      const result = await repo.exportCsv({}, AGENT_ID, "AGENT");

      expect(result).toHaveLength(1);
      expect(result[0]?.assignedAgentId).toBe(AGENT_ID);
    });

    it("applies filters in CSV export", async () => {
      const { ctx, mockWithTx } = createMockAuthCtx({
        tenantId: TENANT_ID,
        userId: ADMIN_ID,
        role: "ADMIN",
      });
      const repo = new LeadRepository(ctx);
      const items = [{ ...baseLeadRow, status: "CONTACTED" as LeadStatus }];
      setupMockTransaction(mockWithTx, [items]);

      const result = await repo.exportCsv(
        { status: "CONTACTED" },
        ADMIN_ID,
        "ADMIN",
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe("CONTACTED");
    });
  });
});
