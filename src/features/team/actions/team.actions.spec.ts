/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  deactivateUserAction,
} from "./team.actions";
import type { UserRow } from "@/shared/types/user-schema";
import type { UserRole } from "@/shared/constants/db-enums";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetServerSession = vi.hoisted(() => vi.fn());

const { mockFindAll, mockFindById, mockCreate, mockUpdate, mockDeactivate } =
  vi.hoisted(() => ({
    mockFindAll: vi.fn(),
    mockFindById: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockDeactivate: vi.fn(),
  }));

vi.mock("@/infrastructure/db/repositories/user.repository", () => ({
  UserRepository: vi.fn(() => ({
    findAll: mockFindAll,
    findById: mockFindById,
    create: mockCreate,
    update: mockUpdate,
    deactivate: mockDeactivate,
  })),
}));

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: mockGetServerSession,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const adminSession = {
  userId: "admin-1",
  tenantId: "tenant-1",
  role: "ADMIN" as UserRole,
  name: "Admin",
};

const operatorSession = {
  userId: "op-1",
  tenantId: "tenant-1",
  role: "OPERATOR" as UserRole,
  name: "Operator",
};

const mockUserRow: UserRow = {
  id: "user-123",
  tenantId: "tenant-1",
  email: "agent@domio.com",
  name: "Test Agent",
  role: "AGENT",
  isActive: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("getUsersAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return users when admin calls with no filters", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockFindAll.mockResolvedValue({ items: [mockUserRow], total: 1 });

    const result = await getUsersAction({});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.total).toBe(1);
    }
    expect(mockFindAll).toHaveBeenCalledWith({ role: undefined, isActive: undefined });
  });

  it("should return users when admin calls with role filter", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockFindAll.mockResolvedValue({ items: [mockUserRow], total: 1 });

    const result = await getUsersAction({ role: "AGENT" });

    expect(result.success).toBe(true);
    expect(mockFindAll).toHaveBeenCalledWith({ role: "AGENT", isActive: undefined });
  });

  it("should return users when admin calls with isActive filter", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockFindAll.mockResolvedValue({ items: [], total: 0 });

    const result = await getUsersAction({ isActive: false });

    expect(result.success).toBe(true);
    expect(mockFindAll).toHaveBeenCalledWith({ role: undefined, isActive: false });
  });

  it("should reject non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(operatorSession);

    const result = await getUsersAction({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Acceso denegado");
    }
    expect(mockFindAll).not.toHaveBeenCalled();
  });

  it("should reject unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await getUsersAction({});

    expect(result.success).toBe(false);
    expect(mockFindAll).not.toHaveBeenCalled();
  });
});

describe("createUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create user when admin provides valid data", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockCreate.mockResolvedValue(mockUserRow);

    const result = await createUserAction({
      email: "user@example.com",
      name: "Test User",
      role: "AGENT",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        email: mockUserRow.email,
        name: mockUserRow.name,
        role: mockUserRow.role,
      });
    }
    expect(mockCreate).toHaveBeenCalledWith({
      email: "user@example.com",
      name: "Test User",
      role: "AGENT",
    });
  });

  it("should reject non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(operatorSession);

    const result = await createUserAction({
      email: "user@example.com",
      name: "Test User",
      role: "AGENT",
    });

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should reject invalid email", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);

    const result = await createUserAction({
      email: "not-an-email",
      name: "Test User",
      role: "AGENT",
    });

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should reject empty name", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);

    const result = await createUserAction({
      email: "user@example.com",
      name: "",
      role: "AGENT",
    });

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should reject invalid role", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);

    const result = await createUserAction({
      email: "user@example.com",
      name: "Test User",
      role: "INVALID_ROLE" as "AGENT",
    });

    expect(result.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("updateUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update user when admin provides valid data", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockUpdate.mockResolvedValue({ ...mockUserRow, name: "Updated Name" });

    const result = await updateUserAction("user-1", {
      name: "Updated Name",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Updated Name");
    }
    expect(mockUpdate).toHaveBeenCalledWith("user-1", { name: "Updated Name" });
  });

  it("should reject non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(operatorSession);

    const result = await updateUserAction("user-1", { name: "Updated Name" });

    expect(result.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("should reject unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await updateUserAction("user-1", { name: "Updated Name" });

    expect(result.success).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("deactivateUserAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should deactivate user when admin", async () => {
    mockGetServerSession.mockResolvedValue(adminSession);
    mockDeactivate.mockResolvedValue({ ...mockUserRow, isActive: false });

    const result = await deactivateUserAction("user-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
    expect(mockDeactivate).toHaveBeenCalledWith("user-1");
  });

  it("should reject non-admin users", async () => {
    mockGetServerSession.mockResolvedValue(operatorSession);

    const result = await deactivateUserAction("user-1");

    expect(result.success).toBe(false);
    expect(mockDeactivate).not.toHaveBeenCalled();
  });

  it("should reject unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await deactivateUserAction("user-1");

    expect(result.success).toBe(false);
    expect(mockDeactivate).not.toHaveBeenCalled();
  });
});
