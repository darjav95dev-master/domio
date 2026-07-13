/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersTable } from "./users-table";
import type { UserResponse } from "@/shared/types/user-schema";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetUsersAction = vi.hoisted(() => vi.fn());

vi.mock("@/features/team/actions/team.actions", () => ({
  getUsersAction: mockGetUsersAction,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUsers: UserResponse[] = [
  {
    id: "1",
    tenantId: "t-1",
    email: "admin@wedomio.com",
    name: "Admin User",
    role: "ADMIN",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  },
  {
    id: "2",
    tenantId: "t-1",
    email: "agent@wedomio.com",
    name: "Agent User",
    role: "AGENT",
    isActive: true,
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
  },
  {
    id: "3",
    tenantId: "t-1",
    email: "inactive@wedomio.com",
    name: "Inactive User",
    role: "OPERATOR",
    isActive: false,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
  },
];

function mockSuccess(users: UserResponse[], total?: number) {
  mockGetUsersAction.mockResolvedValue({
    success: true as const,
    data: { items: users, total: total ?? users.length },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("UsersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccess(mockUsers);
  });

  it("renders the table with user rows", async () => {
    render(<UsersTable />);

    // Column headers
    expect(screen.getByRole("columnheader", { name: "Nombre" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Rol" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Estado" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeInTheDocument();

    // User names visible after load
    expect(await screen.findByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Agent User")).toBeInTheDocument();
    expect(screen.getByText("Inactive User")).toBeInTheDocument();
  });

  it("calls getUsersAction on mount", async () => {
    render(<UsersTable />);

    await screen.findByText("Admin User");
    expect(mockGetUsersAction).toHaveBeenCalledTimes(1);
  });

  it("shows active/inactive badges correctly", async () => {
    render(<UsersTable />);

    await screen.findByText("Admin User");

    // Activo badges in table cells (not in filter options)
    const table = screen.getByRole("table");
    const activeBadges = within(table).getAllByText("Activo");
    expect(activeBadges).toHaveLength(2);

    expect(within(table).getByText("Inactivo")).toBeInTheDocument();
  });

  it("filters by role when select changes", async () => {
    const user = userEvent.setup();
    mockSuccess([mockUsers[0]!]); // Only admin after filter

    render(<UsersTable />);

    // Wait for initial render
    await screen.findByText("Admin User");

    const roleSelect = screen.getByLabelText("Rol");
    await user.selectOptions(roleSelect, "ADMIN");

    // Should call with role filter
    expect(mockGetUsersAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: "ADMIN" }),
    );
  });

  it("filters by status when select changes", async () => {
    const user = userEvent.setup();
    // Set up mock for the second call (after filter change) to return inactive users
    mockGetUsersAction
      .mockResolvedValueOnce({
        success: true as const,
        data: { items: mockUsers, total: 3 },
      })
      .mockResolvedValueOnce({
        success: true as const,
        data: { items: [mockUsers[2]], total: 1 },
      });

    render(<UsersTable />);

    await screen.findByText("Admin User");

    const statusSelect = screen.getByLabelText("Estado");
    await user.selectOptions(statusSelect, "inactive");

    // After status change, only "Inactive User" should appear
    expect(mockGetUsersAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });

  it("shows total count of users", async () => {
    render(<UsersTable />);

    await screen.findByText("Admin User");
    expect(screen.getByText("3 usuarios")).toBeInTheDocument();
  });

  it("renders actions column with edit button", async () => {
    render(<UsersTable />);

    await screen.findByText("Admin User");

    const editButtons = screen.getAllByRole("button", { name: /editar/i });
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("has accessible table structure", async () => {
    render(<UsersTable />);

    await screen.findByText("Admin User");

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(4);
  });

  it("shows loading state initially", () => {
    // Don't resolve the promise
    mockGetUsersAction.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    const { container } = render(<UsersTable />);

    // Skeleton shimmer elements render inside the table body
    const shimmerEls = container.querySelectorAll(".animate-shimmer");
    expect(shimmerEls.length).toBeGreaterThan(0);
  });

  it("shows empty state when no users", async () => {
    mockSuccess([], 0);

    render(<UsersTable />);

    expect(await screen.findByText(/no hay usuarios/i)).toBeInTheDocument();
  });
});
