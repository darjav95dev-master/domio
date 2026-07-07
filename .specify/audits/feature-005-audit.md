# Auditoría · Feature 005 · media-service-r2

> Generado por `code-auditor` (modelo: claude-sonnet-4-6)
> Fecha: 2026-07-07 15:45
> Commits auditados: 88fa562..2e0c6e1 (merge b1940fe)
> Archivos modificados: 22 archivos de dominio (48 totales incluyendo docs y config)

---

## Resumen ejecutivo

La feature implementa el servicio de medios sobre Cloudflare R2 con las operaciones
requeridas (upload, signed URLs, reorder, set-cover, delete). La lógica de aislamiento
multi-tenant (`SET LOCAL` dentro de transacción) está correctamente aplicada en todos
los métodos. Sin embargo, la feature incurre en dos violaciones críticas: toda la capa
de acceso a datos bypasa el patrón `TenantAwareRepository` obligatorio (architecture.md
§2.3 y §9), y la disciplina TDD fue ignorada — tests e implementación están en el mismo
commit sin un commit RED previo. Adicionalmente hay cuatro hallazgos mayores y ocho
menores. El servicio es funcionalmente correcto en términos de aislamiento de tenant,
pero es estructuralmente incorrecto como arquitectura.

| Severidad | Cantidad |
|-----------|----------|
| Críticos  | 2        |
| Mayores   | 4        |
| Menores   | 8        |

**Veredicto:** ROJO

---

## Hallazgos críticos

> Violan EXPLÍCITAMENTE constitution.md o architecture.md.
> Bloqueantes para el TFM si no se corrigen.

### C1 · MediaService ejecuta queries Drizzle directamente, bypassando TenantAwareRepository

