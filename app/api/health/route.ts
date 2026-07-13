export async function GET(): Promise<Response> {
  // env se expone para verificar en un deploy que el servidor arrancó con la
  // config correcta (ENVIRONMENTS.md). El pipeline de CD comprueba este valor.
  return Response.json(
    { status: "ok", env: process.env.APP_ENV ?? "unknown" },
    { status: 200 },
  );
}
