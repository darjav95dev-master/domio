// ---------------------------------------------------------------------------
// Cursor encoder/decoder for keyset pagination
// ---------------------------------------------------------------------------

export interface CursorPayload {
  sortKey: string;
  id: string;
}

/**
 * Encodes a sortKey + id pair into a base64url cursor string.
 */
export function encodeCursor(sortKey: string, id: string): string {
  return Buffer.from(`${sortKey}|${id}`).toString("base64url");
}

/**
 * Decodes a base64url cursor string back into a CursorPayload.
 * Throws if the cursor format is invalid.
 */
export function decodeCursor(cursor: string): CursorPayload {
  const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
  const separatorIndex = decoded.lastIndexOf("|");
  if (separatorIndex === -1) {
    throw new Error("Invalid cursor format");
  }
  return {
    sortKey: decoded.slice(0, separatorIndex),
    id: decoded.slice(separatorIndex + 1),
  };
}
