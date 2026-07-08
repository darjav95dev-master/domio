# Research: Catalog Management (F011)

**Date**: 2026-07-08 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R-001: Generación determinista de slugs

**Decision**: Función pura que genera el slug desde `(propertyType, operation, municipality, bedrooms, shortId)`.

**Format**: `{tipo}-en-{operacion}-en-{municipio}-{n}hab-{idCorto}`
- `tipo`: valor de PROPERTY_TYPES normalizado (sin acentos, lowercase, espacios → guiones)
- `operacion`: SALE → "venta", RENT → "alquiler", SALE_AND_RENT → "venta-y-alquiler"
- `municipio`: lowercase, espacios → guiones, sin acentos
- `n`: primer tipología's bedrooms o "estudio" si 0
- `idCorto`: últimos 4 caracteres del UUID de la promoción (hex)

**Rationale**: El formato es legible, SEO-friendly, y el id_corto garantiza unicidad. Al ser función pura, es testeable sin BD.

**Alternatives considered**:
- Slug basado en nombre → cambia si renombran, rompe URLs indexadas.
- Slug auto-incremental → no descriptivo, malo para SEO.
- UUID completo en slug → demasiado largo, poco legible.

## R-002: Patrón de autoguardado

**Decision**: `PATCH /api/internal/promociones/:id/draft` con el estado completo del formulario en el body. El servidor actualiza `draft_payload` (JSONB). El cliente usa `useAutosave` hook con debounce de 30s.

**Rationale**: draft_payload es columna independiente de los campos publicados. El servidor no necesita diff — solo persiste el JSON completo. Simple y robusto.

**Alternatives considered**:
- Diff-based (solo campos cambiados) → complejidad innecesaria, el JSONB es ligero.
- WebSocket para autoguardado → overkill para un formulario, PATCH es suficiente.
- localStorage como fallback → no sobrevive entre dispositivos. El hook puede usarlo como complemento local.

## R-003: Validación Zod compartida

**Decision**: Un único schema Zod en `src/shared/schemas/promocion.schema.ts` que se importa tanto en los componentes React (validación client-side) como en las API routes (validación server-side).

**Rationale**: Single source of truth para la validación. Si cambia una regla, cambia en un solo sitio. Cumple constitution §4 ("Validar siempre en cliente Y en servidor").

**Alternatives considered**:
- Schemas separados cliente/servidor → riesgo de divergencia, mantenimiento duplicado.
- tRPC → dependencia adicional innecesaria, el proyecto usa Route Handlers.

## R-004: Histórico de cambios

**Decision**: El repositorio compara el estado anterior y posterior de la promoción en cada UPDATE. Por cada campo que cambia, inserta una fila en `promocion_history` con field, old_value, new_value, author_id. Todo dentro de la misma transacción que el UPDATE.

**Rationale**: La comparación en el repositorio es simple y no requiere triggers de BD. Al estar en la misma transacción, garantiza atomicidad: si el UPDATE falla, el histórico no se inserta.

**Alternatives considered**:
- Trigger de PostgreSQL → funcional pero menos portable, más difícil de testear.
- Event sourcing → overkill para el alcance del MVP.

## R-005: Listado con filtros en backoffice

**Decision**: Listado server-side con filtros via query params. El servidor construye la query Drizzle dinámicamente según los filtros recibidos. Sin paginación por cursor en backoffice (solo aplica a superficies públicas según architecture.md §1). Se usa paginación simple por offset con límite de 50 items por página.

**Rationale**: El backoffice no tiene restricciones de SEO ni de rendimiento con catálogos grandes (~100 promociones max por tenant). Offset pagination es más simple de implementar y suficiente para el volumen.

**Alternatives considered**:
- Cursor pagination → innecesario para < 100 items en backoffice.
- Infinite scroll → complejidad de UI innecesaria para un listado administrativo.

## R-006: Revalidación ISR

**Decision**: Al guardar una promoción (publicar o actualizar publicada), se invoca `revalidateTag('promocion:{slug}')` y `revalidateTag('catalog')` desde la API route. Si la promoción es borrador sin slug, solo `revalidateTag('catalog')`.

**Rationale**: Next.js `revalidateTag` es el mecanismo estándar para ISR. Las tags se invalidan inmediatamente, forzando re-render en la próxima request a la superficie pública.

**Alternatives considered**:
- `revalidatePath` → menos granular, invalidaría toda la ruta incluyendo no-relacionados.
- TTL-based revalidation → no inmediato, el cambio tardaría en reflejarse.

## R-007: Warning suave construction_status vs plazos_garantias

**Decision**: El servidor incluye en la respuesta GET de la promoción un campo computado `constructionWarning` que compara `construction_status` con `entrega_estimada` del bloque `PLAZOS_GARANTIAS` asociado (si existe). El cliente muestra un banner amarillo no bloqueante si detecta contradicción.

**Lógica de contradicción**:
- `ON_PLAN` + entrega_estimada en el pasado → warning
- `READY` + entrega_estimada en el futuro → warning
- `IN_CONSTRUCTION` + entrega_estimada en el pasado → warning

**Rationale**: El warning es informativo, no bloqueante. Cumple constitution §11.6 ("distinguir 'esto es incorrecto' de 'esto parece raro'"). El operador tiene contexto que el sistema no tiene.

**Alternatives considered**:
- Bloqueo duro → obligaría al operador a mentir al sistema para poder trabajar.
- Ignorar la contradicción → perdería información útil para el operador.