- **Archivo:** `src/infrastructure/media/media.service.ts` (toda la clase)
- **Regla violada:** architecture.md §2.3 ("Todo acceso a datos pasa por un repositorio
  que recibe el TenantContext"), architecture.md §9 ("Nunca escribir una query SQL fuera
  de un repositorio context-aware")
- **Descripción:** `MediaService` importa `db` directamente de `../db/client` y llama
  `this.database.transaction()` con queries Drizzle inline (`tx.insert`, `tx.select`,
  `tx.update`, `tx.delete`) en los cinco métodos del servicio. No extiende
  `TenantAwareRepository`. No recibe un `TenantContext` — recibe solo `tenantId: string`
  y reproduce manualmente el patrón `SET LOCAL` en cada método. No existe ningún
  `MediaAssetRepository` en `src/infrastructure/db/repositories/`. El directorio de
  repositorios solo contiene la clase base `TenantAwareRepository.ts`, sin ninguna
  implementación concreta para `media_assets`.

  El bypass es completo: los cinco métodos del servicio saltan la capa de repositorio.

  Nota mitigante: `SET LOCAL app.current_tenant_id = ${this.tenantId}` SÍ se ejecuta
  correctamente al inicio de cada transacción, por lo que el aislamiento de tenant
  funciona en tiempo de ejecución. La violación es arquitectónica/estructural, no de
  seguridad. En tests la arquitectura correcta sería imposible de verificar porque el
  contrato de TenantAwareRepository no se cumple.

- **Código actual:**

  ```typescript
  // src/infrastructure/media/media.service.ts
  export class MediaService {
    private readonly database = db;  // db crudo importado directamente

    constructor(private readonly tenantId: string) {}  // solo string, no TenantContext

    async uploadImage(input: UploadInput): Promise<MediaAsset> {
      // ...validaciones...
      await this.s3Client.send(new PutObjectCommand({...}));

      return this.database.transaction(async (tx) => {  // query directa fuera de repo
        await tx.execute(sql`SET LOCAL app.current_tenant_id = ${this.tenantId}`);
        const rows = await tx.insert(mediaAssets).values({...}).returning();
        return rows[0] as MediaAsset;
      });
    }
  }
  ```

- **Fix propuesto:**

  ```typescript
  // Paso 1: Crear src/infrastructure/db/repositories/media-asset.repository.ts
  import { TenantAwareRepository } from "./TenantAwareRepository";
  import type { TenantContext } from "../tenant/TenantContext";
  import { mediaAssets } from "../schema/media-assets";
  import type { MediaAsset, NewMediaAsset } from "../schema/media-assets";
  import { and, eq, inArray } from "drizzle-orm";

  export class MediaAssetRepository extends TenantAwareRepository {
    constructor(ctx: TenantContext) { super(ctx); }

    async insert(values: NewMediaAsset): Promise<MediaAsset> {
      return this.withTransaction(async (tx) => {
        const rows = await tx.insert(mediaAssets).values(values).returning();
        return rows[0] as MediaAsset;
      });
    }

    async findById(id: string): Promise<MediaAsset | undefined> {
      return this.withTransaction(async (tx) => {
        const [row] = await tx.select().from(mediaAssets)
          .where(and(eq(mediaAssets.id, id), eq(mediaAssets.tenantId, this.ctx.tenantId)));
        return row;
      });
    }
    // ... demás métodos (findByOwner, updateSortOrder, setCover, delete)
  }

  // Paso 2: MediaService recibe TenantContext y delega al repositorio
  export class MediaService {
    private readonly repo: MediaAssetRepository;

    constructor(private readonly ctx: TenantContext) {
      this.repo = new MediaAssetRepository(ctx);
    }

    async uploadImage(input: UploadInput): Promise<MediaAsset> {
      // ...validaciones...
      await this.s3Client.send(new PutObjectCommand({...}));
      return this.repo.insert({ tenantId: this.ctx.tenantId, ...otherFields });
    }
  }
  ```

- **Justificación del fix:** La capa de repositorio es la única abstracción autorizada
  para acceso a datos en Domio. Con este fix `MediaService` cumple architecture.md §2.3,
  el `TenantContext` fluye correctamente por inyección, y los tests pueden verificar el
  contrato del repositorio de forma independiente de la lógica R2.

---

### C2 · TDD no aplicado — tests e implementación en un único commit sin commit RED previo

- **Archivo:** commit `2e0c6e1` (todos los archivos de la feature)
- **Regla violada:** constitution.md §3 ("RED: Escribir el test PRIMERO → ejecutar →
  DEBE FALLAR"), constitution.md §10 ("El agente NUNCA escribe implementación antes del
  test en lógica de dominio o aplicación")
- **Descripción:** La feature completa — 243 líneas de `media.service.ts`, 284 de
  `upload/route.ts`, 452 de `media.service.test.ts` y 195 de `upload.test.ts` — aparece
  en un único commit `2e0c6e1`. No existe ningún commit anterior con los tests en estado
  rojo. Los commits entre F004 y este merge (`ab00290 chore: cbm`, `c880463 commit`,
  `bd49d73 cbm`) no contienen código de tests ni de implementación. El ciclo
  RED → GREEN → REFACTOR es imposible de verificar y con alta probabilidad fue ignorado.

  Inspección de los tests: las aserciones son de calidad razonable (verifican que R2 no
  se llama cuando la validación falla, verifican la cadena de update calls). Sin embargo,
  la evidencia de git es suficiente para clasificar como crítico.

- **Código actual:**

  ```
  git log --oneline 88fa562..b1940fe
  b1940fe merge: F006 · media-service-r2 → main
  2e0c6e1 feat(006): implement media service R2 with upload, signed URLs, and gallery operations
  ab00290 chore: refresh cbm graph artifact
  c880463 commit
  bd49d73 cbm
  ```

- **Fix propuesto:**

  No hay fix técnico retroactivo. Para el TFM, documentar la evidencia de que el ciclo
  TDD se ejecutó fuera de git (en la sesión del agente) y reescribir el historial en
  rama separada con al menos tres commits: (1) tests RED, (2) implementación GREEN,
  (3) refactor. Si no es posible reescribir el historial, añadir un commit de test
  adicional que pruebe un caso no cubierto actualmente (m8 — R2 URL en MediaImage,
  o la cobertura de US2 AC3 prefers-reduced-motion) para demostrar la práctica
  test-first en al menos un punto incremental.

- **Justificación del fix:** La metodología TDD es obligatoria por constitution.md §3
  para lógica de dominio. Sin evidencia de RED, la cadena de auditoría académica
  (TFM) no puede certificar que la implementación fue guiada por los tests.

---

## Hallazgos mayores

> Mala práctica seria que no viola constitución pero compromete calidad
> o mantenibilidad a medio plazo.

### M1 · Llamada a R2 dentro de la transacción de base de datos en `delete`

- **Archivo:** `src/infrastructure/media/media.service.ts:219-242`
- **Regla violada:** architecture.md §2.2 ("Transaction pooling: SET LOCAL obligatorio
  dentro de transacción"), principio de no mezclar I/O externo con transacciones de BD
- **Confianza:** Alta
- **Descripción:** En el método `delete`, la llamada `this.s3Client.send(new
  DeleteObjectCommand(...))` — una operación de red externa — se ejecuta DENTRO del
  callback de `this.database.transaction()`. Esto tiene dos consecuencias:

  1. La conexión de PgBouncer permanece reservada durante el round-trip a R2, degradando
     el rendimiento del pool bajo carga.
  2. Si R2 completa la eliminación pero la instrucción `tx.delete(mediaAssets)` falla
     (rollback), el registro en BD reaparece pero el objeto R2 ya no existe. Estado
     inconsistente permanente.

  Por contraste, `uploadImage` sí pone R2 fuera de la transacción (patrón correcto),
  haciendo la inconsistencia entre métodos aún más notable.

- **Código actual:**

  ```typescript
  async delete(assetId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.current_tenant_id = ${this.tenantId}`);
      const [asset] = await tx.select().from(mediaAssets).where(...);
      if (!asset) throw new Error("Asset not found");

      // R2 dentro de la transacción — MAL
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: mediaEnv.R2_BUCKET,
        Key: asset.r2Key,
      }));

      await tx.delete(mediaAssets).where(eq(mediaAssets.id, assetId));
    });
  }
  ```

- **Fix propuesto:**

  ```typescript
  async delete(assetId: string): Promise<void> {
    // 1. Verificar existencia y obtener r2Key dentro de transacción
    const asset = await this.database.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.current_tenant_id = ${this.tenantId}`);
      const [found] = await tx.select().from(mediaAssets)
        .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.tenantId, this.tenantId)));
      if (!found) throw new Error("Asset not found");
      return found;
    });

    // 2. Eliminar de R2 FUERA de la transacción de BD
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: mediaEnv.R2_BUCKET,
      Key: asset.r2Key,
    }));

    // 3. Eliminar registro de BD en transacción separada
    await this.database.transaction(async (tx) => {
      await tx.execute(sql`SET LOCAL app.current_tenant_id = ${this.tenantId}`);
      await tx.delete(mediaAssets)
        .where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.tenantId, this.tenantId)));
    });
  }
  ```

- **Justificación del fix:** R2 y PgBouncer son sistemas independientes. Mantener
  la transacción de BD abierta durante el I/O a R2 monopoliza una conexión del pool
  innecesariamente. El orden R2-primero → DB-después es el patrón que ya usa
  `uploadImage`, haciéndolo consistente. Con este orden, si R2 falla el registro
  en BD se preserva (estado seguro). Si R2 tiene éxito y la BD falla, queda un
  objeto huérfano en R2 — el mismo riesgo que el actual pero ahora explícito y
  documentable como compensación aceptada.

---

### M2 · `env.ts` valida con función custom en lugar de Zod (FR-010)

- **Archivo:** `src/infrastructure/media/env.ts`
- **Regla violada:** spec.md FR-010 ("validate R2 credentials...using Zod")
- **Confianza:** Media
- **Descripción:** FR-010 establece explícitamente "using Zod". La implementación usa
  la función `validateRequiredString` (validación manual de presencia de string).
  Nota: `src/infrastructure/tenant/env.ts` — el fichero referenciado por FR-010 como
  patrón a seguir — también usa validación manual sin Zod. El spec tiene una
  contradicción interna: citar el patrón de tenant/env.ts implica no usar Zod (porque
  ese archivo no lo usa). La implementación siguió el patrón existente en lugar de
  la letra de FR-010. Se clasifica como mayor porque la discrepancia es real aunque el
  impacto funcional es nulo — la validación cumple su propósito.

- **Código actual:**

  ```typescript
  function validateRequiredString(value: string | undefined, name: string): string {
    if (!value || value.trim().length === 0) {
      throw new Error(`${name} environment variable is not defined`);
    }
    return value;
  }
  ```

- **Fix propuesto:**

  ```typescript
  import { z } from "zod";

  const MediaEnvSchema = z.object({
    R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),
    R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
    R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
    R2_BUCKET: z.string().min(1, "R2_BUCKET is required"),
    R2_PUBLIC_URL: z.string().url("R2_PUBLIC_URL must be a valid URL"),
  });

  let validatedRecord: z.infer<typeof MediaEnvSchema> | null = null;

  function ensureValidated() {
    if (validatedRecord) return validatedRecord;
    const result = MediaEnvSchema.safeParse(process.env);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      throw new Error(`Invalid R2 environment: ${JSON.stringify(errors)}`);
    }
    validatedRecord = Object.freeze(result.data);
    return validatedRecord;
  }
  ```

- **Justificación del fix:** Zod añade validación de tipo (R2_PUBLIC_URL como URL
  válida, no solo string no vacío), mensajes de error estandarizados con
  ZodError.flatten(), y alineamiento con architecture.md §1 ("Validación: Zod —
  Mismo schema en cliente, servidor y API pública"). Adicionalmente, actualizar
  `tenant/env.ts` con el mismo patrón eliminaría la inconsistencia interna.

---

### M3 · `VALID_KINDS` duplicado en route en lugar de importar `ALLOWED_MEDIA_KINDS`

- **Archivo:** `app/api/internal/media/upload/route.ts:19`
- **Regla violada:** constitution.md §2 ("Constantes centralizadas en `shared/constants/`:
  ningún magic string duplicado"), constitution.md §11.1 (enums y sets cerrados como
  fuente única)
- **Confianza:** Alta
- **Descripción:** La ruta define su propia constante local:
  `const VALID_KINDS = ["IMAGE_GALLERY", "PLAN", "DOCUMENT"] as const`
  mientras que `src/infrastructure/media/constants.ts` ya exporta
  `ALLOWED_MEDIA_KINDS` con los mismos valores. Dos fuentes para el mismo conjunto
  cerrado: si se añade un nuevo kind en el futuro, hay que actualizar dos sitios.

- **Código actual:**

  ```typescript
  // app/api/internal/media/upload/route.ts:19
  const VALID_KINDS = ["IMAGE_GALLERY", "PLAN", "DOCUMENT"] as const;
  ```

- **Fix propuesto:**

  ```typescript
  // Eliminar la constante local y usar la importada:
  import { ALLOWED_MEDIA_KINDS } from "@/infrastructure/media/constants";

  // En validateKindField:
  if (!kindField || !ALLOWED_MEDIA_KINDS.includes(kindField as (typeof ALLOWED_MEDIA_KINDS)[number])) {
    errors.push({ field: "kind", message: "Invalid kind..." });
  }
  ```

- **Justificación del fix:** Un solo origen de verdad para los valores de kind.
  Si el producto añade un kind nuevo (`VIDEO`, por ejemplo), se actualiza
  `constants.ts` y la ruta lo hereda automáticamente.

---

### M4 · Sin logging estructurado de fallos R2 (FR-012)

- **Archivo:** `src/infrastructure/media/media.service.ts` (todos los métodos con I/O R2)
- **Regla violada:** spec.md FR-012 ("System MUST log structured errors for R2 operations
  without exposing credentials"), constitution.md §7 (Sentry para error tracking)
- **Confianza:** Alta
- **Descripción:** Cuando una operación R2 falla (e.g., `PutObjectCommand` lanza), el
  error se propaga silenciosamente hasta el route handler, que devuelve un 500 genérico
  sin capturar contexto (tenant, asset id, r2Key, operación) en Sentry. En un sistema
  multi-tenant, un fallo de R2 sin contexto es imposible de depurar en producción.

- **Código actual:**

  ```typescript
  // Ningún bloque try/catch ni llamada a Sentry en ningún método del servicio
  await this.s3Client.send(new PutObjectCommand({...}));
  ```

- **Fix propuesto:**

  ```typescript
  import * as Sentry from "@sentry/nextjs";

  async uploadImage(input: UploadInput): Promise<MediaAsset> {
    // ...validaciones...
    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: mediaEnv.R2_BUCKET,
        Key: r2Key,
        Body: input.file,
        ContentType: input.mimeType,
      }));
    } catch (error) {
      Sentry.withScope((scope) => {
        scope.setTag("tenant_id", this.tenantId);
        scope.setContext("r2_upload", { r2Key, mimeType: input.mimeType, kind: input.kind });
        // NOTA: no loguear input.file ni credenciales
        Sentry.captureException(error);
      });
      throw new Error("R2 upload failed. Please try again.");
    }
    // ...insert en BD...
  }
  ```

- **Justificación del fix:** FR-012 exige logging estructurado sin exponer credenciales.
  architecture.md §7.16 y product.md §8 exigen que Sentry capture `tenant_id` en cada
  evento. Capturar la excepción antes de relanzarla permite (a) enriquecer con contexto
  de tenant, (b) filtrar datos sensibles (credentials, rutas internas), y (c) medir
  la tasa de fallos R2 por tenant en el dashboard de Sentry.

---

## Hallazgos menores

### m1 · `eslint-disable` de archivo completo suprime dead code en `signedReadUrl`

- **Archivo:** `src/infrastructure/media/media.service.ts:1`
- **Confianza:** Alta
- `/* eslint-disable @typescript-eslint/no-unused-vars */` suprime toda la regla en el
  archivo. La causa real es que el parámetro `opts?: TransformOptions` en `signedReadUrl`
  se declara pero nunca se usa (transformaciones no implementadas). Fix: eliminar el
  eslint-disable, eliminar `opts` del método y añadir un TODO si las transformaciones
  están planificadas, o implementarlas.

---

### m2 · `tx.delete()` no incluye filtro explícito de `tenantId`

- **Archivo:** `src/infrastructure/media/media.service.ts:240`
- **Confianza:** Media
- `await tx.delete(mediaAssets).where(eq(mediaAssets.id, assetId))` — el WHERE no
  incluye `AND tenant_id = this.tenantId`. El `SET LOCAL` y las políticas RLS cubren
  esto a nivel de motor de BD, pero la defensa en profundidad exige el filtro explícito.
  Fix: `where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.tenantId, this.tenantId)))`.

---

### m3 · Fixture de test usa `ownerType: "promotion"` en lugar de `"PROMOCION"`

- **Archivo:** `tests/unit/media/media.service.test.ts:58`
- **Confianza:** Alta
- `fakeAsset()` inicializa `ownerType: "promotion"` pero el enum real definido en
  `src/shared/constants/db-enums.ts:67` es `"PROMOCION"`. Los tests pasan porque la
  BD está mockeada, pero el fixture es engañoso y dificulta detectar bugs de tipo
  si en el futuro el mock se vuelve más estricto.

---

### m4 · Spec Key Entities incluye `width`, `height`, `updated_at`, `filename` — ausentes del schema

- **Archivo:** `src/infrastructure/db/schema/media-assets.ts`
- **Confianza:** Media
- La spec (sección Key Entities) declara `width`, `height` (nullable para documentos),
  `updated_at` y `filename`. El schema Drizzle no los tiene. architecture.md §6.2
  tampoco los incluye, por lo que la divergencia está entre spec y architecture (no entre
  código y architecture). Para un TFM, conviene o alinear la spec con lo implementado
  o añadir los campos con una migración explícita.

---

### m5 · `next.config.ts` usa `placeholder.com` como fallback si `R2_PUBLIC_URL` no está definida

- **Archivo:** `next.config.ts:8`
- **Confianza:** Media
- `process.env.R2_PUBLIC_URL || "https://placeholder.com"` — si la variable no está
  en el entorno de build, Next.js autorizará `placeholder.com` como remote pattern
  para imágenes. Esto rompe la restricción de architecture.md §3 ("Todo pasa por R2")
  y podría permitir imágenes de orígenes no autorizados si alguien pasa una URL de
  `placeholder.com` en un src. Fix: fallar explícitamente en build si la variable no
  está, consistente con el patrón de `mediaEnv`.

---

### m6 · `reorderGallery` genera N UPDATEs secuenciales en lugar de bulk

- **Archivo:** `src/infrastructure/media/media.service.ts:160-171`
- **Confianza:** Alta
- El bucle `for (const [i, assetId] of orderedAssetIds.entries())` ejecuta una
  instrucción UPDATE por asset. Para 50 imágenes (límite del spec) son 50 round-trips
  al motor dentro de una transacción. Un CASE WHEN o una actualización VALUES-based
  reduciría esto a un único statement. Impacto práctico bajo en MVP (N≤50), pero el
  patrón no escala.

---

### m7 · US2 AC3 (prefers-reduced-motion) no implementado ni testado

- **Archivo:** `src/shared/components/media-image.tsx`, `tests/shared/components/media-image.test.tsx`
- **Confianza:** Alta
- El tercer acceptance criterion de User Story 2 en la spec dice: "Given a visitor
  with `prefers-reduced-motion: reduce`, When MediaImage renders, Then animations are
  disabled." El componente no implementa este comportamiento y no hay test para él.
  Actualmente `MediaImage` no define animaciones de carga, por lo que la AC puede
  considerarse vacuamente satisfecha, pero sin test explícito es indemostrable.

---

### m8 · T016 no añade verificación con URL real de R2

- **Archivo:** `tests/shared/components/media-image.test.tsx`
- **Confianza:** Baja
- T016 decía "write verification test proving R2 URL renders and fallback works". La
  tarea no fue completada: el archivo de test existe desde F003 y no fue modificado en
  esta feature (`git show 2e0c6e1 -- tests/shared/components/media-image.test.tsx`
  devuelve vacío). Los tests existentes usan `/photo.jpg`, no una URL de R2. El
  comportamiento funcional es equivalente para cualquier src, así que el impacto real
  es bajo.

---

## Coherencia con features previas

Esta feature sigue el patrón de lazy-proxy para env validation establecido por F004
(`src/infrastructure/tenant/env.ts`). La consistencia es positiva. Sin embargo, como
se señala en M2, ninguna de las dos usa Zod según requiere architecture.md §1 ("Mismo
schema en cliente, servidor y API pública"), lo que sugiere una deuda técnica acumulada
desde F004 que esta feature perpetúa.

La feature reutiliza correctamente `MediaImage` de F003 sin modificarlo
(FR-011 cumplido). El schema de `media_assets` de F002 se consume sin duplicación.

El patrón de bypass del repositorio (C1) es un antipatrón que no existe en F004
(que sí usa `TenantAwareRepository` correctamente). Si las features posteriores que
implementen el servicio de catálogo, leads, etc. siguen el mismo enfoque que esta
feature, el patrón erróneo se propagará por todo el codebase. Este es el riesgo
principal de coherencia inter-feature.

No se detectan imports cruzados entre features ni duplicación de helpers entre esta
feature y las anteriores.

---

## Veredicto de tests

**Nivel de confianza: MEDIA-BAJA**

Las aserciones unitarias son de calidad razonable: verifican que R2 no se llama cuando
la validación falla, verifican el número de llamadas a `tx.update`, verifican el orden
de set cover. Los tests de integración cubren los cinco escenarios HTTP principales
(201 válido, 422 sin alt_text, 413 oversized, 422 MIME inválido, 401 sin auth).

Sin embargo:

1. **TDD roto (C2)**: toda evidencia de git indica que tests e implementación se
   escribieron simultáneamente. La confianza en que los tests estuvieron en rojo primero
   es cero.

2. **`fakeAsset()` fixture con ownerType incorrecto** (m3): sugiere que el test fue
   escrito sin ejecutar contra la DB real.

3. **`opts` nunca testeado**: el parámetro `TransformOptions` se declara en la firma de
   `signedReadUrl` pero no tiene ningún test que verifique su efecto (porque no tiene
   ningún efecto — es dead code).

4. **US2 AC3 sin test** (m7): un acceptance criterion de P1 sin cobertura.

5. El test de `delete` afirma que `tx.update` no se llama al borrar un cover asset —
   lo cual es correcto funcionalmente — pero el mock de `createTx` no refleja el
   estado inconsistente descrito en M1 (R2 dentro de la transacción).

Recomendación: reescribir 3 tests — (1) `delete` con simulación de fallo en DB después
de R2 para verificar que no hay estado inconsistente, (2) `signedReadUrl` para PLAN kind
explícitamente, (3) añadir un test de AccessibilityMediaImage con `prefers-reduced-motion`.

---

## Métricas

- Archivos modificados (dominio): 22
- Líneas añadidas / borradas: +1.537 / -0 (solo adiciones en archivos de dominio)
- Cobertura medida en esta feature: no ejecutada en esta auditoría (requiere BD real)
- Complejidad cognitiva máxima encontrada: estimada ≤10 en todos los métodos (umbral: 15)
- Tiempo de ejecución de tests de esta feature: no medido

---

## Recomendación

❌ **Reparar antes de aceptar para el TFM**

Hay dos hallazgos críticos: el bypass completo del patrón `TenantAwareRepository`
(C1) y la ausencia de evidencia de TDD (C2). El primero viola explícitamente una
regla de architecture.md §9 que define el contrato de acceso a datos de Domio. El
segundo viola constitution.md §3, que es la práctica de ingeniería más verificable
académicamente. Para un TFM, ambos deben resolverse.

Orden de reparación:
1. C1: Crear `MediaAssetRepository` extendiendo `TenantAwareRepository` y refactorizar
   `MediaService` para inyectar `TenantContext`. Esto resuelve también m2.
2. M1: Mover la llamada R2 en `delete` fuera de la transacción de BD.
3. M3: Eliminar `VALID_KINDS` local en route, importar `ALLOWED_MEDIA_KINDS`.
4. M4: Añadir captura de errores R2 con contexto Sentry en los tres métodos con I/O.
5. m1: Eliminar el eslint-disable y el parámetro `opts` muerto.

Tras aplicar C1+M1+M3+M4, re-auditar y el veredicto probablemente pase a AMARILLO
(C2 necesita decisión humana sobre cómo evidenciar TDD retroactivamente).
