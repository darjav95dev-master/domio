"use server";

import { cookies } from "next/headers";

const CONSENT_COOKIE_NAME = "domio_consent";
const CONSENT_COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours

/**
 * Sets a consent flag cookie after a successful form submission.
 * Used by WhatsAppButton to know if the visitor has already consented.
 */
export async function setConsentCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CONSENT_COOKIE_NAME, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CONSENT_COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Returns true if the consent cookie is present.
 * Used by WhatsAppButton before creating a lead with channel='WHATSAPP'.
 */
export async function hasConsentCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.has(CONSENT_COOKIE_NAME);
}
