import { TenantContext } from "./TenantContext";
import { DEFAULT_API_LIMIT_PER_MIN } from "@/shared/constants/rate-limits";

const API_KEY_CATALOG_FILTERS = {
  kind: "portfolio",
  status: "PUBLISHED",
} as const;

export class ApiKeyContext extends TenantContext {
  readonly type = "apikey" as const;
  readonly userId = null;
  readonly role = null;

  constructor(
    tenantId: string,
    public readonly apiKeyId: string,
    public readonly rateLimitPerMin: number = DEFAULT_API_LIMIT_PER_MIN,
  ) {
    super(tenantId);
  }

  resolveFilters(): Record<string, unknown> {
    return { ...API_KEY_CATALOG_FILTERS };
  }
}
