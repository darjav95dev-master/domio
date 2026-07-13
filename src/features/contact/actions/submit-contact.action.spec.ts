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
      contactConfig: { email: "info@wedomio.com" },
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
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
  });

  it("enqueues email with correct payload", async () => {
    const formData = createFormData({
      name: "Ana López",
      email: "ana@example.com",
      message: "Me interesa una vivienda.",
    });

    await submitContactForm(null, formData);

    expect(mockEnqueue).toHaveBeenCalledWith({
      toEmail: "info@wedomio.com",
      template: "contact-form-notification",
      payload: {
        name: "Ana López",
        email: "ana@example.com",
        message: "Me interesa una vivienda.",
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
});
