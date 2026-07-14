import { NextResponse } from "next/server";
import { isProduction } from "@/shared/config/app-env";

export const dynamic = "force-dynamic";

/**
 * Lanza un error a propósito para verificar que Sentry captura los errores del
 * servidor (§2.3 de ENTREGA-TFM: evento en el dashboard con environment y release).
 *
 * En producción devuelve 404, así que no hace falta acordarse de borrarla antes
 * de desplegar: no es alcanzable. El plan original era crearla, usarla y
 * borrarla a mano — un endpoint que tumba el servidor a propósito no debe
 * depender de que alguien se acuerde.
 */
export function GET() {
  if (isProduction) {
    return new NextResponse(null, { status: 404 });
  }

  throw new Error(
    `Sentry healthcheck · error de prueba lanzado a propósito · ${new Date().toISOString()}`,
  );
}
