# Auditoría · Feature 004 · tenant-context-and-isolation

> Generado por `code-auditor` (modelo: claude-sonnet-4-6)
> Fecha: 2026-07-07 — rama auditada: main (commit 88fa562)
> Commits auditados: 88fa562 (implementación), 727e0bc (spec/plan/tasks)
> Archivos modificados: 21 archivos, +1448 líneas

---

## Resumen ejecutivo

La feature 004 establece el núcleo de seguridad multi-tenant del proyecto: TenantContext, TenantAwareRepository, tres contextos concretos (PublicContext, AuthenticatedContext, ApiKeyContext), middleware de resolución por host y suite de aislamiento. La implementación cubre los requisitos funcionales esenciales y los tests unitarios son sólidos y no triviales.

Sin embargo, la auditoría revela un hallazgo crítico (gap en el CI grep check que ya fue explotado por la feature 006), dos hallazgos mayores de diseño (filtros de contexto advisory y `UserRole` duplicado), y tres menores. El TDD no fue seguido: los 21 archivos de test e implementación aparecen en un único commit sin ciclo RED → GREEN → REFACTOR documentado.

| Severidad | Cantidad |
|-----------|----------|
| Críticos  | 1        |
| Mayores   | 4        |
| Menores   | 3        |

**Veredicto:** AMARILLO

---

## Hallazgos críticos

> Violan EXPLÍCITAMENTE constitution.md o architecture.md.
> Bloqueantes para el TFM si no se corrigen.

### C1 · CI grep check #2 no detecta `db.transaction()` fuera de repositorios

- **Archivo:** `.github/workflows/ci.yml` líneas 56-64 / SC-003 de la spec
- **Confianza:** alta
- **Regla violada:** architecture.md §9 ("Nunca escribir una query SQL fuera de un repositorio context-aware"); SC-003 ("No raw database queries exist outside `src/infrastructure/db/repositories/` or `src/infrastructure/tenant/`")
- **Descripción:** El CI check T030 implementado en esta feature solo detecta patrones `db.(select|insert|update|delete)` pero no `db.transaction()` ni `db.execute()`. Esto significa que cualquier servicio que llame directamente a `db.transaction()` — obteniendo así acceso completo a Drizzle con queries internas de `tx.select/insert/update` — pasa la comprobación sin obstáculos. Este gap fue explorado inmediatamente en la feature 006: `src/infrastructure/media/media.service.ts` llama a `this.database.transaction(async (tx) => { ... tx.insert/select/update/delete ... })` en cinco métodos, completamente fuera del patrón `TenantAwareRepository`. El CI no lo detecta.

- **Código actual (ci.yml líneas 56-64):**

  ```yaml
  - name: CI grep check #2 — no raw db queries outside repositories/tenant
    run: |
      matches=$(git ls-files '*.ts' \
        | grep -vE '^src/infrastructure/db/repositories/' \
        | grep -vE '^src/infrastructure/tenant/' \
        | while read -r file; do
          awk '{sub(/\/\/.*/,""); if ($0 ~ /db\.(select|insert|update|delete)/) \
            print FILENAME":"NR":"$0}' "$file"
        done)
      if [ -n "$matches" ]; then
        echo "Found raw db queries outside allowed paths:"
        echo "$matches"
        exit 1
      fi
  ```

- **Fix propuesto:**

  ```yaml
  - name: CI grep check #2 — no raw db queries outside repositories/tenant
    run: |
      matches=$(git ls-files '*.ts' \
        | grep -vE '^src/infrastructure/db/repositories/' \
        | grep -vE '^src/infrastructure/tenant/' \
        | while read -r file; do
          awk '{sub(/\/\/.*/,""); \
            if ($0 ~ /db\.(select|insert|update|delete|transaction|execute)/ || \
                $0 ~ /\.database\.(select|insert|update|delete|transaction|execute)/) \
              print FILENAME":"NR":"$0}' "$file"
        done)
      if [ -n "$matches" ]; then
        echo "Found raw db queries outside allowed paths:"
        echo "$matches"
        exit 1
      fi
  ```

