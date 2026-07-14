import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const LOGOUT_LABEL = "Cerrar sesión";

const mockGetServerSession = vi.fn();

vi.mock("@/infrastructure/auth/session", () => ({
  getServerSession: () => mockGetServerSession(),
}));

vi.mock("@/infrastructure/auth/auth.config", () => ({
  signOut: vi.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("PanelHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the user name when session has a name", async () => {
    mockGetServerSession.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      name: "Ana García",
    });

    const PanelHeader = (await import("../panel-header")).default;
    const { container } = render(await PanelHeader());

    expect(container.textContent).toContain("Ana García");
  });

  it("renders 'Usuario' as fallback when session name is null", async () => {
    mockGetServerSession.mockResolvedValue({
      userId: "user-2",
      tenantId: "tenant-1",
      role: "OPERATOR",
      name: null,
    });

    const PanelHeader = (await import("../panel-header")).default;
    const { container } = render(await PanelHeader());

    expect(container.textContent).toContain("Usuario");
  });

  it("renders a logout button with aria-label 'Cerrar sesión'", async () => {
    mockGetServerSession.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      name: "Admin",
    });

    const PanelHeader = (await import("../panel-header")).default;
    render(await PanelHeader());

    const logoutButton = screen.getByLabelText(LOGOUT_LABEL);
    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton).toHaveTextContent(LOGOUT_LABEL);
  });

  it("returns null (empty) when session is null", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const PanelHeader = (await import("../panel-header")).default;
    const { container } = render(await PanelHeader());

    expect(container.innerHTML).toBe("");
  });

  it("renders within a <header> element", async () => {
    mockGetServerSession.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      name: "Test User",
    });

    const PanelHeader = (await import("../panel-header")).default;
    const { container } = render(await PanelHeader());

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
  });

  it("cierra sesión con signOut(), no con un form POST a /api/auth/signout", async () => {
    mockGetServerSession.mockResolvedValue({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      name: "Test User",
    });

    const PanelHeader = (await import("../panel-header")).default;
    const { container } = render(await PanelHeader());

    // El form plano no llevaba token CSRF: NextAuth v4 lo rechazaba y redirigía
    // a su página de confirmación (/api/auth/signout?csrf=true) en vez de cerrar
    // la sesión y volver al login.
    expect(container.querySelector("form")).not.toBeInTheDocument();
    expect(
      container.querySelector('form[action="/api/auth/signout"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: LOGOUT_LABEL }),
    ).toBeInTheDocument();
  });
});
