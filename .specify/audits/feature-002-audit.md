# Auditoría · Feature 002 · db-schema-and-migrations

> Generado por `code-auditor` con Claude Opus 4.8
> Fecha: 2026-07-07 (auditoría post-merge)
> Commits auditados: `9778e4a..106aa93` (merge `cd2e1b6`)
> Archivos modificados: 39 (+5572 / -69)

---

## Resumen ejecutivo

La feature crea las 19 tablas del modelo, RLS por tabla, PostGIS, índices compuestos tenant-first y la migración generada. El SQL de migración es fiel a los schemas Drizzle y los enums coinciden con las constantes cerradas de `db-enums.ts` y con `product.md`/`architecture.md`. La cobertura estructural es sólida. Sin embargo, hay **dos fallos críticos de aislamiento/inmutabilidad** que rompen invariantes duras del proyecto (`constitution §11.4`, `architecture §2.2/§7.10`), y el conjunto de tests que debería probarlos es **saltable en silencio** (`describe.skipIf`) y **fue escrito después** de la implementación. La feature no es defendible en su estado actual sin reparar C1–C2 y M1–M2.

| Severidad | Cantidad |
|-----------|----------|
| Críticos  | 2        |
| Mayores   | 6        |
| Menores   | 6        |

**Veredicto:** 🔴 ROJO

---

## Hallazgos críticos

### C1 · Las tablas de histórico usan política RLS `FOR ALL` — permiten UPDATE y DELETE

- **Archivo:** `src/infrastructure/db/schema/rls.ts:6-13`, aplicada en `promocion-history.ts:38`, `lead-history.ts:38`, `consent-records.ts:29`; SQL `migrations/0000_round_captain_marvel.sql:343,347,348`
- **Regla violada:** `constitution.md §11.4` (historiales inmutables por policy), `architecture.md §7.10` y `§9` ("Nunca ejecutar UPDATE o DELETE sobre lead_history, promocion_history, consent_records")
- **Confianza:** alta
- **Descripción:** `tenantIsolationPolicy` genera una única policy `AS PERMISSIVE FOR ALL TO public`. `FOR ALL` cubre SELECT/INSERT/UPDATE/DELETE, de modo que cualquier fila del propio tenant puede modificarse o borrarse. Las tablas de auditoría deben ser **append-only por policy**: solo INSERT y SELECT, deliberadamente sin UPDATE ni DELETE. Tal como está, la inmutabilidad queda a merced de la convención, exactamente lo que la constitución prohíbe.
- **Código actual (SQL generado):**

  ```sql
  CREATE POLICY "lead_history_isolation" ON "lead_history"
    AS PERMISSIVE FOR ALL TO public
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
  ```

- **Fix propuesto:** introducir un helper `appendOnlyTenantPolicies(tableName)` en `rls.ts` que emita dos policies separadas y ninguna de UPDATE/DELETE, y usarlo en las tres tablas append-only:

  ```typescript
  export function appendOnlyTenantPolicies(tableName: string) {
    return [
      pgPolicy(`${tableName}_select`, {
        as: "permissive", for: "select", to: "public",
        using: tenantIsolationExpression,
      }),
      pgPolicy(`${tableName}_insert`, {
        as: "permissive", for: "insert", to: "public",
        withCheck: tenantIsolationExpression,
      }),
      // Deliberadamente sin policy de UPDATE ni DELETE.
    ];
  }
  ```

- **Justificación:** con RLS habilitado, una operación sin policy que la cubra queda denegada por defecto. Al no declarar UPDATE/DELETE, el motor rechaza toda mutación del histórico incluso desde el rol de aplicación, cumpliendo `§11.4`.
- **Nota sobre `arsop_requests`:** esta tabla NO debe ser append-only estricta: sus columnas `processed_by`/`processed_at`/`result_asset_id` se rellenan tras crear la solicitud, lo que exige UPDATE. Aquí hay una contradicción en las fuentes (`architecture §9` la lista como inmutable pero su propio diseño en `§6.3` requiere update posterior). Requiere decisión humana: mantener `FOR ALL` en `arsop_requests` es probablemente lo correcto; el fix append-only aplica solo a `lead_history`, `promocion_history` y `consent_records`.

### C2 · RLS habilitado sin `FORCE ROW LEVEL SECURITY` ni rol de aplicación no-propietario → aislamiento evadible en producción

