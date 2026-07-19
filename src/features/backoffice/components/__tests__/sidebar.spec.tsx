/* eslint-disable jsx-a11y/aria-role -- Sidebar `role` prop is intentional, not an ARIA attribute */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar } from "../sidebar";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPathname = vi.fn().mockReturnValue("/panel");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("next/link", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockComp = ({ children, href, className, ...props }: any) => {
    const anchorProps: Record<string, unknown> = { href, className };
    if (props["aria-current"] === "page") anchorProps["aria-current"] = "page" as const;
    if (typeof props.onClick === "function") anchorProps.onClick = props.onClick;
    return <a {...anchorProps}>{children}</a>;
  };
  return { default: MockComp };
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Sidebar", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/panel");
  });

  describe("role-based filtering", () => {
    it("renders Dashboard and Catalog for AGENT role (allowed sections)", () => {
      render(<Sidebar role="AGENT" />);

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Catálogo")).toBeInTheDocument();
    });

    it("does NOT render Equipo for AGENT role", () => {
      render(<Sidebar role="AGENT" />);

      expect(screen.queryByText("Equipo")).not.toBeInTheDocument();
    });

    it("does NOT render Contenidos for AGENT role", () => {
      render(<Sidebar role="AGENT" />);

      expect(screen.queryByText("Contenidos")).not.toBeInTheDocument();
    });

    it("does NOT render API Keys for AGENT role", () => {
      render(<Sidebar role="AGENT" />);

      expect(screen.queryByText("API Keys")).not.toBeInTheDocument();
    });

    it("renders Contenidos for OPERATOR role", () => {
      render(<Sidebar role="OPERATOR" />);

      expect(screen.getByText("Contenidos")).toBeInTheDocument();
    });

    it("does NOT render Equipo for OPERATOR role", () => {
      render(<Sidebar role="OPERATOR" />);

      expect(screen.queryByText("Equipo")).not.toBeInTheDocument();
    });

    it("renders all 6 sections for ADMIN role", () => {
      render(<Sidebar role="ADMIN" />);

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Catálogo")).toBeInTheDocument();
      expect(screen.getByText("Leads")).toBeInTheDocument();
      expect(screen.getByText("Equipo")).toBeInTheDocument();
      expect(screen.getByText("Contenidos")).toBeInTheDocument();
      expect(screen.getByText("API Keys")).toBeInTheDocument();
    });
  });

  describe("active state", () => {
    it("marks Dashboard as active when pathname is /panel", () => {
      mockPathname.mockReturnValue("/panel");
      render(<Sidebar role="ADMIN" />);

      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute("aria-current", "page");
    });

    it("marks Catalogo as active when pathname starts with /panel/catalogo", () => {
      mockPathname.mockReturnValue("/panel/catalogo");
      render(<Sidebar role="ADMIN" />);

      const catalogoLink = screen.getByRole("link", { name: /catálogo/i });
      expect(catalogoLink).toHaveAttribute("aria-current", "page");
    });
  });

  describe("desktop sidebar", () => {
    it("renders the nav element with accessible label", () => {
      render(<Sidebar role="ADMIN" />);

      const nav = screen.getByRole("navigation", {
        name: /navegación del panel/i,
      });
      expect(nav).toBeInTheDocument();
    });

    it("renders the Domio logo in Fraunces italic", () => {
      render(<Sidebar role="ADMIN" />);

      const logo = screen.getByText("Domio");
      expect(logo).toBeInTheDocument();
      expect(logo.className).toContain("font-display");
      expect(logo.className).toContain("italic");
    });

    it("renders an aside with the desktop sidebar", () => {
      const { container } = render(<Sidebar role="ADMIN" />);

      // The desktop sidebar is an <aside> with hidden on mobile, fixed on md+
      const aside = container.querySelector("aside");
      expect(aside).toBeInTheDocument();
      expect(aside?.className).toContain("bg-bg-inverted");
    });
  });

  describe("mobile drawer", () => {
    const OPEN_LABEL = "Abrir menú de navegación";
    const CLOSE_LABEL = "Cerrar menú";
    const DIALOG_NAME = /menú de navegación/i;

    function openDrawer() {
      const btn = screen.getByLabelText(OPEN_LABEL);
      return btn;
    }

    it("renders a hamburger button with aria-label for opening menu", () => {
      render(<Sidebar role="ADMIN" />);

      expect(screen.getByLabelText(OPEN_LABEL)).toBeInTheDocument();
    });

    it("opens the drawer when hamburger is clicked", async () => {
      const user = userEvent.setup();
      render(<Sidebar role="ADMIN" />);

      await user.click(openDrawer());

      expect(screen.getByLabelText(CLOSE_LABEL)).toBeInTheDocument();
    });

    it("renders drawer with role='dialog' and aria-modal='true' when open", async () => {
      const user = userEvent.setup();
      render(<Sidebar role="ADMIN" />);

      await user.click(openDrawer());

      const dialog = screen.getByRole("dialog", {
        name: DIALOG_NAME,
      });
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("closes the drawer when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<Sidebar role="ADMIN" />);

      await user.click(openDrawer());
      await user.click(screen.getByLabelText(CLOSE_LABEL));

      expect(
        screen.queryByLabelText(CLOSE_LABEL),
      ).not.toBeInTheDocument();
    });

    it("closes the drawer when Escape is pressed", async () => {
      const user = userEvent.setup();
      render(<Sidebar role="ADMIN" />);

      await user.click(openDrawer());

      expect(
        screen.getByRole("dialog", { name: DIALOG_NAME }),
      ).toBeInTheDocument();

      await user.keyboard("{Escape}");

      expect(
        screen.queryByRole("dialog", { name: DIALOG_NAME }),
      ).not.toBeInTheDocument();
    });
  });
});
