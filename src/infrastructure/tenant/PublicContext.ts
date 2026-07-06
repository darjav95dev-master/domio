import { TenantContext } from "./TenantContext";
import { tenantEnv } from "./env";

export class PublicContext extends TenantContext {
  readonly type = "public" as const;
  readonly userId = null;
  readonly role = null;

  constructor() {
    super(tenantEnv.PUBLIC_TENANT_ID);
  }

  resolveFilters(): { status: "PUBLISHED" } {
    return { status: "PUBLISHED" };
  }
}
