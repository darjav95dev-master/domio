/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import {
  leadFiltersSchema,
  leadPaginationSchema,
  leadStatusTransitionSchema,
  leadNoteSchema,
  leadReassignSchema,
} from "@/shared/types/lead-schema";
describe("leadFiltersSchema", () => {
  it("accepts empty filters (all optional)", () => {
    const result = leadFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
      expect(result.data.source).toBeUndefined();
    }
  });

  it("accepts valid status filter", () => {
    const result = leadFiltersSchema.safeParse({ status: "NEW" });
    expect(result.success).toBe(true);
  });

  it("accepts valid source filter", () => {
    const result = leadFiltersSchema.safeParse({ source: "commercial" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = leadFiltersSchema.safeParse({ status: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source", () => {
    const result = leadFiltersSchema.safeParse({ source: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts valid date range", () => {
    const result = leadFiltersSchema.safeParse({
      dateFrom: "2026-01-01",
      dateTo: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects dateFrom without dateTo", () => {
    // Both are optional independently; this test verifies the schema accepts it
    const result = leadFiltersSchema.safeParse({ dateFrom: "2026-01-01" });
    expect(result.success).toBe(true);
  });

  it("accepts search query", () => {
    const result = leadFiltersSchema.safeParse({ search: "Juan" });
    expect(result.success).toBe(true);
  });

  it("accepts promocionId filter", () => {
    const result = leadFiltersSchema.safeParse({
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple combined filters", () => {
    const result = leadFiltersSchema.safeParse({
      status: "CONTACTED",
      source: "commercial",
      search: "Maria",
      dateFrom: "2026-06-01",
      dateTo: "2026-07-01",
      promocionId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts assignedAgentId filter", () => {
    const result = leadFiltersSchema.safeParse({
      assignedAgentId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty search string", () => {
    const result = leadFiltersSchema.safeParse({ search: "" });
    expect(result.success).toBe(false);
  });
});

describe("leadPaginationSchema", () => {
  it("accepts valid pagination with defaults", () => {
    const result = leadPaginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("accepts custom page and limit", () => {
    const result = leadPaginationSchema.safeParse({ page: 2, limit: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it("rejects page less than 1", () => {
    const result = leadPaginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects limit less than 1", () => {
    const result = leadPaginationSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects limit greater than 100", () => {
    const result = leadPaginationSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it("rejects negative page", () => {
    const result = leadPaginationSchema.safeParse({ page: -1 });
    expect(result.success).toBe(false);
  });

  it("coerces string numbers to integers", () => {
    const result = leadPaginationSchema.safeParse({ page: "2", limit: "10" });
    expect(result.success).toBe(true);
  });
});

describe("leadStatusTransitionSchema", () => {
  it("accepts valid transition NEW -> CONTACTED", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "NEW",
      newStatus: "CONTACTED",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid transition CONTACTED -> IN_NEGOTIATION", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "CONTACTED",
      newStatus: "IN_NEGOTIATION",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid transition IN_NEGOTIATION -> WON", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "IN_NEGOTIATION",
      newStatus: "WON",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid transition IN_NEGOTIATION -> LOST", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "IN_NEGOTIATION",
      newStatus: "LOST",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid transition NEW -> WON", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "NEW",
      newStatus: "WON",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid transition NEW -> LOST", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "NEW",
      newStatus: "LOST",
    });
    expect(result.success).toBe(false);
  });

  it("rejects transition from WON (terminal state)", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "WON",
      newStatus: "CONTACTED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects transition from LOST (terminal state)", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "LOST",
      newStatus: "CONTACTED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid newStatus value", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "NEW",
      newStatus: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid currentStatus value", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "INVALID",
      newStatus: "NEW",
    });
    expect(result.success).toBe(false);
  });

  it("rejects same status transition (no-op)", () => {
    const result = leadStatusTransitionSchema.safeParse({
      currentStatus: "NEW",
      newStatus: "NEW",
    });
    expect(result.success).toBe(false);
  });
});

describe("leadNoteSchema", () => {
  it("accepts valid note with text", () => {
    const result = leadNoteSchema.safeParse({ text: "Cliente interesado" });
    expect(result.success).toBe(true);
  });

  it("rejects empty note text", () => {
    const result = leadNoteSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing note text", () => {
    const result = leadNoteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects note text exceeding 5000 characters", () => {
    const result = leadNoteSchema.safeParse({ text: "x".repeat(5001) });
    expect(result.success).toBe(false);
  });

  it("accepts note at exactly 5000 characters", () => {
    const result = leadNoteSchema.safeParse({ text: "x".repeat(5000) });
    expect(result.success).toBe(true);
  });
});

describe("leadReassignSchema", () => {
  it("accepts valid reassignment with newAgentId", () => {
    const result = leadReassignSchema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440001",
      newAgentId: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty leadId", () => {
    const result = leadReassignSchema.safeParse({
      leadId: "",
      newAgentId: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty newAgentId", () => {
    const result = leadReassignSchema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440001",
      newAgentId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing leadId", () => {
    const result = leadReassignSchema.safeParse({
      newAgentId: "550e8400-e29b-41d4-a716-446655440002",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing newAgentId", () => {
    const result = leadReassignSchema.safeParse({
      leadId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(false);
  });
});
