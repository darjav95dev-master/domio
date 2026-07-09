"use server";

import { cookies } from "next/headers";

const CONSENT_COOKIE_NAME = "domio_consent";
const CONSENT_COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours

/**
 * Sets a consent flag cookie after a successful form submission.
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
