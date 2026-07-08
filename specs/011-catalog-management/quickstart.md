# Quickstart Validation: Catalog Management (F011)

**Date**: 2026-07-08 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Prerequisites

- Base de datos Neon de desarrollo con migraciones aplicadas (`pnpm db:migrate`)
- Seed data cargada (`pnpm db:seed`) — incluye 8 promociones demo, tipologías y unidades
- Variables de entorno configuradas en `.env.local`
- Sesión de usuario autenticado (OPERATOR o ADMIN)

## Validation Scenarios

### V-001: Listado con filtros

1. Acceder a `/panel/catalogo` autenticado como OPERATOR
2. Verificar que se muestran las 8 promociones del seed
3. Aplicar filtro kind=portfolio → verificar que solo se muestran 4
4. Aplicar filtro status=DRAFT → verificar que se filtran correctamente
5. Limpiar filtros → verificar que vuelven las 8
6. **Resultado esperado**: Listado renderiza, filtros funcionan, scope por rol respeta asignaciones

### V-002: Crear promoción nueva

1. Pulsar "Nueva promoción" desde el listado
2. Rellenar nombre, kind=portfolio, operation=SALE, propertyType=piso
3. Guardar como borrador
4. **Resultado esperado**: Promoción creada con status=DRAFT, slug=null
5. Verificar en listado que aparece la nueva promoción

### V-003: Publicar promoción (generación de slug)

1. Editar la promoción creada en V-002
2. Rellenar ubicación (isla, municipio, coordenadas), mapPrivacyMode=EXACT
3. Añadir una tipología con bedrooms=3
4. Cambiar status a PUBLISHED y guardar
5. **Resultado esperado**: Slug generado con formato `piso-en-venta-en-{municipio}-3hab-{id4}`
6. Verificar que el slug aparece en la URL de la ficha

### V-004: Slug persistente tras renombrar

1. Editar la promoción publicada de V-003
2. Cambiar el nombre de la promoción
3. Guardar
4. **Resultado esperado**: El slug NO ha cambiado (sigue siendo el generado en V-003)
5. Verificar en BD que la columna slug no se modificó

### V-005: Autoguardado de borrador

1. Editar una promoción publicada
2. Modificar el nombre (sin guardar manualmente)
3. Esperar 30 segundos (autoguardado)
4. Recargar la página
5. **Resultado esperado**: El formulario muestra el nombre modificado (restaurado desde draftPayload)
6. Verificar que los campos publicados de la promoción NO cambiaron en BD

### V-006: Descartar borrador

1. Tras el autoguardado de V-005, pulsar "Descartar borrador"
2. **Resultado esperado**: draftPayload se pone a NULL, el formulario muestra los últimos datos publicados

### V-007: Warning suave construction_status

1. Editar una promoción con constructionStatus=ON_PLAN
2. Si existe un bloque plazos_garantias con entrega_estimada en el pasado
3. **Resultado esperado**: Se muestra un warning amarillo no bloqueante
4. Guardar → el guardado se completa sin error

### V-008: Histórico de cambios

1. Editar una promoción publicada (cambiar nombre, precio de una tipología)
2. Guardar
3. Acceder al histórico de la promoción
4. **Resultado esperado**: Se ven las filas con field='name', field='referencePriceSale', old/new values, autor y timestamp

### V-009: Gestión de tipologías y unidades

1. Editar una promoción
2. Añadir una tipología nueva con todos los campos
3. Dentro de la tipología, añadir 2 unidades
4. Guardar
5. **Resultado esperado**: Tipología y unidades persistidas correctamente
6. Eliminar una unidad → verificar que se borra en cascada

### V-010: Scope por rol (AGENT)

1. Autenticarse como AGENT
2. Acceder a `/panel/catalogo`
3. **Resultado esperado**: Solo ve las promociones que tiene asignadas
4. Intentar acceder a la URL de una promoción no asignada → 403

### V-011: Validación Zod

1. Intentar crear promoción con name de 2 caracteres (min 3)
2. **Resultado esperado**: Error de validación visible en el formulario
3. Intentar publicar sin ubicación
4. **Resultado esperado**: Error de validación, no se genera slug

### V-012: Tests automatizados

```bash
# Tests unitarios del slug generator
pnpm vitest run src/infrastructure/slug/

# Tests unitarios del repositorio
pnpm vitest run src/infrastructure/db/repositories/promocion.repository.spec.ts

# Tests de validación Zod
pnpm vitest run src/shared/schemas/

# Tests de componentes
pnpm vitest run src/features/promociones/

# Suite completa
pnpm vitest run --reporter=dot
```

**Resultado esperado**: Todos los tests pasan en verde.
