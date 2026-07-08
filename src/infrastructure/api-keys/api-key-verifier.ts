import bcrypt from "bcryptjs";

/**
 * Verifies a plain-text API key against a bcrypt hash.
 *
 * This is a pure computation — it does NOT use a transaction or any DB access.
 * Extracted as a standalone helper so it can be used outside the repository
 * (e.g. in middleware or route handlers) without coupling to TenantContext.
 *
 * @param plainKey - The plain-text API key to verify
 * @param keyHash - The bcrypt hash to compare against
 * @returns true if the plain key matches the hash, false otherwise
 */
export async function verifyKey(
  plainKey: string,
  keyHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainKey, keyHash);
}
