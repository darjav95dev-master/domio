import { S3Client } from "@aws-sdk/client-s3";
import { mediaEnv } from "./env";

let s3ClientInstance: S3Client | undefined;

export const r2Client: S3Client = new Proxy(
  {} as S3Client,
  {
    get(_target, prop: string | symbol): unknown {
      if (!s3ClientInstance) {
        s3ClientInstance = new S3Client({
          endpoint: `https://${mediaEnv.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          region: "auto",
          credentials: {
            accessKeyId: mediaEnv.R2_ACCESS_KEY_ID,
            secretAccessKey: mediaEnv.R2_SECRET_ACCESS_KEY,
          },
        });
      }

      return s3ClientInstance[prop as keyof S3Client];
    },
  },
);