- **Justificación del fix:** Añadir `transaction` y `execute` al patrón detectado, y extender la búsqueda a `\.database\.` (alias de `db` usado en MediaService). Con este fix el CI habría bloqueado `media.service.ts` de feature 006 en el PR, que es exactamente el comportamiento esperado según SC-003.

---

## Hallazgos mayores

> Mala práctica seria que no viola constitución pero compromete calidad o mantenibilidad a medio plazo.

### M1 · `UserRole` definido en dos lugares — viola "enums cerrados como fuente única"

- **Archivo:** `src/infrastructure/tenant/AuthenticatedContext.ts:7`
- **Confianza:** alta
- **Regla violada:** constitution.md §11.1 ("sets cerrados como fuente única")
- **Descripción:** `AuthenticatedContext.ts` exporta su propio `type UserRole = "ADMIN" | "OPERATOR" | "AGENT"`. Al mismo tiempo, `src/shared/constants/db-enums.ts` ya define `export const USER_ROLES = ["ADMIN", "OPERATOR", "AGENT"] as const` y `export type UserRole = (typeof USER_ROLES)[number]`. Son dos definiciones independientes con los mismos valores hoy, pero que pueden divergir. La propia `context-middleware.test.ts` ya importa `USER_ROLES` de `db-enums` para verificar el rol del mock — lo que demuestra que el equipo sabe cuál es la fuente canónica.

- **Código actual:**

  ```typescript
  // src/infrastructure/tenant/AuthenticatedContext.ts
  export type UserRole = "ADMIN" | "OPERATOR" | "AGENT"; // ← duplicado
  ```

- **Fix propuesto:**

  ```typescript
  // src/infrastructure/tenant/AuthenticatedContext.ts
  import { TenantContext, type Transaction } from "@/infrastructure/tenant/TenantContext";
  import type { UserRole } from "@/shared/constants/db-enums"; // ← única fuente
  
  export class AuthenticatedContext extends TenantContext {
    readonly type = "authenticated" as const;
    constructor(
      tenantId: string,
      public readonly userId: string,
      public readonly role: UserRole,
    ) {
      super(tenantId);
    }
    // ...resto igual
  }
  ```

- **Justificación del fix:** Un solo import elimina la duplicidad. Si en el futuro se añade el rol `VIEWER` (con migración + PR aprobado, como exige §11.1), la única edición está en `db-enums.ts` y `AuthenticatedContext` la recoge automáticamente.

---

### M2 · `resolveFilters()` es advisory — los filtros de ApiKeyContext no se aplican automáticamente

- **Archivo:** `src/infrastructure/tenant/TenantContext.ts:24` / `src/infrastructure/db/repositories/TenantAwareRepository.ts`
- **Confianza:** alta
- **Regla violada:** architecture.md §2.3 ("ApiKeyContext... enforces kind='portfolio' + status='PUBLISHED' on all catalog reads"); architecture.md §4.3 ("Filtros obligatorios aplicados en el ApiKeyContext — a nivel de repositorio"); FR-004
- **Descripción:** `TenantContext.resolveFilters()` está declarado como opcional (`resolveFilters?()`). Más importante: aunque implementado, ningún código en `TenantAwareRepository.withTransaction()` llama automáticamente a `resolveFilters()` ni aplica su resultado. Cada repositorio concreto tiene que llamar manualmente a `ctx.resolveFilters()` y aplicar los filtros al where-clause. Si un futuro `PromocionRepository.findAll()` hace `tx.select().from(promociones)` sin consultar `resolveFilters()`, el consumidor externo con ApiKeyContext verá captaciones externas y borradores — exactamente la violación que el sistema debe prevenir. El test "does not allow consumers to override the mandatory filters" en `api-key-context.test.ts` prueba un spread pattern que el consumidor debe adoptar conscientemente; no prueba enforcement automático.

- **Código actual:**

  ```typescript
  // TenantContext.ts
  resolveFilters?(): Record<string, unknown>; // opcional — no hay enforcement
  
  // TenantAwareRepository.ts
  protected withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.ctx.withTransaction(fn); // no aplica resolveFilters()
  }
  ```

