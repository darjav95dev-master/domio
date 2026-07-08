import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { CreateApiKeyDialog } from "./create-api-key-dialog";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCreateApiKeyAction = vi.hoisted(() => vi.fn());

vi.mock("@/features/api-keys/actions/api-keys.actions", () => ({
  createApiKeyAction: mockCreateApiKeyAction,
}));

const mockOnClose = vi.fn();
const mockOnCreated = vi.fn();

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CreateApiKeyDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateApiKeyAction.mockResolvedValue({
      success: true as const,
      data: {
        id: "new-key",
        tenantId: "t-1",
        name: "My Key",
        isActive: true,
        rateLimitPerMin: 60,
        createdBy: "admin-1",
        createdAt: new Date(),
        lastUsedAt: null,
        plainKey: "dom_abc123def456",
      },
    });
  });

  it("renders the dialog when open", () => {
    render(
      <CreateApiKeyDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Nueva API key")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <CreateApiKeyDialog
        open={false}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has accessible form fields", () => {
    render(
      <CreateApiKeyDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Rate limit")).toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    render(
      <CreateApiKeyDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
    expect(mockCreateApiKeyAction).not.toHaveBeenCalled();
  });

  it("calls createApiKeyAction on valid submit", () => {
    render(
      <CreateApiKeyDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "My API Key" },
    });

    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    expect(mockCreateApiKeyAction).toHaveBeenCalledWith("My API Key", 60);
  });

  it("shows plain key after creation", async () => {
    render(
      <CreateApiKeyDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "My Key" },
    });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("dom_abc123def456")).toBeInTheDocument();
    });
  });

  it("shows copy button after creation", async () => {
    render(
      <CreateApiKeyDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "My Key" },
    });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copiar/i })).toBeInTheDocument();
    });
  });

  it("shows warning text after creation", async () => {
    render(
      <CreateApiKeyDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "My Key" },
    });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      // Warning text appears in the alert banner
      const warnings = screen.getAllByText(/no podrás volver a ver/i);
      expect(warnings.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("calls onCreated after successful creation", async () => {
    render(
      <CreateApiKeyDialog
        open={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre"), {
      target: { value: "My Key" },
    });
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled();
    });
  });
});
