# Feature Specification: Media Gallery Backoffice

**Feature Branch**: `feature/013-media-gallery-backoffice`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Upload server-side a R2, reordenar galería drag & drop, marcar portada, alt_text obligatorio, categoría planos separada, integrado en la edición de promoción existente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir y gestionar imágenes de galería (Priority: P1)

El operador accede a la sección "Medios" dentro del formulario de edición de una promoción. Puede subir imágenes individuales: el cliente envía el binario a un endpoint interno, el servidor lo firma y almacena en R2, y crea el registro en `media_assets` con `kind='IMAGE_GALLERY'`. Cada imagen requiere un texto alternativo (`alt_text`) obligatorio — el sistema rechaza la subida si está vacío. Las imágenes se muestran en una galería ordenada por `sort_order`. El operador puede reordenar las imágenes mediante drag & drop, y marcar una como portada (`is_cover = true`). Solo una imagen puede ser portada por promoción (constraint parcial UNIQUE). El operador puede eliminar imágenes de la galería.

**Why this priority**: Sin galería de imágenes, la ficha pública no tiene contenido visual. Es el núcleo de esta feature y la base para el renderizado en F021.

**Independent Test**: Se puede verificar accediendo a `/panel/catalogo/[id]/medios`, subiendo una imagen con alt_text, reordenando, marcando portada, y eliminando.

**Acceptance Scenarios**:

1. **Given** el operador está en la edición de una promoción, **When** navega a la sección "Medios" y pulsa "Subir imagen", **Then** aparece un diálogo para seleccionar archivo y rellenar alt_text.
2. **Given** el operador selecciona una imagen y rellena alt_text, **When** pulsa "Subir", **Then** el servidor almacena en R2, crea el registro en `media_assets` con `kind='IMAGE_GALLERY'` y `sort_order` siguiente, y la imagen aparece en la galería.
3. **Given** el operador intenta subir una imagen sin alt_text, **When** pulsa "Subir", **Then** el sistema rechaza la operación y muestra error "El texto alternativo es obligatorio".
4. **Given** la galería tiene 3 imágenes, **When** el operador arrastra la tercera a la primera posición, **Then** los `sort_order` se reasignan atómicamente y la galería muestra el nuevo orden.
5. **Given** la galería tiene 3 imágenes, **When** el operador marca una como portada, **Then** esa imagen tiene `is_cover = true` y las demás tienen `is_cover = false` (solo una portada por promoción).
6. **Given** el operador pulsa "Eliminar" en una imagen, **When** confirma, **Then** la imagen se elimina de R2 y de `media_assets`, y los `sort_order` restantes se reindexan.
7. **Given** una promoción no tiene imágenes, **When** el operador intenta publicar, **Then** el sistema bloquea la publicación y muestra error "Debe subir al menos una imagen".

---

### User Story 2 - Gestionar planos (categoría separada) (Priority: P1)

El operador puede subir planos de la promoción como `kind='PLAN'`. Los planos aparecen en una sección separada de la galería principal de imágenes. Cada plano también requiere `alt_text` obligatorio. Los planos se pueden reordenar y eliminar, pero no se marcan como portada (la portada es siempre una imagen de galería).

**Why this priority**: Los planos son contenido visual importante para la ficha pública, pero son distintos de las fotos de galería. Deben aparecer en columna separada (F021).

**Independent Test**: Se puede verificar subiendo un plano, confirmando que aparece en sección separada de la galería, y verificando que `kind='PLAN'` en `media_assets`.

**Acceptance Scenarios**:

1. **Given** el operador está en la sección "Medios", **When** pulsa "Subir plano", **Then** aparece un diálogo para seleccionar archivo y rellenar alt_text.
2. **Given** el operador selecciona un plano y rellena alt_text, **When** pulsa "Subir", **Then** el servidor almacena en R2, crea el registro en `media_assets` con `kind='PLAN'`, y el plano aparece en la sección de planos (separada de la galería).
3. **Given** la sección de planos tiene 2 planos, **When** el operador los reordena, **Then** los `sort_order` se actualizan y el nuevo orden persiste.
4. **Given** un plano existe, **When** el operador lo elimina, **Then** el plano se elimina de R2 y de `media_assets`.
5. **Given** un plano está seleccionado, **When** el operador intenta marcarlo como portada, **Then** la opción no está disponible (solo imágenes de galería pueden ser portada).

---

### User Story 3 - Bloqueo de publicación por medios incompletos (Priority: P2)

El sistema bloquea publicar la promoción si falta `alt_text` en alguna imagen o plano, o si no hay al menos una imagen de galería. La validación se ejecuta tanto en cliente (al pulsar "Publicar") como en servidor (en el route handler de publish).

**Why this priority**: Es una regla de accesibilidad y calidad de contenido (WCAG AA, constitution.md §6). Importante pero no bloquea la subida/gestión base de medios.

**Independent Test**: Se puede verificar intentando publicar una promoción sin imágenes (bloqueo), y con una imagen sin alt_text (bloqueo).

**Acceptance Scenarios**:

1. **Given** una promoción no tiene imágenes de galería, **When** el operador pulsa "Publicar", **Then** el sistema bloquea la publicación y muestra error "Debe subir al menos una imagen de galería".
2. **Given** una promoción tiene una imagen sin alt_text, **When** el operador pulsa "Publicar", **Then** el sistema bloquea la publicación y muestra error "Todas las imágenes deben tener texto alternativo".
3. **Given** una promoción tiene un plano sin alt_text, **When** el operador pulsa "Publicar", **Then** el sistema bloquea la publicación y muestra error "Todos los planos deben tener texto alternativo".
4. **Given** una promoción tiene al menos una imagen con alt_text y todos los planos con alt_text, **When** el operador pulsa "Publicar", **Then** la publicación se ejecuta normalmente.

