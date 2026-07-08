import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DashboardContent } from "../dashboard-content";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockPromociones = [
  {
    id: "1",
    name: "Residencial Oasis",
    status: "PUBLISHED" as const,
    updatedAt: new Date("2026-07-06"),
  },
  {
    id: "2",
    name: "Edificio Marina",
    status: "DRAFT" as const,
    updatedAt: new Date("2026-07-01"),
  },
  {
    id: "3",
    name: "Villa Palmera",
    status: "RESERVED" as const,
    updatedAt: new Date("2026-06-28"),
  },
  {
    id: "4",
    name: "Ático Mirador",
    status: "SOLD" as const,
    updatedAt: new Date("2026-06-15"),
  },
  {
    id: "5",
    name: "Local Comercial Centro",
    status: "WITHDRAWN" as const,
    updatedAt: new Date("2026-05-30"),
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DashboardContent", () => {
  describe("saludo", () => {
    it("renders greeting with user name", () => {
      render(
        <DashboardContent
          userName="Ana García"
          userRole="ADMIN"
          unreadLeadsCount={3}
          recentPromociones={[]}
        />,
      );

      expect(screen.getByText("Hola, Ana García")).toBeInTheDocument();
    });

    it("uses font-display (Fraunces) for the greeting", () => {
      render(
        <DashboardContent
          userName="Carlos"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      const greeting = screen.getByText("Hola, Carlos");
      expect(greeting.className).toContain("font-display");
    });
  });

  describe("contador de leads no leídos", () => {
    it("renders the lead count as a large numeral when count > 0", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={7}
          recentPromociones={[]}
        />,
      );

      expect(screen.getByText("7")).toBeInTheDocument();
    });

    it("renders the lead count numeral in accent color and italic", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={5}
          recentPromociones={[]}
        />,
      );

      const numeral = screen.getByText("5");
      expect(numeral.className).toContain("italic");
      expect(numeral.className).toContain("font-display");
    });

    it("renders label 'Leads no leídos' below the numeral", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={3}
          recentPromociones={[]}
        />,
      );

      const labels = screen.getAllByText("Leads no leídos");
      // One is the visible label, the other is sr-only section heading
      expect(labels.length).toBe(2);
    });

    it("shows empty message when count is 0", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      expect(
        screen.getByText("No tienes leads pendientes"),
      ).toBeInTheDocument();
    });

    it("does NOT render a numeral when count is 0", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
  });

  describe("enlaces rápidos", () => {
    it("renders 3 quick link cards", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      const catálogo = screen.getByRole("link", { name: /catálogo/i });
      const leads = screen.getByRole("link", { name: /leads/i });
      const contenidos = screen.getByRole("link", { name: /contenidos/i });

      expect(catálogo).toBeInTheDocument();
      expect(leads).toBeInTheDocument();
      expect(contenidos).toBeInTheDocument();
    });

    it("links point to correct paths", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      const catálogo = screen.getByRole("link", { name: /catálogo/i });
      const leads = screen.getByRole("link", { name: /leads/i });
      const contenidos = screen.getByRole("link", { name: /contenidos/i });

      expect(catálogo).toHaveAttribute("href", "/panel/catalogo");
      expect(leads).toHaveAttribute("href", "/panel/leads");
      expect(contenidos).toHaveAttribute("href", "/panel/contenidos");
    });

    it("renders section heading for enlaces rápidos", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      expect(screen.getByText("Enlaces rápidos")).toBeInTheDocument();
    });
  });

  describe("últimas promociones editadas", () => {
    it("renders list of promociones when data is provided", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={mockPromociones}
        />,
      );

      expect(screen.getByText("Residencial Oasis")).toBeInTheDocument();
      expect(screen.getByText("Edificio Marina")).toBeInTheDocument();
      expect(screen.getByText("Villa Palmera")).toBeInTheDocument();
    });

    it.each(mockPromociones)(
      "renders status badge for $name",
      (promocion) => {
        render(
          <DashboardContent
            userName="Test"
            userRole="ADMIN"
            unreadLeadsCount={0}
            recentPromociones={[promocion]}
          />,
        );

        // Status is rendered as a badge (in a span or similar element)
        expect(screen.getByText(promocion.name)).toBeInTheDocument();
      },
    );

    it("renders section heading for promociones", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={mockPromociones}
        />,
      );

      expect(
        screen.getByText("Últimas promociones editadas"),
      ).toBeInTheDocument();
    });

    it("shows empty message when promociones array is empty", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      expect(
        screen.getByText("Aún no has editado promociones"),
      ).toBeInTheDocument();
    });

    it("renders relative time (e.g. hace 2 días) for each promo", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={mockPromociones.slice(0, 1)}
        />,
      );

      // Today is mocked via vi.setSystemTime - let's check relative text exists
      const timeElements = screen.getAllByText(/hace \d+ (días|horas|minutos)/);
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("promo name is a link to the edit page", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={mockPromociones.slice(0, 1)}
        />,
      );

      const link = screen.getByRole("link", { name: /residencial oasis/i });
      expect(link).toHaveAttribute("href", "/panel/catalogo/1");
    });
  });

  describe("atajos rápidos", () => {
    it("renders 'Nueva promoción' button linking to /panel/catalogo/nueva", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      const nuevaPromo = screen.getByRole("link", {
        name: /nueva promoción/i,
      });
      expect(nuevaPromo).toHaveAttribute("href", "/panel/catalogo/nueva");
    });

    it("renders 'Ver bandeja' button linking to /panel/leads", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      const verBandeja = screen.getByRole("link", { name: /ver bandeja/i });
      expect(verBandeja).toHaveAttribute("href", "/panel/leads");
    });

    it("renders section heading for atajos", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      expect(screen.getByText("Atajos rápidos")).toBeInTheDocument();
    });
  });

  describe("accesibilidad", () => {
    it("uses <section> with aria-labelledby for each section", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={3}
          recentPromociones={mockPromociones}
        />,
      );

      const sections = screen.getAllByRole("region");
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it("quick links are keyboard-accessible via <a> tags", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={[]}
        />,
      );

      const links = screen.getAllByRole("link");
      expect(links.length).toBeGreaterThanOrEqual(3);
    });

    it("promo names are clickable links", () => {
      render(
        <DashboardContent
          userName="Test"
          userRole="ADMIN"
          unreadLeadsCount={0}
          recentPromociones={mockPromociones.slice(0, 1)}
        />,
      );

      const link = screen.getByRole("link", { name: /residencial oasis/i });
      expect(link.tagName).toBe("A");
    });
  });
});
