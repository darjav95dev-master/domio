# Feature Specification: Catalog Management

**Feature Branch**: `feature/011-catalog-management`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "CRUD completo de promociones, tipologías y unidades desde el backoffice. Slugs deterministas, autoguardado de borrador, histórico de cambios, filtros, validación zod, revalidación ISR."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listar y filtrar promociones (Priority: P1)

El operador o administrador entra en la sección Catálogo del backoffice y ve un listado de todas las promociones del tenant. Puede filtrar por estado comercial (DRAFT, PUBLISHED, RESERVED, SOLD, RENTED, WITHDRAWN), kind (portfolio/external), ubicación (isla, municipio), agente asignado y estado de obra (ON_PLAN, IN_CONSTRUCTION, READY). Cada fila muestra nombre, tipo, operación, estado, kind, municipio y agente. Desde el listado puede crear una promoción nueva o entrar en la edición de una existente.

**Why this priority**: Sin listado no hay punto de entrada al CRUD. Es la primera interacción del operador con el catálogo y la base desde la que se disparan todas las demás acciones.

**Independent Test**: Se puede verificar accediendo a `/panel/catalogo`, viendo las promociones del seed y aplicando cada filtro. Entregable mínimo: listado + filtros + navegación a edición/creación.

**Acceptance Scenarios**:

1. **Given** el usuario es OPERATOR autenticado, **When** accede a `/panel/catalogo`, **Then** ve el listado de todas las promociones del tenant con nombre, tipo, operación, estado, kind, municipio y agente asignado.
2. **Given** el listado muestra 8 promociones (seed), **When** filtra por kind=portfolio, **Then** solo se muestran las 4 promociones de tipo portfolio.
3. **Given** el listado muestra 8 promociones, **When** filtra por estado=DRAFT, **Then** solo se muestran las promociones en borrador.
4. **Given** el usuario es AGENT autenticado, **When** accede a `/panel/catalogo`, **Then** solo ve las promociones que tiene asignadas.
5. **Given** el usuario está en el listado, **When** pulsa "Nueva promoción", **Then** el sistema crea un borrador vacío y redirige al formulario de edición.
6. **Given** el usuario está en el listado, **When** pulsa sobre una promoción existente, **Then** navega al formulario de edición de esa promoción.

---

### User Story 2 - Crear y editar una promoción (Priority: P1)

El operador crea una promoción nueva o edita una existente desde un formulario organizado en secciones: **Identidad** (nombre, tipo de producto, operación, kind), **Estado comercial** (status, construction_status con warning suave si contradice plazos de entrega), **Ubicación** (isla, municipio, dirección, coordenadas, modo de privacidad del mapa), **SEO** (título y meta descripción opcionales), y **Agente asignado**. Dentro de la promoción puede gestionar tipologías (añadir, editar, eliminar) y unidades (añadir, editar, eliminar). Al guardar como publicado, el sistema genera el slug determinista si es la primera publicación. Al guardar como borrador, solo actualiza los campos sin generar slug.

**Why this priority**: Es el núcleo del CRUD. Sin formulario de edición no hay forma de crear ni mantener el catálogo.

**Independent Test**: Se puede verificar creando una promoción desde cero, rellenando las secciones, guardando como borrador, y luego publicando. El slug se genera solo al publicar.

**Acceptance Scenarios**:

1. **Given** el operador pulsa "Nueva promoción", **When** rellena nombre, tipo, operación, kind, ubicación y agente, **When** guarda como borrador, **Then** la promoción se persiste con status=DRAFT y slug vacío.
2. **Given** el operador edita una promoción en DRAFT, **When** cambia status a PUBLISHED y guarda, **Then** el sistema genera el slug determinista desde (tipo, operación, municipio, dormitorios, id_corto) y lo persiste.
3. **Given** una promoción ya publicada con slug generado, **When** el operador cambia el nombre y guarda, **Then** el slug NO cambia (es persistente e inmutable tras la primera publicación).
4. **Given** el operador marca construction_status=ON_PLAN pero el bloque plazos_garantias tiene entrega_estimada en el pasado, **When** guarda, **Then** el sistema muestra un warning suave no bloqueante y permite guardar.
5. **Given** el operador rellena seo_title y seo_description, **When** guarda, **Then** esos valores se persisten tal cual.
6. **Given** el operador deja seo_title y seo_description vacíos, **When** guarda, **Then** los campos se persisten como NULL (el fallback determinista se aplicará en la superficie pública, fuera del alcance de esta feature).
7. **Given** el operador añade una tipología con dormitorios, superficies y precios, **When** guarda, **Then** la tipología se persiste asociada a la promoción.
8. **Given** el operador añade unidades dentro de una tipología, **When** guarda, **Then** las unidades se persisten con estado AVAILABLE por defecto.

---

### User Story 3 - Autoguardado de borrador (Priority: P2)

