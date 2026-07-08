import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/panel/leads/lead-1",
}));

import { ArsopButtons } from "../arsop-buttons";

describe("ArsopButtons", () => {
  const LEAD_ID = "lead-1";
  const DELETE_BTN_NAME = "Borrar datos del lead";
  const CONFIRM_TEXT = "Seguro que quieres borrar todos los datos?";
  const CANCEL_BTN_NAME = "Cancelar borrado";
  const CONFIRM_BTN_NAME = "Confirmar borrado de datos";

  it("renders export and delete buttons", () => {
    render(<ArsopButtons leadId={LEAD_ID} />);

    expect(
      screen.getByRole("button", { name: "Exportar datos del lead" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: DELETE_BTN_NAME }),
    ).toBeInTheDocument();
  });

  it("renders ARSOP section title", () => {
    render(<ArsopButtons leadId={LEAD_ID} />);

    expect(
      screen.getByText("Derechos ARSOP"),
    ).toBeInTheDocument();
  });

  it("does not show confirmation dialog initially", () => {
    render(<ArsopButtons leadId={LEAD_ID} />);

    expect(
      screen.queryByText(CONFIRM_TEXT),
    ).not.toBeInTheDocument();
  });

  it("shows confirmation dialog when delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<ArsopButtons leadId={LEAD_ID} />);

    const deleteButton = screen.getByRole("button", {
      name: DELETE_BTN_NAME,
    });
    await user.click(deleteButton);

    expect(
      screen.getByText(CONFIRM_TEXT),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: CONFIRM_BTN_NAME }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: CANCEL_BTN_NAME }),
    ).toBeInTheDocument();
  });

  it("hides confirmation dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<ArsopButtons leadId={LEAD_ID} />);

    const deleteButton = screen.getByRole("button", {
      name: DELETE_BTN_NAME,
    });
    await user.click(deleteButton);

    const cancelButton = screen.getByRole("button", {
      name: CANCEL_BTN_NAME,
    });
    await user.click(cancelButton);

    expect(
      screen.queryByText(CONFIRM_TEXT),
    ).not.toBeInTheDocument();
  });
});