- **Archivo:** `migrations/0000_round_captain_marvel.sql` (todos los `ENABLE ROW LEVEL SECURITY`, p.ej. `:64,156`) y `client.ts:21-24`
- **Regla violada:** `architecture.md §2.1` (RLS activado que filtra por tenant) y `§2.2` (única forma correcta de usar RLS); `product.md §6.2`
- **Confianza:** media
- **Descripción:** en PostgreSQL el **propietario** de la tabla evita las policies RLS salvo que se declare `ALTER TABLE ... FORCE ROW LEVEL SECURITY`. La migración solo hace `ENABLE`, y `client.ts` abre el `Pool` con `DATABASE_URL` sin distinguir un rol de aplicación de menor privilegio. En Neon el rol por defecto (`*_owner`) es propietario de las tablas creadas por la migración; si la app se conecta con ese rol —el patrón por defecto— **todas las policies se ignoran** y el aislamiento multi-tenant es nulo. Las policies existen pero no garantizan nada bajo el rol de despliegue por defecto.
- **Fix propuesto:** (a) añadir `FORCE ROW LEVEL SECURITY` a cada tabla de dominio en una migración de seguimiento, o mejor (b) crear un rol de aplicación dedicado sin `BYPASSRLS` y sin propiedad de las tablas, y usarlo en `DATABASE_URL` de runtime, reservando el rol propietario solo para migraciones. Documentar la decisión en `architecture §2.2`.

  ```sql
  ALTER TABLE "promociones" FORCE ROW LEVEL SECURITY;
  -- …repetir para toda tabla con tenant_id
  ```

- **Justificación:** sin `FORCE` o rol no-propietario, `§2.2` ("la única forma correcta de usar RLS bajo PgBouncer") no se cumple: el aislamiento depende de un detalle de despliegue no declarado ni verificado.

---

## Hallazgos mayores

### M1 · La suite de aislamiento es saltable en silencio (`skipIf`) — SC-003 puede pasar en verde sin ejecutarse

- **Archivo:** `tests/isolation/rls-isolation.test.ts:5`, `tests/isolation/cover-unique-constraint.test.ts:5`
- **Regla violada:** `architecture.md §2.1.7` ("suite explícita … es bloqueante en CI"), `spec.md SC-003`
- **Confianza:** alta
- **Descripción:** `describe.skipIf(!hasDatabaseUrl())` hace que, sin `DATABASE_URL`, toda la suite de aislamiento y de constraint de portada quede **omitida** y el runner reporte verde. Lo único que corre siempre es `schema-migration.test.ts`, que se limita a hacer `toContain` sobre el texto del `.sql` (no ejecuta SQL). Una regla declarada "bloqueante en CI" que se auto-desactiva ante la ausencia de una env var no es bloqueante.
- **Fix propuesto:** en CI, exigir `DATABASE_URL` (fallar el job si falta) en lugar de saltar; o convertir el skip en `throw` cuando `process.env.CI` está presente. Mantener `skipIf` solo para el entorno local del desarrollador, nunca para la verificación de merge.

### M2 · No existe test de inmutabilidad del histórico

- **Archivo:** `tests/isolation/` (ausente)
- **Regla violada:** `architecture.md §7.10` ("Test de política verifica que un intento de UPDATE falla incluso con rol de aplicación"), `constitution.md §11.4`
- **Confianza:** alta
- **Descripción:** ninguna prueba verifica que un `UPDATE`/`DELETE` sobre `lead_history`, `promocion_history` o `consent_records` falle. Es precisamente el test que habría detectado C1. `tasks.md` no lo incluye.
- **Fix propuesto:** añadir `tests/isolation/history-immutability.test.ts` que, dentro de `withTenant`, inserte una fila de histórico y verifique que un `UPDATE`/`DELETE` posterior `rejects.toThrow()`. Ejecutable solo tras aplicar el fix de C1.

### M3 · El `customType` PostGIS de `geo.ts` no es compatible con la E/S real de PostGIS (WKB/SRID)

- **Archivo:** `src/infrastructure/db/schema/geo.ts:13-27`
- **Regla violada:** `architecture.md §1` (PostGIS, tipos derivados del schema correctos), integridad de datos
- **Confianza:** media
- **Descripción:** `toDriver` emite el string `POINT(x y)` sin SRID; insertar ese texto en una columna `geometry(Point,4326)` provoca desajuste de SRID (0 vs 4326) y el INSERT falla en PostGIS real. `fromDriver` espera texto `POINT(...)`, pero PostGIS devuelve por defecto **EWKB en hex**; el regex no casa y la rama de fallo **devuelve `[0,0]` en silencio**, corrompiendo toda lectura de coordenadas. Que el schema haya mergeado con estos dos defectos es evidencia adicional de que la suite contra BD real (M1) nunca se ejecutó.
- **Fix propuesto:** en `toDriver` usar EWKT con SRID (`SRID=4326;POINT(${x} ${y})`) o envolver con `ST_SetSRID(ST_MakePoint(...),4326)` en el repositorio; en `fromDriver` leer vía `ST_AsText`/`ST_AsGeoJSON` en las queries (o parsear WKB hex) y **lanzar** en vez de devolver `[0,0]` ante entrada no reconocida.

