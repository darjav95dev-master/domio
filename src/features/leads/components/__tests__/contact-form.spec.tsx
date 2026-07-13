import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NULL_PROMOCION_ID } from "@/shared/constants/lead-defaults";
import { RGPD_CONSENT_TEXT_LEAD } from "@/shared/constants/consent-texts";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/contacto",
}));

// Mock the dynamic import of createLeadAction.
// The form does: await import("@/features/engagement/server/create-lead-action")
const mockCreateLeadAction = vi.fn();
vi.mock("@/features/engagement/server/create-lead-action", () => ({
  createLeadAction: (...args: unknown[]) => mockCreateLeadAction(...args),
}));

// Mock TurnstileWidget — renders nothing in tests (no Cloudflare JS available)
vi.mock("@/shared/components/TurnstileWidget", () => ({
  TurnstileWidget: ({ onToken }: { onToken: (t: string | null) => void }) => {
    // Expose a test utility via data attribute so tests can trigger token
    return (
      <button
        type="button"
        data-testid="turnstile-mock"
        onClick={() => onToken("test-turnstile-token")}
      />
    );
  },
}));

import { ContactForm } from "../contact-form";

const LABEL_NOMBRE = "Nombre completo";
const LABEL_EMAIL = "Correo electrónico";

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLeadAction.mockResolvedValue({ success: true });
  });

  it("renders all required form fields", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText(LABEL_NOMBRE)).toBeInTheDocument();
    expect(screen.getByLabelText(LABEL_EMAIL)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /teléfono/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /mensaje/i })).toBeInTheDocument();
  });

  it("renders consent checkbox with canonical RGPD legal text", () => {
    render(<ContactForm />);

    const checkbox = screen.getByLabelText("Acepto la política de privacidad");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeRequired();

    expect(screen.getByText(RGPD_CONSENT_TEXT_LEAD)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ContactForm />);

    expect(
      screen.getByRole("button", { name: "Enviar mensaje" }),
    ).toBeInTheDocument();
  });

  it("disables submit button while pending", () => {
    render(<ContactForm />);

    const button = screen.getByRole("button", { name: "Enviar mensaje" });
    expect(button).not.toBeDisabled();
  });

  it("calls createLeadAction with correct fields on submit", async () => {
    render(<ContactForm />);

    // Fill in the form fields
    fireEvent.change(screen.getByLabelText(LABEL_NOMBRE), {
      target: { value: "Ana García" },
    });
    fireEvent.change(screen.getByLabelText(LABEL_EMAIL), {
      target: { value: "ana@example.com" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /teléfono/i }), {
      target: { value: "+34 600 111 222" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /mensaje/i }), {
      target: { value: "Quiero información sobre el inmueble." },
    });

    // Submit the form
    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });

    await waitFor(() => {
      expect(mockCreateLeadAction).toHaveBeenCalledOnce();
    });

    const call = mockCreateLeadAction.mock.calls[0]![0];
    expect(call.name).toBe("Ana García");
    expect(call.email).toBe("ana@example.com");
    expect(call.message).toBe("Quiero información sobre el inmueble.");
    expect(call.consent).toBe(true);
    expect(call.promocionId).toBe(NULL_PROMOCION_ID);
  });

  it("shows success state after successful submit", async () => {
    mockCreateLeadAction.mockResolvedValue({ success: true });
    render(<ContactForm />);

    fireEvent.change(screen.getByLabelText(LABEL_NOMBRE), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText(LABEL_EMAIL), {
      target: { value: "test@example.com" },
    });

    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Mensaje enviado correctamente"),
      ).toBeInTheDocument();
    });
  });

  it("shows error message when createLeadAction returns failure", async () => {
    mockCreateLeadAction.mockResolvedValue({
      success: false,
      error: "Error de prueba",
    });
    render(<ContactForm />);

    await act(async () => {
      fireEvent.submit(document.querySelector("form")!);
    });

    await waitFor(() => {
      expect(screen.getByText("Error de prueba")).toBeInTheDocument();
    });
  });
});
