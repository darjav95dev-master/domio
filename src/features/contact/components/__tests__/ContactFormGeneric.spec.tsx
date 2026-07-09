import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Constants (shared to avoid sonarjs/no-duplicate-string)
// ---------------------------------------------------------------------------

const LABEL_NOMBRE = "Nombre completo";
const LABEL_EMAIL = "Correo electrónico";
const LABEL_MENSAJE = "Mensaje";
const BTN_ENVIAR = /enviar mensaje/i;

// Mock the server action before importing the component
const mockSubmit = vi.fn();
vi.mock("../../actions/submit-contact.action", () => ({
  submitContactForm: (...args: unknown[]) => mockSubmit(...args),
}));

// Mock rate limit dependency
vi.mock("../../actions/contact-form-action", () => ({
  checkContactRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { ContactFormGeneric } from "../ContactFormGeneric";

describe("ContactFormGeneric", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmit.mockResolvedValue({ success: true });
  });

  it("renders all form fields and submit button", () => {
    render(<ContactFormGeneric />);

    expect(screen.getByLabelText(LABEL_NOMBRE)).toBeInTheDocument();
    expect(screen.getByLabelText(LABEL_EMAIL)).toBeInTheDocument();
    expect(screen.getByLabelText(LABEL_MENSAJE)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: BTN_ENVIAR }),
    ).toBeInTheDocument();
  });

  it("renders required attribute on name, email and message fields", () => {
    render(<ContactFormGeneric />);

    expect(screen.getByLabelText(LABEL_NOMBRE)).toHaveAttribute("required");
    expect(screen.getByLabelText(LABEL_EMAIL)).toHaveAttribute("required");
    expect(screen.getByLabelText(LABEL_MENSAJE)).toHaveAttribute("required");
  });

  it("renders email input with type email", () => {
    render(<ContactFormGeneric />);

    expect(screen.getByLabelText(LABEL_EMAIL)).toHaveAttribute("type", "email");
  });

  it("associates labels with inputs via htmlFor", () => {
    render(<ContactFormGeneric />);

    const nameInput = screen.getByLabelText(LABEL_NOMBRE);
    const emailInput = screen.getByLabelText(LABEL_EMAIL);
    const messageInput = screen.getByLabelText(LABEL_MENSAJE);

    expect(nameInput).toHaveAttribute("id");
    expect(emailInput).toHaveAttribute("id");
    expect(messageInput).toHaveAttribute("id");
  });

  it("renders submit button enabled by default", () => {
    render(<ContactFormGeneric />);

    const button = screen.getByRole("button", { name: BTN_ENVIAR });
    expect(button).not.toBeDisabled();
  });
});
