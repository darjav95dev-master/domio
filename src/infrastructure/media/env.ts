function validateRequiredString(
  value: string | undefined,
  name: string,
): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} environment variable is not defined`);
  }

  return value;
}

interface MediaEnvRecord {
  readonly R2_ACCOUNT_ID: string;
  readonly R2_ACCESS_KEY_ID: string;
  readonly R2_SECRET_ACCESS_KEY: string;
  readonly R2_BUCKET: string;
  readonly R2_PUBLIC_URL: string;
}

let validatedRecord: MediaEnvRecord | null = null;

function ensureValidated(): MediaEnvRecord {
  if (validatedRecord) {
    return validatedRecord;
  }

  validatedRecord = Object.freeze({
    R2_ACCOUNT_ID: validateRequiredString(
      process.env.R2_ACCOUNT_ID,
      "R2_ACCOUNT_ID",
    ),
    R2_ACCESS_KEY_ID: validateRequiredString(
      process.env.R2_ACCESS_KEY_ID,
      "R2_ACCESS_KEY_ID",
    ),
    R2_SECRET_ACCESS_KEY: validateRequiredString(
      process.env.R2_SECRET_ACCESS_KEY,
      "R2_SECRET_ACCESS_KEY",
    ),
    R2_BUCKET: validateRequiredString(process.env.R2_BUCKET, "R2_BUCKET"),
    R2_PUBLIC_URL: validateRequiredString(
      process.env.R2_PUBLIC_URL,
      "R2_PUBLIC_URL",
    ),
  });

  return validatedRecord;
}

export const mediaEnv: MediaEnvRecord = new Proxy(
  {} as MediaEnvRecord,
  {
    get(_target, prop: string | symbol): string | undefined {
      const record = ensureValidated();

      if (prop in record) {
        return record[prop as keyof MediaEnvRecord];
      }

      return undefined;
    },
  },
);