### M4 · TDD invertido: la implementación se commiteó antes que los tests

- **Archivo:** historial de commits `e4a694b`,`643f91c`,`eef1345`,`6ed300a` (implementación) → `e97076d` (tests)
- **Regla violada:** `constitution.md §3` (RED antes que implementación), `tasks.md T028` ("TDD: RED primero")
- **Confianza:** media (alta en el orden de commits; media en si aplica TDD estricto a DDL)
- **Descripción:** los cuatro commits de schema/RLS/migración preceden al commit de tests. `tasks.md` exigía explícitamente el test de aislamiento en RED primero. No hay ningún commit con el test fallando antes de la implementación.
- **Fix propuesto:** documentar la desviación; en features de datos futuras, escribir el test de aislamiento (RED) contra una BD de prueba antes de generar el schema.

### M5 · Falta el constraint de BD que impide `ZONAS_COMUNES`/`PLAZOS_GARANTIAS` en `kind='external'`

- **Archivo:** `src/infrastructure/db/schema/promocion-content-blocks.ts` (sin constraint)
- **Regla violada:** `architecture.md §6.2` ("Existe constraint CHECK…") y `§7.6`; `product.md §6.5`
- **Confianza:** media
- **Descripción:** la tabla no incluye ninguna protección a nivel de motor contra bloques prohibidos en captaciones externas. Un `CHECK` puro no puede referenciar `promociones.kind`, por lo que exige trigger o FK compuesta; la arquitectura lo pide como "constraint en BD + validación en servicio". Puede estar deliberadamente diferido a la feature de bloques/servicio, pero `architecture` lo ubica en el modelo de datos.
- **Fix propuesto:** añadir trigger `BEFORE INSERT/UPDATE` que consulte `promociones.kind` y rechace ambos `block_type` cuando sea `'external'`, o una columna denormalizada `kind` + `CHECK`. Si se difiere, anotarlo explícitamente en `tasks.md`.

### M6 · `email_queue` sin `tenant_id` contradice `architecture §6.5`

- **Archivo:** `src/infrastructure/db/schema/email-queue.ts:13-35`
- **Regla violada:** `architecture.md §6.5` (la fila `email_queue` lista `tenant_id` como campo clave); `constitution §11.3`; contradice a la vez `spec.md FR-005`/`tasks.md T021` que dicen "sin tenant_id"
- **Confianza:** media
- **Descripción:** existe una contradicción entre fuentes. `architecture §6.5` enumera `tenant_id` en `email_queue`, pero spec/tasks y el código lo omiten (tratándola como tabla de infraestructura sin RLS, como `§2.1.4` para puentes). El efecto práctico: las notificaciones encoladas no tienen atribución de tenant, lo que rompería el contexto de tenant en Sentry (`§7.16`) y el filtrado por tenant en el worker en un escenario multi-tenant real.
- **Fix propuesto:** decisión humana. Si se mantiene multi-tenant DNA estricta, añadir `tenant_id NOT NULL` (con o sin RLS, dado que el worker corre fuera de contexto de request) y alinear spec/tasks. Si se acepta como infraestructura global, corregir `architecture §6.5` para quitar `tenant_id` de la fila y eliminar la contradicción documental.

---

## Hallazgos menores

### m1 · `tasks.md` con todas las casillas `[ ]` sin marcar pese a feature mergeada
- **Archivo:** `specs/002-db-schema-and-migrations/tasks.md`
- **Confianza:** alta · **Regla:** higiene de trazabilidad SDD. Ninguna tarea está `[X]`; no hay tareas `[X]` sin respaldo (el problema es el inverso: código real sin marcar). Fix: reconciliar el estado real marcando T001–T032 y anotando M4/M5 como desviaciones.

### m2 · Índice de orden de galería usa `(tenant_id, owner_id, sort_order)` en vez de `(tenant_id, promocion_id, sort_order)`
- **Archivo:** `media-assets.ts:45-47`
- **Confianza:** media · **Regla:** `architecture §6.6`. Semánticamente equivalente y más general (owner_id generaliza promocion_id), pero desvía de la literalidad del documento. Fix: aceptar y actualizar la redacción de `§6.6`, o filtrar además por `owner_type='PROMOCION'`.

### m3 · `promociones.operation` y `property_type` son NULL-ables
- **Archivo:** `promociones.ts:34-35`
- **Confianza:** baja (dudoso) · **Regla:** `product.md §4` describe operación y tipo como parte de la identidad de toda promoción. La BD los permite NULL; puede ser intencional para borradores (`DRAFT`). Fix opcional: si se exige en publicación, validarlo por Zod/servicio en la feature de catálogo.