- **Fix propuesto (mínimo viable — hacer `resolveFilters` abstract obligatorio):**

  ```typescript
  // TenantContext.ts — hacer obligatorio
  abstract resolveFilters(): Record<string, unknown>;
  
  // TenantAwareRepository.ts — exponer helper para que repos apliquen filtros
  protected getContextFilters(): Record<string, unknown> {
    return this.ctx.resolveFilters();
  }
  ```

  Los repositorios concretos usarían `getContextFilters()` y lo aplicarían a sus queries. Al ser abstract (no opcional), TypeScript impide implementar una subclase de TenantContext que olvide definirlos. La alternativa más robusta sería pasar los filtros como parámetro tipado a `withTransaction`, pero eso requeriría un cambio de firma más invasivo.

- **Justificación del fix:** Cambiar `resolveFilters?()` a `abstract resolveFilters()` convierte el olvido en error de compilación. El helper `getContextFilters()` en el repositorio base da el patrón correcto a implementaciones futuras.

---

### M3 · TDD no seguido — 21 archivos de test e implementación en un único commit

- **Archivo:** commit `88fa562`
- **Confianza:** alta
- **Regla violada:** constitution.md §3 ("TDD — obligatoria para lógica de negocio"; "NUNCA escribir implementación antes del test")
- **Descripción:** El commit `88fa562` introduce simultáneamente todos los archivos de implementación (`TenantContext.ts`, `AuthenticatedContext.ts`, etc.) y todos los tests (`tenant-context.test.ts`, `authenticated-context.test.ts`, etc.) — 1448 líneas en un solo commit. No existe ningún commit anterior con tests en rojo. Las tasks.md tienen todas las tareas marcadas como `[ ]` (sin completar), lo que indica que el flujo RED → GREEN → REFACTOR con commits separados no se ejecutó. Para lógica de dominio de seguridad multi-tenant — el núcleo del proyecto — la constitution exige TDD sin excepción.

- **Fix propuesto:** No hay fix de código; el fix es de proceso. Para features críticas (security layer, contexto de tenant), los commits deben seguir el patrón: (1) commit test en rojo, (2) commit implementación mínima en verde, (3) commit refactor si aplica. En el historial de git, un test sin implementación es evidencia suficiente de que se siguió TDD.

- **Justificación:** En el contexto del TFM, la trazabilidad del ciclo TDD en el historial de commits es parte de la evidencia metodológica. Un commit monolítico no la provee.

---

### M4 · `tasks.md` no actualizado — 32 tareas marcadas `[ ]` pese a implementación completa

- **Archivo:** `specs/004-tenant-context-and-isolation/tasks.md`
- **Confianza:** alta
- **Regla violada:** constitution.md §8 (commits convencionales y documentación del estado)
- **Descripción:** Todas las tareas T001–T032 permanecen con `[ ]`. La feature está completamente implementada y mergeada a main. El `tasks.md` actúa como artefacto de evidencia para el TFM: dejarlo en blanco hace que parezca que la feature no se ejecutó.

- **Fix propuesto:** Actualizar todas las tareas completadas a `[X]`. Ejemplo:

  ```markdown
  - [X] T001 Create directory structure: `src/infrastructure/tenant/`...
  - [X] T002 Add `PUBLIC_TENANT_ID` to `.env.example`...
  ```

- **Justificación:** El `tasks.md` es un documento de evidencia metodológica SDD; dejarlo sin actualizar invalida su función como trazabilidad.

---

## Hallazgos menores

> Mejoras de estilo, refactors pequeños, optimizaciones.

### m1 · Regex de T025 sin word boundary — falsos positivos potenciales

- **Archivo:** `tests/isolation/tenant-isolation.test.ts:180`
- **Confianza:** alta
- **Regla violada:** constitution.md §3 (calidad de tests)
- **Descripción:** El test T025 usa `/SET\s+/iu` para buscar usos de `SET` sin `LOCAL`. Esta regex coincide también con "RESET", "SUBSET", "OFFSET" y cualquier palabra que contenga "SET" seguida de espacio. Actualmente no hay falsos positivos en los directorios escaneados, pero la regex es frágil. Ejemplo confirmado:

  ```
  node -e "console.log(/SET\s+/iu.test('SUBSET of results'))"
  // → true  ← falso positivo
  ```

