/**
 * Cloudflare Turnstile verification utility.
 *
 * Verifies the Turnstile token server-side by calling the Cloudflare API.
 * The secret key is read from the TURNSTILE_SECRET_KEY environment variable.
 */

import { logger } from "@/shared/utils/logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
}

/**
 * Verifies a Turnstile token with Cloudflare's API.
 *
 * @param token - The turnstile response token from the client widget.
 * @returns The verification result with success status and optional error message.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
): Promise<TurnstileVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If no secret key is configured, log a warning and allow (degraded mode).
  // This is useful in development environments where Turnstile is not set up.
  if (!secretKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Domio] TURNSTILE_SECRET_KEY not configured. CAPTCHA verification skipped.",
      );
      return { success: true };
    }

    logger.error("TURNSTILE_SECRET_KEY is not set in production environment.");
    return {
      success: false,
      error: "CAPTCHA no configurado. Contacta con el administrador.",
    };
  }

  if (!token) {
    return {
      success: false,
      error: "Debes completar la verificación de seguridad.",
    };
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = (await response.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!data.success) {
      const errorCodes = data["error-codes"]?.join(", ") ?? "unknown";
      return {
        success: false,
        error: `Error de verificación de seguridad: ${errorCodes}`,
      };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "Error al verificar la seguridad. Inténtalo de nuevo.",
    };
  }
}
