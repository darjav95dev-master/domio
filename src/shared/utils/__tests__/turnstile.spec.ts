import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { verifyTurnstileToken } from "@/shared/utils/turnstile";

const SOME_TOKEN = "some-token";
const VALID_SECRET = "valid-secret";
const VALID_TOKEN = "valid-token";
const ERR_NO_CAPTCHA = "CAPTCHA no configurado. Contacta con el administrador.";
const ERR_NO_TOKEN = "Debes completar la verificación de seguridad.";
const ERR_TIMEOUT = "timeout-or-duplicate";

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyTurnstileToken", () => {
  // -------------------------------------------------------------------------
  // Branch 1: No secret key in development (degraded mode — bypass)
  // -------------------------------------------------------------------------
  it("bypasses verification when no secret key in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    // TURNSTILE_SECRET_KEY is not set

    const result = await verifyTurnstileToken(SOME_TOKEN);

    expect(result.success).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Branch 2: No secret key in production (hard error)
  // -------------------------------------------------------------------------
  it("returns error when no secret key in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    // TURNSTILE_SECRET_KEY is not set

    const result = await verifyTurnstileToken(SOME_TOKEN);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      ERR_NO_CAPTCHA,
    );
  });

  it("returns error when NODE_ENV is not 'development' and no secret key", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = await verifyTurnstileToken(SOME_TOKEN);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      ERR_NO_CAPTCHA,
    );
  });

  // -------------------------------------------------------------------------
  // Branch 3: No token provided
  // -------------------------------------------------------------------------
  it("returns error when token is null", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", VALID_SECRET);

    const result = await verifyTurnstileToken(null);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      ERR_NO_TOKEN,
    );
  });

  it("returns error when token is undefined", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", VALID_SECRET);

    const result = await verifyTurnstileToken(undefined);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      ERR_NO_TOKEN,
    );
  });

  it("returns error when token is empty string", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", VALID_SECRET);

    const result = await verifyTurnstileToken("");

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      ERR_NO_TOKEN,
    );
  });

  // -------------------------------------------------------------------------
  // Branch 4: Fetch call fails (network error)
  // -------------------------------------------------------------------------
  it("returns error when fetch fails", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", VALID_SECRET);
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await verifyTurnstileToken(VALID_TOKEN);

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Error al verificar la seguridad. Inténtalo de nuevo.",
    );
  });

  // -------------------------------------------------------------------------
  // Branch 5: Cloudflare returns error-codes
  // -------------------------------------------------------------------------
  it("returns error when Cloudflare responds with error-codes", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", VALID_SECRET);
    const mockResponse = {
      success: false,
      "error-codes": [ERR_TIMEOUT],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce(mockResponse),
    } as unknown as Response);

    const result = await verifyTurnstileToken(VALID_TOKEN);

    expect(result.success).toBe(false);
    expect(result.error).toContain(ERR_TIMEOUT);
  });

  it("returns error when Cloudflare responds with multiple error-codes", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", VALID_SECRET);
    const mockResponse = {
      success: false,
      "error-codes": ["invalid-input-response", ERR_TIMEOUT],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce(mockResponse),
    } as unknown as Response);

    const result = await verifyTurnstileToken(VALID_TOKEN);

    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid-input-response");
    expect(result.error).toContain(ERR_TIMEOUT);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  it("returns success when Cloudflare confirms the token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", VALID_SECRET);
    const mockResponse = { success: true };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce(mockResponse),
    } as unknown as Response);

    const result = await verifyTurnstileToken(VALID_TOKEN);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("sends correct request body to Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "my-secret-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce({ success: true }),
    } as unknown as Response);

    await verifyTurnstileToken("my-token-value");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    // Verify the body contains secret and response
    const callBody = (fetchSpy.mock.calls[0]![1] as RequestInit)
      .body as URLSearchParams;
    expect(callBody.get("secret")).toBe("my-secret-key");
    expect(callBody.get("response")).toBe("my-token-value");
  });

  it("handles Cloudflare response without error-codes field", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", VALID_SECRET);
    const mockResponse = { success: false }; // no error-codes
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: vi.fn().mockResolvedValueOnce(mockResponse),
    } as unknown as Response);

    const result = await verifyTurnstileToken(VALID_TOKEN);

    expect(result.success).toBe(false);
    expect(result.error).toContain("unknown");
  });
});
