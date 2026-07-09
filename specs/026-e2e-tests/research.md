# Research: E2E Tests

**Feature**: 026-e2e-tests | **Date**: 2026-07-09

## R-001: DB Reset Strategy for E2E Tests

**Decision**: Usar TRUNCATE en cascada sobre tablas de dominio + re-seed parcial antes de cada suite (no antes de cada test individual).

**Rationale**: 
- TRUNCATE CASCADE es más rápido que DELETE row-by-row y resetea secuencias.
- Re-seedear antes de cada test individual sería demasiado lento (el seed completo inserta 8 promociones, tipologías, unidades, bloques, leads, etc.).
- Antes de cada SUITE: truncar tablas mutables (leads, lead_notes, lead_history, lead_read_marks, consent_records, arsop_requests, promociones, tipologias, unidades, promocion_content_blocks, media_assets, content_blocks, contact_config, api_keys) y re-insertar datos seed base.
- Excepción: tabla `tenants` y `users` NO se truncan (son prerrequisitos para login).

**Alternatives considered**:
- Reset completo (DROP + CREATE + seed): demasiado lento, requiere migraciones.
- Snapshot/restore de BD: requiere permisos especiales en Neon, no portable.
- Transaction wrapping por test: no funciona con SSR de Next.js (la request sale de la transacción).

## R-002: API Key Creation for API Consumer Tests

**Decision**: Crear API key dentro del test de administrador (Journey 5) o en un `beforeAll` del spec de consumidor API, usando el endpoint interno de gestión de API keys.

**Rationale**:
- El seed no incluye API keys (por seguridad — las keys activas no deberían persistir en seed).
- El test de consumidor API necesita una key válida. Dos opciones:
  1. Crear la key en el `beforeAll` del spec via server action o API interna.
  2. Crear la key como parte del Journey 5 (admin) y pasarla al Journey 4.
- Opción 1 es más limpia: cada spec es independiente. Se crea la key via la acción de servidor `createApiKey` directamente desde el test (importando la acción), o via una ruta interna.

**Alternatives considered**:
- Añadir API key al seed: comprometería la seguridad del seed (keys activas en repo).
- Hardcoded test key: viola principio de no hardcoded secrets.

## R-003: Auth Helper Pattern

**Decision**: Crear un helper `auth.ts` que encapsula el flujo de login (navegar a /panel/login, fill email, fill password, click submit, wait for redirect). Reutilizable desde todos los specs que necesiten autenticación.

**Rationale**:
- 4 de los 5 journeys necesitan login (todos excepto el visitante público).
- Centralizar el flujo evita duplicación y facilita mantenimiento si cambia el formulario de login.
- El helper usa los Page Objects de LoginPage para las acciones, manteniendo coherencia con POM.

**Alternatives considered**:
- Storage state de Playwright (guardar cookies/session): más rápido pero más frágil si cambia la auth.
- Cookie injection directa: bypassa el formulario, no verifica que el login funciona.

## R-004: Selector Strategy

**Decision**: Jerarquía estricta: `getByRole` > `getByTestId` (con `data-testid`) > `getByText`. Añadir `data-testid` solo donde `getByRole` no es suficiente (ej: cards de catálogo sin rol semántico claro, badges de conteo).

**Rationale**:
- Constitution §3 exige selectores accesibles.
- `getByRole` es el más robusto y refleja accesibilidad real.
- `data-testid` es el fallback para elementos sin rol semántico (componentes visuales puros).
- `getByText` solo para confirmaciones/mensajes donde el texto es el identificador natural.

**Alternatives considered**:
- CSS selectors: frágiles, se rompen con cambios de diseño.
- XPath: aún más frágil y no accesible.

## R-005: Test Isolation Between Suites

**Decision**: Cada spec file es independiente. No se comparten estado entre specs. El fixture de DB reset garantiza que cada suite empieza con datos conocidos.

**Rationale**:
- Playwright ejecuta specs secuencialmente con `workers: 1`.
- Cada spec puede modificar la BD (crear leads, editar promociones, etc.).
- Sin reset entre specs, los datos modificados por un spec afectarían al siguiente.
- El reset se hace en `beforeAll` de cada spec (no `beforeEach` — sería demasiado lento).

**Alternatives considered**:
- `beforeEach` reset: garantiza aislamiento total pero añade ~2-3 segundos por test.
- Sin reset: los tests serían dependientes del orden de ejecución — anti-pattern.