- **Fix propuesto:**

  ```typescript
  // Cambiar en tenant-isolation.test.ts:180
  // ANTES:
  if (/SET\s+/iu.test(code) && !/SET\s+LOCAL/iu.test(code)) {
  // DESPUÉS (con word boundary):
  if (/\bSET\s+/iu.test(code) && !/\bSET\s+LOCAL\b/iu.test(code)) {
  ```

---

### m2 · CI grep check #1 exime TODO `src/infrastructure/` en lugar de solo los subdirectorios necesarios

- **Archivo:** `.github/workflows/ci.yml:46`
- **Confianza:** media
- **Regla violada:** architecture.md §9 / SC-002
- **Descripción:** La exención del check de bare `SET ` cubre `^src/infrastructure/` entero. Esto significa que cualquier nuevo servicio en `src/infrastructure/email/`, `src/infrastructure/slug/`, etc. puede escribir `SET app.current_tenant_id` (sin `LOCAL`) sin que el CI lo detecte. La exención debería ser quirúrgica: solo `src/infrastructure/tenant/` y `src/infrastructure/db/repositories/` tienen motivos legítimos para contener `SET LOCAL`.

- **Fix propuesto:**

  ```yaml
  # ANTES:
  git ls-files '*.ts' | grep -v '^src/infrastructure/' | ...
  
  # DESPUÉS:
  git ls-files '*.ts' \
    | grep -vE '^src/infrastructure/tenant/' \
    | grep -vE '^src/infrastructure/db/repositories/' \
    | ...
  ```

---

### m3 · `public-context.test.ts` accede a `this.ctx` directamente en lugar de usar `this.withTransaction()`

- **Archivo:** `tests/isolation/public-context.test.ts:14-21`
- **Confianza:** media
- **Regla violada:** constitution.md §2 (diseño de abstracciones)
- **Descripción:** El `TestPromocionRepository` del test de integración llama a `this.ctx.withTransaction(...)` directamente, bypaseando el método protegido `withTransaction()` definido en `TenantAwareRepository`. Si en el futuro `TenantAwareRepository.withTransaction()` se enriquece (p.ej. aplicando automáticamente `resolveFilters()` como sugiere el fix del hallazgo M2), este test no ejercitaría esa lógica.

- **Fix propuesto:**

  ```typescript
  class TestPromocionRepository extends TenantAwareRepository {
    async findPublished() {
      // ANTES: return this.ctx.withTransaction(async (tx) => { ... });
      // DESPUÉS: usar el método protegido del repositorio base
      return this.withTransaction(async (tx) => {
        const filters = this.getContextFilters(); // con fix de M2
        const statusFilter = filters.status;
        // ...
      });
    }
  }
  ```

---

## Coherencia con features previas

Esta feature no importa de ninguna otra feature (no hay imports cruzados entre features). Consume artefactos de F002 (tablas con `tenant_id`, RLS activa) correctamente, sin modificar el schema.

La feature introduce `src/shared/constants/tenant-hosts.ts` con cuatro constantes globales. Es el único archivo en `shared/` creado por esta feature y está correctamente ubicado en `shared/` (es razonablemente consumible por middleware, tests, y futuros route handlers). No hay duplicidad con lo introducido por F001, F002 o F003.

El hallazgo M1 (`UserRole` duplicado) es una colisión directa con `db-enums.ts` que fue creado en F002. La resolución es importar desde F002 en lugar de redeclarar.

El hallazgo C1 (gap en el CI check) es técnicamente originado aquí (F004 introdujo el check) aunque su primera manifestación concreta ocurre en F006. Ambas features comparten la responsabilidad: F004 por el check incompleto y F006 por la implementación que lo eludió.

---

## Veredicto de tests

Confianza en la suite: **MEDIA-ALTA**.

