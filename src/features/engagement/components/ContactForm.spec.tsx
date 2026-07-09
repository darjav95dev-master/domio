/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactForm } from "./ContactForm";
import type { TipologiaWithUnidades } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Polyfill scrollIntoView for jsdom
// ---------------------------------------------------------------------------

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateLeadAction = vi.fn();
vi.mock("../server/create-lead-action", () => ({
  createLeadAction: (...args: unknown[]) => mockCreateLeadAction(...args),
}));

const mockSetConsentCookie = vi.fn();
vi.mock("../server/consent-actions", () => ({
  setConsentCookie: (...args: unknown[]) => mockSetConsentCookie(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockTipologias(): TipologiaWithUnidades[] {
  return [
    {
      id: "00000000-0000-0000-0000-000000000001",
      tenantId: "tenant-1",
      promocionId: "promo-1",
      name: "Tipo A — 3 dorm.",
      usefulArea: 80,
      builtArea: 95,
      floors: null,
      bedrooms: 3,
      bathrooms: 2,
      yearBuilt: null,
      energyCert: null,
      referencePriceSale: 350000,
      referencePriceRent: null,
      communityFee: null,
      deposit: null,
      amenities: [],
      planAssetId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      unidades: [],
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      tenantId: "tenant-1",
      promocionId: "promo-1",
      name: "Tipo B — 2 dorm.",
      usefulArea: 65,
      builtArea: 78,
      floors: null,
      bedrooms: 2,
      bathrooms: 1,
      yearBuilt: null,
      energyCert: null,
      referencePriceSale: 250000,
      referencePriceRent: null,
      communityFee: null,
      deposit: null,
      amenities: [],
      planAssetId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      unidades: [],
    },
  ];
}

const defaultProps = {
  promocionId: "promo-1",
  tipologias: createMockTipologias(),
};

/** Submit the form via fireEvent.submit */
function submitForm(form: HTMLFormElement) {
  fireEvent.submit(form);
}

/** Set a form field value directly */
function setField(
  container: HTMLElement,
  name: string,
  value: string | boolean,
) {
  const el = container.querySelector(
    `[name="${name}"]`,
  ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (!el) throw new Error(`Field [name="${name}"] not found`);
  if (typeof value === "boolean") {
    (el as HTMLInputElement).checked = value;
    fireEvent.change(el, { target: { checked: value } });
  } else if (el instanceof HTMLSelectElement) {
    fireEvent.change(el, { target: { value } });
  } else {
    el.value = value;
    fireEvent.change(el, { target: { value } });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────

  it("renders all form fields", () => {
    render(<ContactForm {...defaultProps} />);

    expect(screen.getByLabelText("Nombre completo")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Teléfono (opcional)"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Tipo de inmueble (opcional)"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Mensaje")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        /He leído y acepto la política de privacidad/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /solicitar información/i }),
    ).toBeInTheDocument();
  });

  it("renders tipología options from prop", () => {
    render(<ContactForm {...defaultProps} />);

    const select = screen.getByLabelText(
      "Tipo de inmueble (opcional)",
    ) as HTMLSelectElement;
    expect(select.options).toHaveLength(3);
    expect(select.options[0]!.value).toBe("");
    expect(select.options[1]!.text).toBe("Tipo A — 3 dorm.");
    expect(select.options[2]!.text).toBe("Tipo B — 2 dorm.");
  });

  // ─── Synchronous validation (warms up React event system) ─────────────

  it("shows validation errors for empty required fields on submit", () => {
    const { container } = render(<ContactForm {...defaultProps} />);
    submitForm(container.querySelector("form") as HTMLFormElement);

    expect(
      screen.getByText("El nombre debe tener al menos 2 caracteres"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Introduce un email válido"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El mensaje debe tener al menos 10 caracteres"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Debes aceptar la política de privacidad"),
    ).toBeInTheDocument();
  });

  it("shows error when consent is not checked", () => {
    const { container } = render(<ContactForm {...defaultProps} />);

    setField(container, "name", "Juan Pérez");
    setField(container, "email", "juan@example.com");
    setField(container, "message", "Me interesa esta propiedad para mudarme");
    submitForm(container.querySelector("form") as HTMLFormElement);

    expect(
      screen.getByText("Debes aceptar la política de privacidad"),
    ).toBeInTheDocument();
    expect(mockCreateLeadAction).not.toHaveBeenCalled();
  });

  // ─── Async submission — runs after event system is initialized ─────────

  it("calls createLeadAction on valid submission", async () => {
    mockCreateLeadAction.mockResolvedValueOnce({
      success: true,
      message:
        "Solicitud recibida. Nuestro equipo te contactará en 24-48h.",
    });

    const { container } = render(<ContactForm {...defaultProps} />);

    setField(container, "name", "Juan Pérez");
    setField(container, "email", "juan@example.com");
    setField(container, "phone", "+34 612 345 678");
    setField(
      container,
      "message",
      "Me interesa esta propiedad para mudarme con mi familia",
    );
    setField(container, "consent", true);

    submitForm(container.querySelector("form") as HTMLFormElement);

    await vi.waitFor(() => {
      expect(mockCreateLeadAction).toHaveBeenCalled();
    });

    expect(mockCreateLeadAction).toHaveBeenCalledWith({
      name: "Juan Pérez",
      email: "juan@example.com",
      phone: "+34 612 345 678",
      tipologiaId: undefined,
      message:
        "Me interesa esta propiedad para mudarme con mi familia",
      consent: true,
      promocionId: "promo-1",
    });
  });

  it("sets consent cookie after successful submission", async () => {
    mockCreateLeadAction.mockResolvedValueOnce({
      success: true,
      message: "OK",
    });

    const { container } = render(<ContactForm {...defaultProps} />);

    setField(container, "name", "Juan Pérez");
    setField(container, "email", "juan@example.com");
    setField(
      container,
      "message",
      "Me interesa esta propiedad para mudarme con mi familia",
    );
    setField(container, "consent", true);

    submitForm(container.querySelector("form") as HTMLFormElement);

    await vi.waitFor(() => {
      expect(mockSetConsentCookie).toHaveBeenCalledOnce();
    });
  });

  it("shows aria-live region on general error", async () => {
    mockCreateLeadAction.mockResolvedValueOnce({
      success: false,
      error: "Demasiados intentos.",
    });

    const { container } = render(<ContactForm {...defaultProps} />);

    setField(container, "name", "Juan Pérez");
    setField(container, "email", "juan@example.com");
    setField(
      container,
      "message",
      "Me interesa esta propiedad para mudarme",
    );
    setField(container, "consent", true);

    submitForm(container.querySelector("form") as HTMLFormElement);

    await vi.waitFor(() => {
      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });
  });

  it("shows field-level errors from the action", async () => {
    mockCreateLeadAction.mockResolvedValueOnce({
      success: false,
      errors: { email: ["Introduce un email válido"] },
    });

    const { container } = render(<ContactForm {...defaultProps} />);

    setField(container, "name", "Juan Pérez");
    setField(container, "email", "email-invalido");
    setField(
      container,
      "message",
      "Me interesa esta propiedad para mudarme",
    );
    setField(container, "consent", true);

    submitForm(container.querySelector("form") as HTMLFormElement);

    await vi.waitFor(() => {
      expect(
        screen.getByText("Introduce un email válido"),
      ).toBeInTheDocument();
    });
  });

  it("shows loading state with disabled button during submission", () => {
    mockCreateLeadAction.mockReturnValue(new Promise(() => {}));

    const { container } = render(<ContactForm {...defaultProps} />);

    setField(container, "name", "Juan Pérez");
    setField(container, "email", "juan@example.com");
    setField(
      container,
      "message",
      "Me interesa esta propiedad para mudarme",
    );
    setField(container, "consent", true);

    submitForm(container.querySelector("form") as HTMLFormElement);

    expect(
      screen.getByRole("button", { name: /enviando/i }),
    ).toBeDisabled();
  });
});