### m4 · `geo.fromDriver` devuelve `[0,0]` ante entrada no reconocida en lugar de lanzar
- **Archivo:** `geo.ts:18-24`
- **Confianza:** media · **Regla:** `constitution §7` (no silenciar errores). Sub-síntoma de M3. Fix: lanzar error explícito para no enmascarar corrupción de coordenadas.

### m5 · Policies con `TO public` en vez de un rol de aplicación dedicado
- **Archivo:** `rls.ts:9`
- **Confianza:** baja · **Regla:** `architecture §2.2`. Ligado a C2. `TO public` es amplio; un rol nominal acota la superficie. Fix: emitir policies `TO app_role`.

### m6 · `current_setting('app.current_tenant_id')::uuid` sin `missing_ok` lanza si no hay contexto
- **Archivo:** `rls.ts:4`
- **Confianza:** baja (probablemente deseable) · **Regla:** —. Comportamiento fail-closed correcto (una query sin `SET LOCAL` falla en vez de exponer datos). Se documenta como observación, no como defecto. No requiere fix.

---

## Coherencia con features previas

F002 es una feature de cimientos; su única dependencia previa relevante es F004 (tenant context, mergeada *después* según el `git log` local, lo que sugiere reordenación). Los enums viven correctamente en `src/shared/constants/db-enums.ts` como fuente única cerrada (`constitution §11.1`) y los schemas los consumen vía `enums.ts` sin literales inline — patrón limpio y reutilizable. No hay imports cruzados entre features ni duplicación de helpers. El `client.ts` con `Proxy` perezoso es una abstracción razonable y única. El helper `withTenant` de los tests reproduce el patrón `SET LOCAL` de `architecture §2.2` correctamente (BEGIN → `SET LOCAL` → COMMIT), lo que es coherente con lo que F004 materializa en el repositorio context-aware. No se observan violaciones de la Scope Rule.

---

## Veredicto de tests

**Confianza en la suite: BAJA.**

Motivos concretos, no estilísticos:
1. Las dos suites que realmente probarían el comportamiento (aislamiento RLS y constraint de portada) se **auto-omiten** sin `DATABASE_URL` (M1); en un entorno sin la env var, el único test que corre es un `toContain` sobre el texto del `.sql`, que no ejecuta nada contra Postgres.
2. Los defectos de `geo.ts` (M3: SRID en INSERT, WKB en SELECT) harían fallar `rls-isolation.test.ts` contra un PostGIS real —insertan `'POINT(0 0)'` en `geometry(Point,4326)`—, lo que es evidencia fuerte de que la suite **nunca se ejecutó** contra la BD real y su verde histórico proviene del skip.
3. Falta por completo el test de inmutabilidad exigido por `architecture §7.10` (M2), el mismo que habría capturado C1.
4. Los tests se escribieron **después** de la implementación (M4).

`schema-migration.test.ts` sí es útil como guardia estructural (cuenta de tablas, presencia de índices/GIST/constraint parcial, RLS por tabla) y sus aserciones son específicas, no triviales. Pero valida *texto de migración*, no *semántica de base de datos*.

Recomendación: exigir `DATABASE_URL` en CI, arreglar `geo.ts`, añadir el test de inmutabilidad y re-ejecutar la suite completa contra una rama Neon de test antes de considerar SC-001/SC-003/SC-005 cumplidos.

---

## Métricas

- Archivos modificados: 39
- Líneas añadidas / borradas: +5572 / -69
- Cobertura medida en esta feature: no verificable (suites de BD saltadas sin `DATABASE_URL`; sin informe de coverage ejecutado en la auditoría)
- Cobertura efectiva sin tests saltados: ~la de `schema-migration.test.ts` (validación de texto de migración) únicamente
- Complejidad cognitiva máxima: baja (schemas declarativos; sin funciones de negocio > 15)
- Tiempo de ejecución de tests: no medido (auditoría de solo lectura)

---

## Recomendación

❌ **Reparar antes de aceptar para el TFM (veredicto ROJO).**

Hay dos hallazgos críticos que rompen invariantes duras y explícitas del proyecto: la inmutabilidad del histórico (C1) y la garantía real de aislamiento RLS bajo el rol de despliegue (C2). Ambos están además **sin cobertura de test** que los verifique (M1, M2), y la suite que debería probarlos se auto-desactiva y muestra indicios de no haberse ejecutado nunca contra PostGIS real (M3). El schema estructural es bueno y el resto es reparable, pero la feature de base de datos —cuya razón de ser es el aislamiento multi-tenant— no es defendible académicamente hasta aplicar C1, C2, M1, M2 y M3 y re-auditar con la suite corriendo en verde contra una BD real.