---

### Edge Cases

- ¿Qué ocurre si dos operadores suben imágenes simultáneamente? Cada subida es independiente. Los `sort_order` se calculan atómicamente en el servidor (MAX(sort_order) + 1 en transacción).
- ¿Qué ocurre si se elimina la imagen que era portada? La portada queda sin asignar (`is_cover = NULL` para todas). El operador debe marcar una nueva portada antes de publicar.
- ¿Qué ocurre si el upload a R2 falla? El servidor devuelve error, no se crea el registro en `media_assets`, y el operador puede reintentar.
- ¿Qué ocurre si el operador marca una segunda imagen como portada? La anterior pierde `is_cover = true` (solo una portada por promoción, garantizado por constraint parcial UNIQUE + lógica de servicio).
- ¿Qué ocurre con los planos si la promoción se elimina? La eliminación es en cascada (FK onDelete: 'cascade'). Los planos se eliminan automáticamente de `media_assets` y de R2.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir subir imágenes de galería (`kind='IMAGE_GALLERY'`) asociadas a una promoción, almacenándolas en R2 vía `MediaService`.
- **FR-002**: El sistema MUST permitir subir planos (`kind='PLAN'`) asociados a una promoción, almacenándolos en R2 vía `MediaService`.
- **FR-003**: El sistema MUST requerir `alt_text` obligatorio para cada imagen y plano subidos. El sistema rechaza la subida si `alt_text` está vacío.
- **FR-004**: El sistema MUST permitir reordenar imágenes de galería mediante drag & drop, actualizando `sort_order` en transacción atómica.
- **FR-005**: El sistema MUST permitir reordenar planos, actualizando `sort_order` en transacción atómica.
- **FR-006**: El sistema MUST permitir marcar una imagen de galería como portada (`is_cover = true`). Solo una imagen puede ser portada por promoción.
- **FR-007**: El sistema MUST permitir eliminar imágenes y planos, eliminando el archivo de R2 y el registro de `media_assets`.
- **FR-008**: El sistema MUST mostrar imágenes y planos en secciones separadas dentro de la interfaz de gestión de medios.
- **FR-009**: El sistema MUST bloquear la publicación de una promoción si no hay al menos una imagen de galería.
- **FR-010**: El sistema MUST bloquear la publicación de una promoción si alguna imagen o plano tiene `alt_text` vacío.
- **FR-011**: El sistema MUST previsualizar imágenes y planos con el componente `MediaImage` (F006).
- **FR-012**: El sistema MUST integrar la sección de medios dentro del formulario de edición de promoción existente (F011).
- **FR-013**: El sistema MUST respetar el aislamiento multi-tenant en todas las operaciones de medios (tenant_id en queries y mutations).
- **FR-014**: El sistema MUST validar los payloads con el mismo schema Zod en cliente y servidor.

### Key Entities

- **Imagen de galería**: Asset de tipo `IMAGE_GALLERY` asociado a una promoción. Atributos: archivo en R2, alt_text (obligatorio), sort_order, is_cover (único por promoción), tenant_id, owner_id (promocion_id).
- **Plano**: Asset de tipo `PLAN` asociado a una promoción. Atributos: archivo en R2, alt_text (obligatorio), sort_order, tenant_id, owner_id (promocion_id).
- **Portada**: Imagen de galería con `is_cover = true`. Solo una por promoción (constraint parcial UNIQUE).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El operador puede subir una imagen con alt_text en menos de 30 segundos.
- **SC-002**: El 100% de las imágenes y planos subidos tienen `alt_text` no vacío — verificable con test automatizado.
- **SC-003**: La reordenación de imágenes y planos persiste correctamente tras recargar la página — verificable con test E2E.
- **SC-004**: Solo una imagen puede ser portada por promoción — el constraint parcial UNIQUE impide múltiples portadas.
- **SC-005**: La publicación se bloquea si falta alt_text o si no hay imágenes de galería — el operador recibe mensaje claro.
- **SC-006**: Las imágenes y planos aparecen en secciones separadas dentro de la interfaz de medios.
- **SC-007**: La eliminación de imágenes y planos elimina el archivo de R2 y el registro de `media_assets` en una transacción atómica.

## Assumptions

- La tabla `media_assets` ya existe con el schema definido en F002 (id, tenant_id, owner_id, owner_type, kind, url, alt_text, sort_order, is_cover, created_at, updated_at).
- El `MediaService` ya está implementado en F006 con métodos `uploadImage`, `signedReadUrl`, `reorderGallery`, `setCover`, `delete`.
- El componente `MediaImage` ya está implementado en F006 y se usa para previsualización.
- El formulario de edición de promoción (F011) ya existe en `app/(auth)/panel/catalogo/[id]/page.tsx`. La sección de medios se integra como un nuevo componente dentro de esa página (o en una sub-página `/medios`).
- El constraint parcial UNIQUE `(tenant_id, owner_id) WHERE is_cover = true` ya existe en el schema de `media_assets` (definido en F002).
- La sesión de Auth.js ya está funcional y devuelve tenant_id, user_id y role.
- El TenantContext (AuthenticatedContext) ya está implementado en F004.
- Los datos demo del seed (F009) incluyen media_assets demo para las 8 promociones.
- El renderizado público de la galería en la ficha de detalle NO es parte de esta feature (se implementa en F021).
- La subida múltiple batch no se implementa en esta feature (solo individual).
- Los documentos (`kind='DOCUMENT'`) no se implementan en esta feature.
