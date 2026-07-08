# Quickstart Validation: Media Gallery Backoffice

**Feature**: F013 — Media Gallery Backoffice
**Date**: 2026-07-08

## Prerequisites

- Base de datos Neon con migraciones aplicadas (`pnpm db:migrate`)
- Seed ejecutado (`pnpm db:seed`) — incluye media_assets demo
- Servidor de desarrollo corriendo (`pnpm dev`)
- Usuario autenticado en el backoffice (admin@domio.test / Admin123!)
- Variables de entorno de R2 configuradas (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)

## Validation Scenarios

### 1. Subir imagen de galería

1. Acceder a `/panel/catalogo`
2. Pulsar sobre una promoción (ej. "Residencial Los Olivos")
3. Navegar a la sección "Medios"
4. Pulsar "Subir imagen"
5. Seleccionar un archivo de imagen y rellenar alt_text
6. Pulsar "Subir"
7. **Esperado**: La imagen aparece en la galería con sort_order correcto

### 2. Subir imagen sin alt_text (rechazo)

1. En la sección "Medios" de una promoción
2. Pulsar "Subir imagen"
3. Seleccionar un archivo pero dejar alt_text vacío
4. Pulsar "Subir"
5. **Esperado**: Error "El texto alternativo es obligatorio"

### 3. Reordenar imágenes

1. En una promoción con 3+ imágenes de galería
2. Arrastrar una imagen a otra posición
3. **Esperado**: Las imágenes se reordenan visualmente
4. Recargar la página
5. **Esperado**: El nuevo orden persiste

### 4. Marcar portada

1. En una promoción con 3+ imágenes de galería
2. Pulsar "Marcar como portada" en una imagen
3. **Esperado**: Esa imagen aparece marcada como portada, las demás no
4. Marcar otra imagen como portada
5. **Esperado**: La nueva es portada, la anterior pierde la marca

### 5. Subir plano

1. En la sección "Medios"
2. Pulsar "Subir plano"
3. Seleccionar un archivo PDF/imagen y rellenar alt_text
4. **Esperado**: El plano aparece en la sección de planos (separada de la galería)

### 6. Bloqueo de publicación

1. En una promoción sin imágenes de galería
2. Intentar cambiar status a PUBLISHED
3. **Esperado**: Bloqueo "Debe subir al menos una imagen de galería"
4. Subir una imagen sin alt_text
5. Intentar publicar
6. **Esperado**: Bloqueo "Todas las imágenes deben tener texto alternativo"

### 7. Eliminar imagen

1. En una promoción con imágenes
2. Pulsar "Eliminar" en una imagen
3. Confirmar
4. **Esperado**: La imagen se elimina de la galería y de R2

## Tests automatizados

```bash
# Tests de integración de operaciones de media
pnpm vitest run tests/integration/media-operations.test.ts

# Tests de validación Zod
pnpm vitest run tests/unit/media-validation.test.ts
```

## Expected outcomes

- Imágenes y planos se suben correctamente a R2
- alt_text obligatorio en todos los assets
- Reordenación persiste tras recargar
- Solo una portada por promoción
- Publicación bloqueada si faltan medios o alt_text
- Secciones separadas para galería y planos
