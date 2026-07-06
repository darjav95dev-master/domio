import { AsyncLocalStorage } from "node:async_hooks";
import {
  PUBLIC_HOST,
  AUTH_HOST,
  API_V1_PREFIX,
  API_KEY_HEADER,
} from "@/shared/constants/tenant-hosts";
import { tenantEnv } from "./env";
import { TenantContext } from "./TenantContext";
import { PublicContext } from "./PublicContext";
import { AuthenticatedContext } from "./AuthenticatedContext";
import { ApiKeyContext } from "./ApiKeyContext";

const MOCK_AUTH_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2";
const MOCK_AUTH_ROLE = "ADMIN" as const;
const MOCK_API_KEY_ID = "apikey-mock-0000-0000-000000000000";

export interface ContextResolutionInput {
  readonly host: string;
  readonly pathname: string;
  readonly headers: {
    get(name: string): string | null;
  };
}

export class ContextResolutionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ContextResolutionError";
  }
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}

export function assertDevelopmentOnly(feature: string): void {
  if (process.env.NODE_ENV !== "development") {
    throw new ContextResolutionError(
      `${feature} is only available in development`,
      500,
    );
  }
}

function normalizeHost(host: string): string {
  return (host.split(":")[0] ?? host).toLowerCase();
}

const BEARER_PREFIX = "Bearer ";

function extractApiKey(
  headers: ContextResolutionInput["headers"],
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

export function resolveTenantContext(
  input: ContextResolutionInput,
): TenantContext {
  if (input.pathname.startsWith(API_V1_PREFIX)) {
    const apiKey = extractApiKey(input.headers);

    if (!apiKey) {
      throw new ContextResolutionError("Missing or invalid API key", 401);
    }

    // eslint-disable-next-line sonarjs/todo-tag -- intentional tracked TODO for F016
    // TODO(F016): Validate API key against api_keys table
    assertDevelopmentOnly("ApiKeyContext mock key lookup");

    return new ApiKeyContext(tenantEnv.PUBLIC_TENANT_ID, MOCK_API_KEY_ID);
  }

  const host = normalizeHost(input.host);

  if (host === AUTH_HOST) {
    const session = input.headers.get("x-mock-session");

    if (!session) {
      throw new ContextResolutionError(
        `Missing or invalid session for ${AUTH_HOST}`,
        401,
      );
    }

    // eslint-disable-next-line sonarjs/todo-tag -- intentional tracked TODO for F005
    // TODO(F005): Replace x-mock-session with real Auth.js v5 session validation
    assertDevelopmentOnly("AuthenticatedContext mock session");

    return new AuthenticatedContext(
      tenantEnv.PUBLIC_TENANT_ID,
      MOCK_AUTH_USER_ID,
      MOCK_AUTH_ROLE,
    );
  }

  if (host === PUBLIC_HOST) {
    return new PublicContext();
  }

  throw new ContextResolutionError(
    `Unable to resolve tenant context for host: ${host}`,
    400,
  );
}
