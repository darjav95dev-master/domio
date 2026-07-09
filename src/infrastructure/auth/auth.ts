import NextAuth from "next-auth";
import { getServerSession } from "next-auth";
import { authConfig } from "./auth.config";

/**
 * NextAuth handler for the App Router API route.
 * This file should not be imported from middleware.ts (Edge Runtime
 * incompatibility with openid-client).
 */
export const handler = NextAuth(authConfig);

/**
 * Retrieve the current server session using the auth config.
 * This works in any server context (page, layout, API route).
 */
export async function auth(): Promise<ReturnType<typeof getServerSession>> {
  return getServerSession(authConfig);
}

/**
 * Sign out helper for client components.
 */
export const signOut = async () => {
  const { signOut: nextSignOut } = await import("next-auth/react");
  return nextSignOut();
};
