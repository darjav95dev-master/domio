# Research: Contract Tests

**Feature**: 027-contract-tests | **Date**: 2026-07-09

## R-001: Snapshot Strategy for Schema Divergence Detection

**Decision**: Usar serialización JSON de los schemas zod como snapshots, almacenados en `tests/contract/v1/snapshots/`. El test de no-divergencia compara el schema actual (serializado) contra el snapshot guardado. Si hay diferencias, el test falla.

**Rationale**: 
- JSON es legible, diff-friendly en git, y portable.
- La serialización de zod a JSON preserva la estructura completa (tipos, optional/required, nested schemas).
- Comparar JSON serializado detecta cualquier cambio: campos añadidos, eliminados, tipos cambiados, optional/required flips.
- `--update` flag de Vitest permite actualizar snapshots fácilmente.

**Alternatives considered**:
- Hash del schema: no permite ver qué cambió, solo que cambió.
- Snapshot de TypeScript AST: demasiado complejo, frágil ante refactors internos.
- Comparación structural con librería tipo `deep-equal`: redundante, JSON.stringify + deep comparison es suficiente.

## R-002: OpenAPI Generation Library

**Decision**: Usar `@asteasolutions/zod-to-openapi` para generar el spec OpenAPI 3.0 desde schemas zod.

**Rationale**:
- Librería madura y mantenida activamente (última versión: 2024).
- Soporta zod 3.x completo (incluyendo `.optional()`, `.nullable()`, `.array()`, `.object()`, `.enum()`).
- Genera OpenAPI 3.0 válido y verificable.
- Permite extender con metadata (descripciones, ejemplos, tags).
- Integración sencilla con Next.js route handlers.

**Alternatives considered**:
- `zod-to-openapi` (otro paquete): menos maduro, menos stars en GitHub.
- Generación manual: demasiado trabajo, propenso a errores de sincronización.
- `tsoa`: requiere decorators, no compatible con zod nativo.

## R-003: Snapshot Update Mechanism

**Decision**: El test de no-divergencia usa `expect().toMatchSnapshot()` de Vitest con archivos JSON en `tests/contract/v1/snapshots/`. El flag `--update` de Vitest actualiza los snapshots automáticamente.

**Rationale**:
- Vitest ya tiene soporte nativo para snapshots (heredado de Jest).
- `toMatchSnapshot()` compara deep equality y genera diffs legibles.
- Los snapshots se guardan como archivos JSON (no .snap binarios), lo que permite review en PRs.
- El flag `--update` es estándar en Vitest/Jest, conocido por desarrolladores.

**Alternatives considered**:
- Script custom de update: reinventar la rueda, menos integración con CI.
- Snapshots inline en el test: menos legible, más difícil de review.

## R-004: Consumer Mirror Test Pattern

**Decision**: Implementar tests que simulan el comportamiento del consumidor externo: hacen request real al endpoint (con mock de auth/API key), verifican status code, headers, y que el body valida contra el schema zod.

**Rationale**:
- Los tests de schema puro no verifican que el endpoint real usa ese schema.
- Los consumer mirror tests capturan bugs de integración: endpoint que retorna 500, que no aplica rate limiting, que no serializa correctamente.
- Simular el consumidor externo es el patrón recomendado en contract testing (Pact, Spring Cloud Contract).

**Alternatives considered**:
- Tests de integración completos (con BD real): demasiado lentos para contract tests.
- Mocks del endpoint: no verifican el comportamiento real.

## R-005: OpenAPI Endpoint Authentication

**Decision**: El endpoint `/api/internal/docs` requiere sesión válida de backoffice (admin u operador). Se verifica con `getServerSession()` de Auth.js v5.

**Rationale**:
- La API docs no debe ser pública (información interna del contrato).
- `getServerSession()` es el patrón estándar en el proyecto para proteger rutas internas.
- Admin y operador tienen acceso a todas las rutas del backoffice, por lo tanto también a las docs.
- No se requiere un rol específico (cualquier usuario autenticado del backoffice puede ver las docs).

**Alternatives considered**:
- Sin autenticación: riesgo de exposición del contrato interno.
- API key en vez de sesión: inconsistente con el resto de rutas internas.
- Rol específico (solo ADMIN): innecesariamente restrictivo, los operadores también necesitan conocer el contrato.
