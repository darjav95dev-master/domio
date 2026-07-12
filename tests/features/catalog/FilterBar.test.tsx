import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

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

  it("renders as a search landmark", () => {
    render(<FilterBar />);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("renders the row of custom dropdown triggers", () => {
    render(<FilterBar />);
    expect(screen.getByRole("button", { name: "Operación" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tipo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Isla" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dormitorios" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Precio" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Más filtros" })).toBeInTheDocument();
  });

  it("opens a dropdown and reveals its options on click", () => {
    render(<FilterBar />);
    // Options are not in the DOM until the dropdown is opened.
    expect(screen.queryByRole("option", { name: "Venta" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Operación" }));
    expect(screen.getByRole("option", { name: "Venta" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alquiler" })).toBeInTheDocument();
  });

  it("applies a filter when an option is selected", () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByRole("button", { name: "Isla" }));
    fireEvent.click(screen.getByRole("option", { name: "Tenerife" }));
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("island=Tenerife"),
      expect.objectContaining({ scroll: false }),
    );
  });

  it("shows the selected value in the trigger and marks it active", () => {
    render(<FilterBar initialFilters={{ propertyType: "piso" }} />);
    // The Tipo trigger now reads "Piso" instead of the placeholder.
    expect(screen.getByRole("button", { name: "Piso" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tipo" })).not.toBeInTheDocument();
  });

  it("exposes advanced filters inside the 'Más filtros' dropdown", () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByRole("button", { name: "Más filtros" }));
    const panel = screen.getByRole("listbox");
    expect(within(panel).getByText("Municipio")).toBeInTheDocument();
    expect(within(panel).getByText("Servicios")).toBeInTheDocument();
    expect(within(panel).getByLabelText("Ascensor")).toBeInTheDocument();
  });

  it("renders a global clear button when filters are active", () => {
    render(<FilterBar initialFilters={{ island: "Tenerife" }} />);
    const clearBtn = screen.getByRole("button", { name: /limpiar \(/i });
    fireEvent.click(clearBtn);
    expect(mockReplace).toHaveBeenCalledWith(
      "/portafolio",
      expect.objectContaining({ scroll: false }),
    );
  });
});
