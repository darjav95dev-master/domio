# Research: backoffice-shell

**Feature**: 010-backoffice-shell
**Date**: 2026-07-08

## R-1: Auth.js v5 en Next.js 15 App Router

**Decisión**: Usar `next-auth@5` (Auth.js v5) con credentials provider y JWT strategy. La sesión se almacena en el JWT con claims `tenant_id`, `user_id`, `role`, `name`.

**Racional**: Es el stack declarado en architecture.md §1 y §4.2. Auth.js v5 tiene soporte nativo para App Router con `auth()` server-side y `useSession()` client-side.

**Alternativas consideradas**: Sesión custom con cookies firmadas — rechazada porque Auth.js ya provee CSRF, renovación deslizante y protección de sesión out-of-the-box.

## R-2: Middleware de protección para rutas (auth)

**Decisión**: Crear `middleware.ts` en la raíz que use `auth()` de Auth.js para verificar sesión. Si no hay sesión y la ruta es `/panel/*`, redirigir a `/panel/login`. Inyectar `X-Robots-Tag: noindex, nofollow` en todas las respuestas bajo `(auth)/`.

**Racional**: El middleware de Next.js es el punto único de interceptación de requests. Permite tanto auth guard como inyección de headers.

**Alternativas consideradas**: Auth guard en cada layout — rechazada porque es frágil (se puede olvidar en una ruta nueva) y no permite inyectar headers de forma centralizada.

## R-3: Badge de leads no leídos — polling vs SSE vs WebSocket

**Decisión**: Polling cada 30 segundos con `useEffect` + `setInterval` en un client component. El endpoint `GET /api/internal/leads/unread-count` devuelve `{ count: number }`.

**Racional**: 30s es suficiente para la UX del backoffice. SSE/WebSocket añaden complejidad innecesaria para un valor que cambia con baja frecuencia. El polling es simple, robusto y fácil de testear.

**Alternativas consideradas**: Server-Sent Events — rechazada por complejidad desproporcionada. WebSocket — rechazada porque requiere infraestructura adicional no declarada en el stack.

## R-4: Sidebar responsivo — drawer en móvil

**Decisión**: En desktop (≥ 768px), sidebar fijo 240px. En móvil (< 768px), sidebar colapsado con botón hamburguesa que abre un drawer overlay. El drawer se cierra al navegar o al hacer clic fuera.

**Racional**: design.md §13.5 describe el sidebar con comportamiento responsivo. El patrón drawer es estándar y accesible con `aria-modal` y focus trap.

**Alternativas consideradas**: Sidebar siempre colapsado con iconos — rechazada porque pierde la legibilidad de las etiquetas. Sidebar que se oculta completamente — rechazada porque el usuario pierde la navegación.

## R-5: Navegación condicional por rol

**Decisión**: Definir un array de `NavItem` con `allowedRoles` en `src/features/backoffice/constants/nav-items.ts`. El sidebar filtra los items según el `role` de la sesión. Los roles son ADMIN, OPERATOR, AGENT (de `db-enums.ts`).

**Racional**: Centralizar la configuración de navegación en una constante hace que añadir/quitar secciones sea trivial y testeable.

**Alternativas consideradas**: Lógica de filtrado dispersa en el componente — rechazada porque viola §11.1 (constantes centralizadas) y es difícil de testear.

## R-6: Dashboard — datos y consultas

**Decisión**: El dashboard consulta:
1. **Conteo de leads no leídos**: mismo endpoint que el badge (`GET /api/internal/leads/unread-count`).
2. **Últimas 5 promociones editadas**: query a `promociones` filtrando por `updated_by = current_user_id`, ordenadas por `updated_at DESC`, limit 5.
3. **Enlaces rápidos y atajos**: datos estáticos desde la constante de nav items.

**Racional**: El dashboard es una landing operativa, no un tablero de BI (regla product.md §7). Las consultas son simples y no requieren agregaciones complejas.

**Alternativas consideradas**: Incluir métricas de conversión — rechazada porque viola la regla de producto. Gráficos de actividad — rechazada por la misma razón.

## R-7: robots.ts y X-Robots-Tag

**Decisión**: 
- `app/robots.ts` exporta una configuración que permite `/` y bloquea `/panel` y `/api`.
- El middleware inyecta `X-Robots-Tag: noindex, nofollow` en todas las respuestas bajo `(auth)/`.

**Racional**: Doble protección: robots.txt para bots que lo respetan, X-Robots-Tag para los que no. Es la práctica recomendada por Google.

**Alternativas consideradas**: Solo robots.txt — rechazada porque no todos los bots lo respetan. Solo X-Robots-Tag — rechazada porque robots.txt es el estándar para bloquear rastreo.
