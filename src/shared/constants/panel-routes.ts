/**
 * Rutas de /panel accesibles sin sesión.
 *
 * Hay DOS guards que deben coincidir: el middleware (middleware.ts, primera
 * línea) y el layout del panel (app/(auth)/panel/layout.tsx, defensa en
 * profundidad con getServerSession). Tenerlas aquí evita que se añada una ruta
 * pública a uno y no al otro — que deja la página inalcanzable en silencio.
 */
export const PUBLIC_PANEL_ROUTES = [
  "/panel/login",
  "/panel/setup-password",
] as const;

export function isPublicPanelRoute(pathname: string): boolean {
  return PUBLIC_PANEL_ROUTES.some((route) => pathname.includes(route));
}