Mientras el operador edita una promoción, el sistema guarda automáticamente el estado del formulario cada 30 segundos en un campo de borrador independiente (draft_payload). Si el navegador se cierra o se recarga la página, al volver a abrir la edición el formulario se restaura desde el borrador. El autoguardado nunca modifica los campos publicados de la promoción. Al publicar, el borrador se aplica y se limpia. Al descartar explícitamente, el borrador se pone a NULL.

**Why this priority**: Protege el trabajo del operador frente a cierres accidentales. Es una mejora de UX crítica para una herramienta de uso diario, pero no bloquea el CRUD base.

**Independent Test**: Se puede verificar editando una promoción, esperando 30s, recargando la página y confirmando que los cambios no guardados se restauran.

**Acceptance Scenarios**:

1. **Given** el operador está editando una promoción y modifica campos, **When** pasan 30 segundos, **Then** el sistema envía PATCH /api/internal/promociones/:id/draft con el estado actual del formulario y actualiza draft_payload.
2. **Given** el operador tiene cambios sin guardar en el formulario, **When** recarga la página, **Then** el formulario se restaura desde draft_payload y se indica visualmente que se están mostrando datos del borrador.
3. **Given** el operador pulsa "Publicar", **When** la publicación es exitosa, **Then** draft_payload se aplica a los campos publicados y se pone a NULL.
4. **Given** el operador pulsa "Descartar borrador", **When** confirma, **Then** draft_payload se pone a NULL y el formulario muestra los últimos campos publicados.
5. **Given** una promoción publicada con campos existentes, **When** el operador edita y autoguarda sin publicar, **Then** los campos publicados NO se modifican — solo draft_payload cambia.

---

### User Story 4 - Histórico de cambios (Priority: P2)

Cada vez que se modifica una promoción publicada, el sistema registra en el histórico inmutable qué campo cambió, el valor anterior, el valor nuevo, quién lo hizo y cuándo. El operador puede consultar el histórico desde la edición de la promoción. El histórico es de solo lectura — nadie puede modificarlo ni borrarlo.

**Why this priority**: Trazabilidad y auditoría. Importante para equipo, pero no bloquea el flujo principal de edición.

**Independent Test**: Se puede verificar editando una promoción publicada (cambiando precio, nombre, estado), y luego consultando el histórico para ver los registros generados.

**Acceptance Scenarios**:

1. **Given** una promoción publicada, **When** el operador cambia el nombre y guarda, **Then** se inserta una fila en promocion_history con field='name', old_value, new_value, author_id y timestamp.
2. **Given** una promoción publicada, **When** el operador cambia múltiples campos en un solo guardado, **Then** se inserta una fila por cada campo modificado.
3. **Given** el operador consulta el histórico de una promoción, **When** lo visualiza, **Then** ve la lista cronológica de cambios con autor, campo, valor anterior y nuevo.
4. **Given** cualquier usuario (incluido ADMIN), **When** intenta actualizar o borrar una fila del histórico, **Then** la operación falla (política RLS inmutable).

---

### User Story 5 - Revalidación ISR tras guardar (Priority: P3)

Cuando el operador guarda una promoción (borrador o publicado), el sistema dispara la revalidación incremental de la ficha pública (`revalidateTag('promocion:{slug}')`) y del catálogo (`revalidateTag('catalog')`). Esto asegura que los cambios en el backoffice se reflejan en las superficies públicas sin necesidad de redeploy.

**Why this priority**: Es una propiedad de consistencia importante pero solo es observable cuando existen superficies públicas que consumen los datos (F019-F021 aún no implementadas). Se implementa para dejar la infraestructura lista.

**Independent Test**: Se puede verificar que al guardar una promoción publicada, se invoca `revalidateTag` con las tags correctas (verificable por log o test unitario del handler).

**Acceptance Scenarios**:

1. **Given** una promoción publicada con slug generado, **When** el operador guarda cambios, **Then** se dispara `revalidateTag('promocion:{slug}')` y `revalidateTag('catalog')`.
2. **Given** una promoción en borrador sin slug, **When** el operador guarda, **Then** solo se dispara `revalidateTag('catalog')` (no hay slug para revalidar).

---

### Edge Cases

