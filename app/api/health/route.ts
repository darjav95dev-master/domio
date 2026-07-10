import { APP_ENV } from "@/shared/config/app-env";

export async function GET(): Promise<Response> {
  // `env` lets ops confirm which configuration a deployed server actually
  // loaded (local vs development vs production).
  return Response.json({ status: "ok", env: APP_ENV }, { status: 200 });
}
