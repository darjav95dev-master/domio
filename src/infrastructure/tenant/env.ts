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

export const tenantEnv = {
  PUBLIC_TENANT_ID: validatePublicTenantId(process.env.PUBLIC_TENANT_ID),
};