- ¿Qué ocurre si dos operadores editan la misma promoción simultáneamente? El último guardado gana (last-write-wins). El autoguardado de borrador es por-usuario (draft_payload se sobrescribe). No hay bloqueo pesimista.
- ¿Qué ocurre si el slug generado colisiona con uno existente? La función determinista incluye un id_corto único, por lo que la colisión es extremadamente improbable. Si ocurriera, el constraint UNIQUE (tenant_id, slug) en BD rechazará la inserción y el sistema mostrará error al operador.
- ¿Qué ocurre si el operador intenta publicar sin nombre, tipo o ubicación? La validación Zod rechaza el guardado y muestra los campos con error. No se genera slug ni se publica.
- ¿Qué ocurre si un AGENT intenta editar una promoción que no tiene asignada? El sistema deniega el acceso (scope por rol + RLS).
- ¿Qué ocurre si se elimina una promoción que tiene tipologías y unidades? La eliminación es en cascada (FK onDelete: 'cascade'). Se registra en el histórico antes de borrar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear, leer, actualizar y eliminar promociones, tipologías y unidades desde el backoffice.
- **FR-002**: El sistema MUST generar slugs deterministas desde (tipo, operación, municipio, dormitorios, id_corto) al publicar una promoción por primera vez.
- **FR-003**: El sistema MUST garantizar que el slug de una promoción publicada nunca cambia en ediciones posteriores.
- **FR-004**: El sistema MUST autoguardar el borrador del formulario cada 30 segundos en un campo independiente (draft_payload) sin modificar los campos publicados.
- **FR-005**: El sistema MUST registrar cada cambio en una promoción publicada en el histórico inmutable (promocion_history), con campo, valor anterior, valor nuevo, autor y timestamp.
- **FR-006**: El sistema MUST validar los payloads con el mismo schema Zod en cliente y servidor.
- **FR-007**: El sistema MUST mostrar un warning suave no bloqueante cuando construction_status contradice la entrega_estimada del bloque plazos_garantias.
- **FR-008**: El sistema MUST permitir filtrar el listado de promociones por estado, kind, ubicación (isla, municipio), agente asignado y construction_status.
- **FR-009**: El sistema MUST disparar revalidación ISR (revalidateTag) al guardar una promoción.
- **FR-010**: El sistema MUST respetar los scopes por rol: AGENT solo ve y edita sus promociones asignadas; OPERATOR y ADMIN ven todo el catálogo del tenant.
- **FR-011**: El sistema MUST permitir al operador aplicar el borrador guardado como versión publicada (publicar desde borrador) o descartarlo.
- **FR-012**: El sistema MUST persistir todas las operaciones de escritura en transacciones con SET LOCAL app.current_tenant_id (multi-tenant DNA).
- **FR-013**: El sistema MUST permitir gestionar tipologías anidadas dentro de la edición de promoción (añadir, editar, eliminar).
- **FR-014**: El sistema MUST permitir gestionar unidades anidadas dentro de cada tipología (añadir, editar, eliminar).

### Key Entities

- **Promoción**: Unidad principal del catálogo. Atributos: nombre, slug, kind (portfolio/external), status (DRAFT/PUBLISHED/RESERVED/SOLD/RENTED/WITHDRAWN), operation (SALE/RENT/SALE_AND_RENT), property_type, construction_status (ON_PLAN/IN_CONSTRUCTION/READY), ubicación (isla, municipio, dirección, coordenadas, map_privacy_mode), SEO (seo_title, seo_description), agente asignado, draft_payload.
- **Tipología**: Variante de vivienda dentro de una promoción. Atributos: nombre, superficies (útil, construida), composición (dormitorios, baños, plantas), año, certificado energético, precios (venta, alquiler), gastos de comunidad, fianza, amenities (set cerrado), plano asociado.
- **Unidad**: Vivienda concreta dentro de una tipología. Atributos: identificador, estado (AVAILABLE/RESERVED/SOLD/RENTED).
- **Histórico de promoción**: Registro inmutable de cambios. Atributos: promoción, campo, valor anterior, valor nuevo, autor, timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El operador puede crear una promoción nueva con tipología y unidades en menos de 5 minutos.
- **SC-002**: El operador puede listar y filtrar el catálogo completo en menos de 2 segundos tras aplicar un filtro.
- **SC-003**: El autoguardado de borrador sobrevive a un refresco del navegador — el 100% de los cambios no guardados en los últimos 30 segundos se restauran.
- **SC-004**: El slug de una promoción publicada no cambia tras renombrar la promoción — verificable con test automatizado.
- **SC-005**: El histórico registra el 100% de los cambios en promociones publicadas sin excepciones.
- **SC-006**: La validación Zod rechaza el 100% de los payloads inválidos tanto en cliente como en servidor.
- **SC-007**: El listado con filtros funciona correctamente para agentes que solo ven sus promociones asignadas (aislamiento verificado por test).

## Assumptions

- Las tablas de BD (promociones, tipologias, unidades, promocion_history) ya existen con el schema definido en F002 y las migraciones aplicadas.
- Las constantes de dominio (PROPERTY_TYPES, PROMOCION_STATUSES, OPERATION_TYPES, CONSTRUCTION_STATUSES, etc.) ya están definidas en shared/constants/db-enums.ts.
- El backoffice shell (sidebar, auth guard, layout) ya está implementado en F010.
- El TenantContext (AuthenticatedContext, TenantAwareRepository) ya está implementado en F004.
- La sesión de Auth.js ya está funcional y devuelve tenant_id, user_id y role.
- Los datos demo del seed (F009) incluyen promociones, tipologías y unidades para pruebas.
- La gestión de imágenes y bloques editoriales se implementa en features posteriores (F012, F013) — esta feature no las incluye.
- La revalidación ISR se implementa con `revalidateTag` de Next.js, pero las superficies públicas que consumen las tags aún no existen (F019-F021).
- El fallback determinista de SEO se implementa en F025 — esta feature solo persiste los campos opcionales seo_title y seo_description.
