/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { UserActions } from "./user-actions";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUpdateUserAction = vi.hoisted(() => vi.fn());
const mockDeactivateUserAction = vi.hoisted(() => vi.fn());
const mockReactivateUserAction = vi.hoisted(() => vi.fn());
const mockDeleteUserAction = vi.hoisted(() => vi.fn());

vi.mock("@/features/team/actions/team.actions", () => ({
  updateUserAction: mockUpdateUserAction,
  deactivateUserAction: mockDeactivateUserAction,
  reactivateUserAction: mockReactivateUserAction,
  deleteUserAction: mockDeleteUserAction,
}));

const mockOnUpdated = vi.fn();

const defaultUser = {
  id: "user-1",
  tenantId: "t-1",
  email: "user@wedomio.com",
  name: "Test User",
  role: "AGENT" as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("UserActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUserAction.mockResolvedValue({
      success: true as const,
      data: defaultUser,
    });
    mockDeactivateUserAction.mockResolvedValue({
      success: true as const,
      data: { ...defaultUser, isActive: false },
    });
    mockReactivateUserAction.mockResolvedValue({
      success: true as const,
      data: { ...defaultUser, isActive: true },
    });
  });

  it("renders edit and deactivate buttons", () => {
    render(<UserActions user={defaultUser} onUpdated={mockOnUpdated} />);

    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desactivar/i })).toBeInTheDocument();
  });

  it("opens edit form when clicking edit", () => {
    render(<UserActions user={defaultUser} onUpdated={mockOnUpdated} />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("pre-fills edit form with user data", () => {
    render(<UserActions user={defaultUser} onUpdated={mockOnUpdated} />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const nameInput = screen.getByLabelText("Nombre") as HTMLInputElement;
    expect(nameInput.value).toBe("Test User");

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    expect(emailInput.value).toBe("user@wedomio.com");
  });

  it("calls updateUserAction on edit submit", async () => {
    render(<UserActions user={defaultUser} onUpdated={mockOnUpdated} />);

    fireEvent.click(screen.getByRole("button", { name: /editar/i }));

    const nameInput = screen.getByLabelText("Nombre");
    fireEvent.change(nameInput, { target: { value: "Updated Name" } });

    const form = screen.getByLabelText("Editar usuario").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockUpdateUserAction).toHaveBeenCalledWith("user-1", {
        name: "Updated Name",
        email: "user@wedomio.com",
        role: "AGENT",
      });
    });
  });

  it("shows deactivate confirmation dialog", () => {
    render(<UserActions user={defaultUser} onUpdated={mockOnUpdated} />);

    fireEvent.click(screen.getByRole("button", { name: /desactivar/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/¿Desactivar a Test User/i),
    ).toBeInTheDocument();
  });

  it("calls deactivateUserAction when confirming deactivation", async () => {
    render(<UserActions user={defaultUser} onUpdated={mockOnUpdated} />);

    fireEvent.click(screen.getByRole("button", { name: /desactivar/i }));
    fireEvent.click(screen.getByRole("button", { name: /sí, desactivar/i }));

    await waitFor(() => {
      expect(mockDeactivateUserAction).toHaveBeenCalledWith("user-1");
    });
  });

  it("calls onUpdated after successful deactivation", async () => {
    render(<UserActions user={defaultUser} onUpdated={mockOnUpdated} />);

    fireEvent.click(screen.getByRole("button", { name: /desactivar/i }));
    fireEvent.click(screen.getByRole("button", { name: /sí, desactivar/i }));

    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalled();
    });
  });

  it("does not show desactivar button for inactive users", () => {
    render(
      <UserActions
        user={{ ...defaultUser, isActive: false }}
        onUpdated={mockOnUpdated}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /desactivar/i }),
    ).not.toBeInTheDocument();
  });

  it("shows self-deactivation warning in confirmation when currentUserId matches", () => {
    render(
      <UserActions
        user={defaultUser}
        onUpdated={mockOnUpdated}
        currentUserId="user-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /desactivar/i }));

    expect(
      screen.getByText(/te has desactivado a ti mismo/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/último ADMIN/i),
    ).toBeInTheDocument();
  });

  it("does not show self-deactivation warning when currentUserId differs", () => {
    render(
      <UserActions
        user={defaultUser}
        onUpdated={mockOnUpdated}
        currentUserId="other-user"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /desactivar/i }));

    expect(
      screen.queryByText(/te has desactivado a ti mismo/i),
    ).not.toBeInTheDocument();
  });

  it("shows backend warning after deactivation when response includes warning", async () => {
    mockDeactivateUserAction.mockResolvedValue({
      success: true as const,
      data: { ...defaultUser, isActive: false },
      warning: "Te has desactivado a ti mismo.",
    });

    render(
      <UserActions
        user={{ ...defaultUser, id: "user-1" }}
        onUpdated={mockOnUpdated}
        currentUserId="user-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /desactivar/i }));
    fireEvent.click(screen.getByRole("button", { name: /sí, desactivar/i }));

    await waitFor(() => {
      expect(screen.getByText("Te has desactivado a ti mismo.")).toBeInTheDocument();
    });
  });

  // ─── Reactivación ─────────────────────────────────────────────────────────

  it("shows Activar and Eliminar buttons for inactive users", () => {
    render(
      <UserActions
        user={{ ...defaultUser, isActive: false }}
        onUpdated={mockOnUpdated}
      />,
    );

    expect(screen.getByRole("button", { name: /activar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /desactivar/i }),
    ).not.toBeInTheDocument();
  });

  it("calls reactivateUserAction when clicking Activar", async () => {
    render(
      <UserActions
        user={{ ...defaultUser, isActive: false }}
        onUpdated={mockOnUpdated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /activar/i }));

    await waitFor(() => {
      expect(mockReactivateUserAction).toHaveBeenCalledWith("user-1");
    });
  });

  it("calls onUpdated after successful reactivation", async () => {
    render(
      <UserActions
        user={{ ...defaultUser, isActive: false }}
        onUpdated={mockOnUpdated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /activar/i }));

    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalled();
    });
  });

  // ─── Eliminación ───────────────────────────────────────────────────────────

  it("shows delete confirmation dialog for inactive users", () => {
    render(
      <UserActions
        user={{ ...defaultUser, isActive: false }}
        onUpdated={mockOnUpdated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/¿Eliminar a Test User/i),
    ).toBeInTheDocument();
  });

  it("calls deleteUserAction when confirming deletion", async () => {
    mockDeleteUserAction.mockResolvedValue({
      success: true as const,
      data: { id: "user-1" },
    });

    render(
      <UserActions
        user={{ ...defaultUser, isActive: false }}
        onUpdated={mockOnUpdated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));
    fireEvent.click(screen.getByRole("button", { name: /sí, eliminar/i }));

    await waitFor(() => {
      expect(mockDeleteUserAction).toHaveBeenCalledWith("user-1");
    });
  });

  it("shows error message when deletion is refused by backend", async () => {
    mockDeleteUserAction.mockResolvedValue({
      success: false as const,
      error: "No puedes eliminar tu propia cuenta.",
    });

    render(
      <UserActions
        user={{ ...defaultUser, isActive: false }}
        onUpdated={mockOnUpdated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));
    fireEvent.click(screen.getByRole("button", { name: /sí, eliminar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no puedes eliminar tu propia cuenta/i),
      ).toBeInTheDocument();
    });
    expect(mockOnUpdated).not.toHaveBeenCalled();
  });
});
