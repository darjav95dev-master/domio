/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateUserDialog } from "./create-user-dialog";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCreateUserAction = vi.hoisted(() => vi.fn());

vi.mock("@/features/team/actions/team.actions", () => ({
  createUserAction: mockCreateUserAction,
}));

const mockOnClose = vi.fn();
const mockOnCreated = vi.fn();

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CreateUserDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUserAction.mockResolvedValue({
      success: true as const,
      data: {
        id: "new-id",
        tenantId: "t-1",
        email: "new@wedomio.com",
        name: "New User",
        role: "AGENT",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  it("renders the dialog when open", () => {
    render(
      <CreateUserDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Nuevo usuario")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <CreateUserDialog
        open={false}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has accessible form fields", () => {
    render(
      <CreateUserDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Rol")).toBeInTheDocument();
  });

  it("shows validation errors for empty fields", async () => {
    const user = userEvent.setup();
    render(
      <CreateUserDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    await user.click(screen.getByRole("button", { name: /invitar/i }));

    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("El email es obligatorio")).toBeInTheDocument();
    expect(mockCreateUserAction).not.toHaveBeenCalled();
  });

  it("calls createUserAction on valid submit", () => {
    render(
      <CreateUserDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    // Fill form using fireEvent for reliable state updates in jsdom
    const nameInput = screen.getByLabelText("Nombre");
    fireEvent.change(nameInput, { target: { value: "New User" } });

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "new@wedomio.com" } });

    const roleSelect = screen.getByLabelText("Rol");
    fireEvent.change(roleSelect, { target: { value: "AGENT" } });

    // Submit the form
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    expect(mockCreateUserAction).toHaveBeenCalledWith({
      name: "New User",
      email: "new@wedomio.com",
      role: "AGENT",
    });
  });

  it("shows success message after creation", async () => {
    render(
      <CreateUserDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@wedomio.com" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/email de invitación/i)).toBeInTheDocument();
    });
  });

  it("calls onCreated after successful creation", async () => {
    render(
      <CreateUserDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@wedomio.com" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled();
    });
  });

  it("shows error when creation fails", async () => {
    mockCreateUserAction.mockResolvedValue({
      success: false as const,
      error: "Error de prueba",
    });

    render(
      <CreateUserDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "New User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@wedomio.com" } });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Error de prueba")).toBeInTheDocument();
    });
  });

  it("has accessible dialog attributes", () => {
    render(
      <CreateUserDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Nuevo usuario");
  });
});
