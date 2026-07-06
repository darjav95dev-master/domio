import { TenantContext } from "./TenantContext";

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
  ) {
    super(tenantId);
  }

  resolveFilters(): Record<string, unknown> {
    return { ...API_KEY_CATALOG_FILTERS };
  }
}
