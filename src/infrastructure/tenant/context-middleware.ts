import { API_KEY_HEADER } from "@/shared/constants/tenant-hosts";

export class ContextResolutionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ContextResolutionError";
  }
}

const BEARER_PREFIX = "Bearer ";

export function extractApiKey(
  headers: { get(name: string): string | null },
): string | null {
  const authorization = headers.get("authorization") ?? "";

  if (authorization.startsWith(BEARER_PREFIX)) {
    const token = authorization.slice(BEARER_PREFIX.length).trim();

    if (token.length > 0) {
      return token;
    }
  }

  return headers.get(API_KEY_HEADER);
}
