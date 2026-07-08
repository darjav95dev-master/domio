import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next/navigation
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/portafolio",
}));

import { FilterBar } from "@/features/catalog/components/FilterBar";

describe("FilterBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders as a form with role search", () => {
    render(<FilterBar />);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("renders all main filter controls", () => {
    render(<FilterBar />);
    expect(screen.getByLabelText("Isla")).toBeInTheDocument();
    expect(screen.getByLabelText("Municipio")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo")).toBeInTheDocument();
    expect(screen.getByLabelText("Operación")).toBeInTheDocument();
    expect(screen.getByLabelText("Dormitorios")).toBeInTheDocument();
    expect(screen.getByLabelText("Baños")).toBeInTheDocument();
    expect(screen.getByLabelText("Estado de obra")).toBeInTheDocument();
  });

  it("renders price range inputs", () => {
    render(<FilterBar />);
    expect(screen.getByLabelText("Precio mín.")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio máx.")).toBeInTheDocument();
  });

  it("renders amenity checkboxes", () => {
    render(<FilterBar />);
    // First 3 amenities rendered as checkboxes
    expect(screen.getByLabelText("Ascensor")).toBeInTheDocument();
    expect(screen.getByLabelText("Terraza")).toBeInTheDocument();
    expect(screen.getByLabelText("Balcón")).toBeInTheDocument();
  });

  it("renders active filter chips when filters are present", () => {
    const filters = {
      island: "Tenerife",
      propertyType: "piso",
    };
    const { container } = render(<FilterBar initialFilters={filters} />);
    // Chips render inside aria-live region after the control section
    const chipsContainer = container.querySelector("[aria-live='polite']");
    expect(chipsContainer).toBeInTheDocument();
    expect(chipsContainer!.textContent).toContain("Tenerife");
    expect(chipsContainer!.textContent).toContain("Piso");
  });

  it("renders clear button when activeCount > 0", () => {
    render(<FilterBar initialFilters={{ island: "Tenerife" }} />);
    expect(
      screen.getByRole("button", { name: /limpiar filtros/i }),
    ).toBeInTheDocument();
  });

  it("calls clearFilters when clear button is clicked", () => {
    render(<FilterBar initialFilters={{ island: "Tenerife" }} />);
    const clearBtn = screen.getByRole("button", { name: /limpiar filtros/i });
    fireEvent.click(clearBtn);
    expect(mockReplace).toHaveBeenCalledWith(
      "/portafolio",
      expect.objectContaining({ scroll: false }),
    );
  });
});
