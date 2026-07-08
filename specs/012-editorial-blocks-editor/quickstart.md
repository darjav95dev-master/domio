# Quickstart Validation: Editorial Blocks Editor

**Feature**: F012 — Editorial Blocks Editor
**Date**: 2026-07-08

## Prerequisites

- Base de datos Neon con migraciones aplicadas (`pnpm db:migrate`)
- Seed ejecutado (`pnpm db:seed`) — incluye bloques demo en las 8 promociones
- Servidor de desarrollo corriendo (`pnpm dev`)
- Usuario autenticado en el backoffice (admin@domio.test / Admin123!)

## Validation Scenarios

### 1. Crear bloque de descripción general

1. Acceder a `/panel/catalogo`
2. Pulsar sobre una promoción portfolio (ej. "Residencial Los Olivos")
3. Navegar a la sección "Bloques editoriales"
4. Pulsar "Añadir bloque" → seleccionar "Descripción general"
5. Rellenar el campo de texto con contenido de prueba
6. Pulsar "Guardar"
7. **Esperado**: El bloque aparece en la lista con sort_order correcto

### 2. Restricción por kind (external)

1. Acceder a `/panel/catalogo`
2. Pulsar sobre una promoción external (ej. "Ático Centro Histórico")
3. Navegar a la sección "Bloques editoriales"
4. Pulsar "Añadir bloque"
5. **Esperado**: El selector solo muestra 3 opciones (Descripción general, Memoria de calidades, Ubicación y servicios). NO aparecen Zonas comunes ni Plazos y garantías.

### 3. Reordenar bloques

1. En una promoción portfolio con 3+ bloques
2. Arrastrar un bloque a otra posición
3. **Esperado**: Los bloques se reordenan visualmente
4. Recargar la página
5. **Esperado**: El nuevo orden persiste

### 4. Validación Zod (payload inválido)

1. Crear un bloque "Memoria de calidades"
2. Dejar el campo "título" vacío en un ítem
3. Pulsar "Guardar"
4. **Esperado**: Error de validación visible en el formulario ("El título es obligatorio")

### 5. Bloqueo de publicación con bloques inválidos

1. En una promoción DRAFT con un bloque de payload inválido (forzado)
2. Intentar cambiar status a PUBLISHED
3. **Esperado**: El sistema bloquea la publicación y muestra qué bloque tiene datos inválidos

### 6. Eliminar bloque

1. En una promoción con 3+ bloques
2. Pulsar "Eliminar" en uno de los bloques
3. Confirmar
4. **Esperado**: El bloque se elimina, los sort_order se reindexan

## Tests automatizados

```bash
# Tests unitarios de validación Zod
pnpm vitest run src/shared/types/__tests__/content-block-schema.test.ts

# Tests de integración del repositorio
pnpm vitest run tests/integration/content-blocks.test.ts

# Tests de constraint en BD (trigger)
pnpm vitest run tests/integration/block-kind-constraint.test.ts
```

## Expected outcomes

- Los 5 tipos de bloque se crean, editan y eliminan correctamente
- La restricción por kind funciona en UI y backend
- La reordenación persiste tras recargar
- La validación Zod rechaza payloads inválidos en cliente y servidor
- El trigger en BD impide inserts inválidos aunque se bypassa el servicio
