# Research: Media Gallery Backoffice

**Feature**: F013 — Media Gallery Backoffice
**Date**: 2026-07-08

## R-001: Integración de la sección de medios en la UI

**Decision**: La sección de medios se integra como un nuevo componente `<MediaGallery>` dentro de la página de edición de promoción (`app/(auth)/panel/catalogo/[id]/page.tsx`), en una pestaña o sección separada de los bloques editoriales (F012).

**Rationale**: El spec dice "Integrar la sección de medios dentro del formulario de edición de promoción existente". No se crea una página separada `/medios`. El componente es un client component porque necesita interactividad (drag & drop, upload dialog).

**Alternatives considered**:
- Página separada `/panel/catalogo/[id]/medios` — posible pero fragmenta la edición; mejor mantener todo en una sola página con secciones
- Modal/drawer para toda la gestión — no escala para galerías grandes

## R-002: Upload de archivos — enfoque

**Decision**: El cliente envía el archivo como `FormData` a una server action (`uploadMediaAction`). La server action invoca `MediaService.uploadImage` que firma y sube a R2, luego crea el registro en `media_assets`. La server action devuelve el asset creado.

**Rationale**: El upload siempre desde servidor es regla arquitectónica (architecture.md §1). El cliente nunca tiene credenciales de R2. `FormData` es el estándar para uploads de archivos en Next.js Server Actions.

**Alternatives considered**:
- Presigned URL directa a R2 — viola la regla de "upload siempre desde servidor"
- Upload a filesystem local — no aplica, todo va a R2

## R-003: Drag & drop para reordenación

**Decision**: Reutilizar `@dnd-kit/sortable` (ya instalado en F012) para la reordenación de imágenes y planos.

**Rationale**: Misma librería que el editor de bloques, consistencia en la UX. Ya está en el proyecto, no añade dependencias nuevas.

**Alternatives considered**:
- Otra librería — inconsistencia, dependencia adicional innecesaria

## R-004: Validación de publicación

**Decision**: La validación de "al menos una imagen + alt_text en todos" se ejecuta en dos puntos:
1. **Cliente**: Al pulsar "Publicar", se verifica antes de enviar la request.
2. **Servidor**: En la route handler de publish (PATCH `/api/internal/promociones/[id]`), se verifica antes de aplicar status=PUBLISHED.

**Rationale**: Doble validación para robustez. La del cliente es UX (feedback inmediato), la del servidor es integridad de datos.

**Alternatives considered**:
- Solo cliente — insuficiente si se fuerza desde API
- Solo servidor — UX pobre, el operador no sabe hasta después de enviar

## R-005: Secciones separadas para galería y planos

**Decision**: El componente `<MediaGallery>` muestra dos secciones visuales:
1. **Galería**: Imágenes con `kind='IMAGE_GALLERY'`, con portada y reordenación.
2. **Planos**: Imágenes con `kind='PLAN'`, sin portada, con reordenación propia.

Cada sección tiene su propio botón "Subir" y su propia lista ordenable.

**Rationale**: El spec dice "categoría planos separada". La ficha pública (F021) los renderiza en columnas distintas, así que la separación en el backoffice refleja la estructura final.

**Alternatives considered**:
- Tabs — posible, pero las secciones apiladas son más simples y muestran todo de un vistazo
- Mezclar todo con filtros — confuso, el operador no ve la separación real
