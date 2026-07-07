const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validatePublicTenantId(value: string | undefined): string {
  if (!value) {
    throw new Error("PUBLIC_TENANT_ID environment variable is not defined");
  }

  if (!UUID_REGEX.test(value)) {
    throw new Error(
      `PUBLIC_TENANT_ID environment variable must be a valid UUID, got: ${value}`,
    );
  }

  return value.toLowerCase();
}

interface TenantEnvRecord {
  readonly PUBLIC_TENANT_ID: string;
}

let validatedTenantRecord: TenantEnvRecord | null = null;

function ensureTenantValidated(): TenantEnvRecord {
  if (validatedTenantRecord) {
    return validatedTenantRecord;
  }

  validatedTenantRecord = Object.freeze({
    PUBLIC_TENANT_ID: validatePublicTenantId(process.env.PUBLIC_TENANT_ID),
  });

  return validatedTenantRecord;
}

export const tenantEnv: TenantEnvRecord = new Proxy(
  {} as TenantEnvRecord,
  {
    get(_target, prop: string | symbol): string | undefined {
      const record = ensureTenantValidated();

      if (prop in record) {
        return record[prop as keyof TenantEnvRecord];
      }

      return undefined;
    },
  },
);
