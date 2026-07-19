/* eslint-disable sonarjs/no-duplicate-string -- test file: template name "contact-form-notification" repeated intentionally */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitContactForm } from "./submit-contact.action";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockHeaders = vi.hoisted(() => new Headers({ "x-forwarded-for": "203.0.113.1" }));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(mockHeaders)),
}));

const mockCheckContactRateLimit = vi.hoisted(() => vi.fn());
vi.mock("./contact-form-action", () => ({
  checkContactRateLimit: (...args: unknown[]) => mockCheckContactRateLimit(...args),
}));

const mockEnqueue = vi.hoisted(() => vi.fn());
vi.mock("@/infrastructure/email/email.service", () => ({
  EmailService: vi.fn(() => ({
    enqueue: mockEnqueue,
  })),
}));

const mockGetContactPageData = vi.hoisted(() => vi.fn());
vi.mock("../server/get-contact-data", () => ({
  getContactPageData: mockGetContactPageData,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const CONTACT_EMAIL = "info@wedomio.com";
const SENDER_NAME = "Ana López";
const SENDER_EMAIL = "ana@example.com";
const SENDER_MESSAGE = "Me interesa una vivienda.";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createFormData(overrides?: Partial<Record<string, string>>): FormData {
  const fd = new FormData();
  fd.set("name", overrides?.name ?? "Juan Pérez");
  fd.set("email", overrides?.email ?? "juan@example.com");
  fd.set("message", overrides?.message ?? "Quiero información sobre el piso.");
  return fd;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("submitContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: rate limit allowed, contact config with email
    mockCheckContactRateLimit.mockResolvedValue({ allowed: true });
    mockGetContactPageData.mockResolvedValue({
      contactConfig: { email: CONTACT_EMAIL },
    });
    mockEnqueue.mockResolvedValue(undefined);
  });

  // ─── Path 1: rate limit deny ────────────────────────────────────────────

  it("returns error when rate limited", async () => {
    mockCheckContactRateLimit.mockResolvedValue({
      allowed: false,
      error: "Demasiados intentos. Inténtalo de nuevo más tarde.",
    });

    const result = await submitContactForm(null, createFormData());

    expect(result.success).toBe(false);
    expect(result.error).toBe("Demasiados intentos. Inténtalo de nuevo más tarde.");
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  // ─── Path 2: zod validation fail ────────────────────────────────────────

  it("returns fieldErrors when Zod validation fails", async () => {
    const formData = createFormData({ name: "", email: "bad", message: "" });

    const result = await submitContactForm(null, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors!.name).toBeDefined();
    expect(result.fieldErrors!.email).toBeDefined();
    expect(result.fieldErrors!.message).toBeDefined();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  // ─── Path 3: success + enqueue email ────────────────────────────────────

  it("enqueues email and returns success on valid input", async () => {
    const formData = createFormData();

    const result = await submitContactForm(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    // Dos correos: notificación al negocio + confirmación al remitente.
    expect(mockEnqueue).toHaveBeenCalledTimes(2);
  });

  it("enqueues the business notification with correct payload", async () => {
    const formData = createFormData({
      name: SENDER_NAME,
      email: SENDER_EMAIL,
      message: SENDER_MESSAGE,
    });

    await submitContactForm(null, formData);

    expect(mockEnqueue).toHaveBeenCalledWith({
      toEmail: CONTACT_EMAIL,
      template: "contact-form-notification",
      payload: {
        name: SENDER_NAME,
        email: SENDER_EMAIL,
        message: SENDER_MESSAGE,
      },
    });
  });

  it("enqueues a confirmation to the sender", async () => {
    const formData = createFormData({
      name: SENDER_NAME,
      email: SENDER_EMAIL,
      message: SENDER_MESSAGE,
    });

    await submitContactForm(null, formData);

    expect(mockEnqueue).toHaveBeenCalledWith({
      toEmail: SENDER_EMAIL,
      template: "contact-form-confirmation",
      payload: {
        name: SENDER_NAME,
        contactEmail: CONTACT_EMAIL,
      },
    });
  });

  it("returns success even when contact config has no email", async () => {
    mockGetContactPageData.mockResolvedValue({
      contactConfig: { email: null },
    });

    const result = await submitContactForm(null, createFormData());

    expect(result.success).toBe(true);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  // ─── Path 5: phone field ────────────────────────────────────────────────

  it("includes phone in notification payload when provided", async () => {
    const formData = createFormData({
      name: SENDER_NAME,
      email: SENDER_EMAIL,
      message: SENDER_MESSAGE,
    });
    formData.set("phone", "+34 600 000 000");

    await submitContactForm(null, formData);

    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: CONTACT_EMAIL,
        template: "contact-form-notification",
        payload: expect.objectContaining({ phone: "+34 600 000 000" }),
      }),
    );
  });

  it("omits phone from notification payload when not provided", async () => {
    const formData = createFormData({
      name: SENDER_NAME,
      email: SENDER_EMAIL,
      message: SENDER_MESSAGE,
    });

    await submitContactForm(null, formData);

    const notificationCall = (mockEnqueue as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: unknown[]) =>
        (call[0] as { template?: string }).template === "contact-form-notification",
    );
    expect(notificationCall).toBeDefined();
    expect((notificationCall![0] as { payload: Record<string, unknown> }).payload.phone).toBeUndefined();
  });

  it("rejects phone exceeding 30 characters", async () => {
    const formData = createFormData();
    formData.set("phone", "+".repeat(31));

    const result = await submitContactForm(null, formData);

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.phone).toBeDefined();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