**Puntos fuertes:** Los tests unitarios de `TenantContext`, `AuthenticatedContext`, `PublicContext`, `ApiKeyContext` y `context-middleware` son sustanciales y no triviales. Verifican el ordering de las dos llamadas `SET LOCAL` en `AuthenticatedContext`, el rechazo en producción del mock de sesión (`assertDevelopmentOnly`), el error 401 sin API key, y la correcta resolución por host. La suite de aislamiento en `tests/isolation/` prueba concurrencia real y visibilidad cruzada entre tenants. El test T025 verifica la ausencia de bare `SET` en los archivos de repositorio.

**Puntos débiles:**
1. Todos los tests se introdujeron en el mismo commit que la implementación, sin evidencia de ciclo RED → GREEN. Confianza en TDD: BAJA.
2. El test "does not allow consumers to override the mandatory filters" (api-key-context.test.ts:43) prueba un spread pattern que el caller debe adoptar, no un enforcement automático. Asume que la protección funcionará, pero no la garantiza.
3. El test de integración `public-context.test.ts` es la única verificación de que `resolveFilters()` se aplica realmente en una query — y lo hace desde un `TestPromocionRepository` ad-hoc que no usa el método protegido de `TenantAwareRepository`.

Recomendación: los tests son suficientes como documentación del contrato, pero el ciclo TDD no fue documentado en git. Para el TFM, añadir un commit posterior con un test de regresión (un repositorio que ignora `resolveFilters()` para demostrar qué pasaría sin el enforcement) añadiría evidencia académica.

---

## Métricas

- Archivos modificados: 21
- Líneas añadidas / borradas: +1448 / 0
- Cobertura declarada en commit: 100% capa tenant, 92.4% global (no verificada independientemente en esta auditoría)
- Complejidad cognitiva máxima encontrada: estimada <5 (funciones cortas, sin ramas profundas)
- Tasks completadas según tasks.md: 0/32 (sin actualizar)

---

## Checklist de spec compliance

| Requisito | Estado | Nota |
|-----------|--------|------|
| FR-001 TenantContext.withTransaction | CUMPLE | SET LOCAL verificado |
| FR-002 PublicContext + filtro PUBLISHED | CUMPLE | |
| FR-003 AuthenticatedContext + tenant_id + user_id | CUMPLE | |
| FR-004 ApiKeyContext + filtros portfolio/PUBLISHED | PARCIAL | Filtros advisory (M2) |
| FR-005 TenantAwareRepository | CUMPLE | |
| FR-006 No raw queries fuera de repos | PARCIAL | CI check incompleto (C1) |
| FR-007 Middleware resolución por host | CUMPLE | Mock session pending F005 |
| FR-008 Propagación por inyección | CUMPLE | AsyncLocalStorage exportado |
| FR-009 Suite de aislamiento | CUMPLE | |
| FR-010 Suite bloqueante en CI | CUMPLE | pnpm test:run la incluye |
| SC-001 Aislamiento entre dos tenants | CUMPLE | |
| SC-002 No bare SET fuera de TenantAwareRepository | PARCIAL | CI exención demasiado amplia (m2) |
| SC-003 No raw queries fuera de repos | PARCIAL | db.transaction() no detectado (C1) |
| SC-004 Contexts resuelven y aplican filtros | PARCIAL | Filtros no aplicados auto. (M2) |
| SC-005 Cobertura ≥80% capa tenant | CUMPLE | Declarado 100% |
| SC-006 Resolución una vez por request | CUMPLE | |

---

## Recomendación

ACEPTAR CON REPARACIONES RECOMENDADAS — el mecanismo central (SET LOCAL en transacción, tres contextos, aislamiento entre tenants) está correctamente implementado y sus tests son robustos.

Sin embargo, el hallazgo C1 (gap en el CI check) es urgente porque ya ha permitido que feature 006 eluda la regla de repositorios context-aware. Aplicar el fix a `.github/workflows/ci.yml` es una acción de una línea de impacto alto.

Los hallazgos M1 (UserRole duplicado) y M2 (resolveFilters advisory) son correcciones menores de diseño convenientes antes de que los repositorios concretos (PromocionRepository, LeadRepository en F011/F014) se construyan sobre este scaffold — si se dejan para después, el coste de corrección crece con cada repositorio nuevo.
