# Feature Specification: Editorial Blocks Editor

**Feature Branch**: `feature/012-editorial-blocks-editor`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Editor de bloques estructurados (descripción, calidades, zonas comunes, ubicación, plazos) con Zod por block_type, constraint por kind, integrado en la edición de promoción existente."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y editar bloques editoriales (Priority: P1)

El operador accede a la sección "Bloques editoriales" dentro del formulario de edición de una promoción. Ve una lista de los bloques ya existentes (si los hay) ordenados por `sort_order`, y puede añadir nuevos bloques seleccionando el tipo (descripción general, memoria de calidades, zonas comunes, ubicación y servicios, plazos y garantías). Cada tipo de bloque muestra su propio formulario específico con los campos correspondientes. Al guardar, el payload se valida contra el schema Zod del `block_type` y se persiste en `promocion_content_blocks`.

**Why this priority**: Sin bloques editoriales la ficha pública no tiene contenido estructurado. Es el núcleo de esta feature y la base para el renderizado en F021.

**Independent Test**: Se puede verificar accediendo a `/panel/catalogo/[id]`, navegando a la sección de bloques, creando un bloque de cada tipo con datos válidos, guardando y recargando para confirmar persistencia.

**Acceptance Scenarios**:

1. **Given** el operador está en la edición de una promoción, **When** pulsa "Añadir bloque" y selecciona "Descripción general", **Then** aparece el formulario de descripción con un campo de texto enriquecido (negrita, cursiva, listas).
2. **Given** el operador rellena el formulario de descripción general y pulsa "Guardar", **When** el payload valida contra el schema Zod, **Then** el bloque se persiste con `block_type='DESCRIPCION_GENERAL'`, `sort_order` correcto y `updated_by` del usuario actual.
3. **Given** el operador añade un bloque "Memoria de calidades" con 3 ítems (icono, título, descripción), **When** guarda, **Then** los 3 ítems se persisten en el payload JSONB.
4. **Given** el operador edita un bloque existente, **When** modifica el contenido y guarda, **Then** el payload se actualiza y `updated_at` se refresca.
5. **Given** el operador pulsa "Eliminar" en un bloque, **When** confirma, **Then** el bloque se elimina de `promocion_content_blocks` y los `sort_order` restantes se reindexan.
6. **Given** el operador intenta guardar un bloque con datos inválidos (ej. título vacío en memoria de calidades), **When** el schema Zod rechaza el payload, **Then** se muestra un mensaje de error en el formulario indicando el campo inválido.

---

### User Story 2 - Restricción de bloques por kind (Priority: P1)

Los bloques `ZONAS_COMUNES` y `PLAZOS_GARANTIAS` solo son aplicables a promociones `kind='portfolio'`. Cuando la promoción es `kind='external'`, el sistema oculta estos tipos en el selector de "Añadir bloque", no los muestra si ya existen, y el backend rechaza cualquier intento de crearlos con un error de validación.

**Why this priority**: Es una regla de negocio crítica definida en product.md §6.5 y architecture.md §7.6. Debe funcionar desde el primer día tanto en UI como en backend.

**Independent Test**: Se puede verificar creando una promoción `kind='external'`, intentando añadir un bloque `ZONAS_COMUNES` desde la UI (no debe aparecer en el selector) y desde la API (debe devolver error 422).

**Acceptance Scenarios**:

1. **Given** la promoción es `kind='external'`, **When** el operador pulsa "Añadir bloque", **Then** el selector solo muestra "Descripción general", "Memoria de calidades" y "Ubicación y servicios" (no aparecen "Zonas comunes" ni "Plazos y garantías").
2. **Given** la promoción es `kind='portfolio'`, **When** el operador pulsa "Añadir bloque", **Then** el selector muestra los 5 tipos de bloque.
3. **Given** una promoción `kind='external'` tiene bloques `ZONAS_COMUNES` existentes (creados antes de un cambio de kind), **When** el operador accede a la sección de bloques, **Then** esos bloques no se muestran en la UI.
4. **Given** un consumidor API intenta crear un bloque `ZONAS_COMUNES` en una promoción `kind='external'`, **When** la request llega al servidor, **Then** el servicio rechaza la operación con error de validación (422) antes de intentar el INSERT.
5. **Given** la BD tiene un constraint CHECK que impide `ZONAS_COMUNES`/`PLAZOS_GARANTIAS` en promociones `kind='external'`, **When** se fuerza un INSERT directo violando el constraint, **Then** la BD rechaza la operación.

---

### User Story 3 - Reordenar bloques (Priority: P2)

El operador puede reordenar los bloques editoriales mediante drag & drop. El nuevo orden se persiste actualizando el `sort_order` de cada bloque en una transacción atómica. El orden se refleja en la lista del editor y, eventualmente, en el renderizado público de la ficha.

**Why this priority**: La reordenación es importante para el control editorial del contenido pero no bloquea la creación/edición base de bloques.

**Independent Test**: Se puede verificar creando 3+ bloques, reordenándolos por drag & drop, recargando la página y confirmando que el orden persiste.

**Acceptance Scenarios**:

1. **Given** una promoción tiene 3 bloques con sort_order 0, 1, 2, **When** el operador arrastra el bloque del fondo hasta la primera posición, **Then** los sort_order se actualizan a la nueva secuencia (0→nuevo, 1→viejo-0, 2→viejo-1).
2. **Given** el operador reordena bloques, **When** la operación se completa, **Then** se ejecuta en una transacción atómica que actualiza todos los sort_order de golpe.
3. **Given** el operador reordena y recarga la página, **When** vuelve a ver la lista, **Then** los bloques aparecen en el nuevo orden.

---

### User Story 4 - Validación Zod y bloqueo de publicación (Priority: P2)

El editor valida cada payload contra su schema Zod específico tanto en cliente como en servidor. Si un bloque tiene datos inválidos, el sistema impide guardar ese bloque. Además, el sistema bloquea publicar la promoción si algún bloque existente tiene un payload inválido (verificación al cambiar status a PUBLISHED).

**Why this priority**: La validación garantiza la integridad del contenido editorial. Es importante para la calidad del dato pero es una capa de protección sobre la creación/edición base.

**Independent Test**: Se puede verificar intentando guardar un bloque con campos obligatorios vacíos (error en cliente), y forzando un payload inválido vía API (error en servidor).

**Acceptance Scenarios**:

1. **Given** el operador rellena un bloque "Memoria de calidades" con un ítem sin título, **When** pulsa "Guardar", **Then** la validación Zod en cliente muestra error "El título es obligatorio" y no se envía la request.
2. **Given** un payload inválido llega al servidor (ej. vía API manipulada), **When** el schema Zod del servidor lo valida, **Then** devuelve error 422 con detalle del campo inválido.
3. **Given** una promoción tiene un bloque con payload inválido (corrupción de datos), **When** el operador intenta cambiar status a PUBLISHED, **Then** el sistema bloquea la publicación y muestra qué bloque tiene datos inválidos.

---

### Edge Cases

- ¿Qué ocurre si dos operadores editan el mismo bloque simultáneamente? Last-write-wins. No hay bloqueo pesimista. El `updated_by` refleja el último en guardar.
- ¿Qué ocurre si se elimina una promoción que tiene bloques? La eliminación es en cascada (FK onDelete: 'cascade' en `promocion_content_blocks`). Los bloques se eliminan automáticamente.
- ¿Qué ocurre si el operador cambia el kind de 'portfolio' a 'external' y ya existen bloques de zonas comunes o plazos? Los bloques existentes permanecen en la BD (no se borran), pero la UI los oculta. Si el operador vuelve a cambiar a 'portfolio', los bloques reaparecen.
- ¿Qué ocurre si no hay bloques de un tipo determinado? La UI muestra estado vacío ("Aún no has añadido ningún bloque de este tipo") con botón para crear el primero.
- ¿Qué ocurre con el constraint CHECK si la promoción aún no tiene kind asignado (promoción nueva sin kind)? El constraint se evalúa en INSERT/UPDATE del bloque. Si la promoción no tiene kind, el constraint no se viola (solo bloquea cuando kind='external').

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir crear bloques editoriales de los 5 tipos definidos (DESCRIPCION_GENERAL, MEMORIA_CALIDADES, ZONAS_COMUNES, UBICACION_SERVICIOS, PLAZOS_GARANTIAS) asociados a una promoción.
- **FR-002**: El sistema MUST validar el payload de cada bloque contra su schema Zod específico tanto en cliente como en servidor.
- **FR-003**: El sistema MUST rechazar la creación de bloques ZONAS_COMUNES o PLAZOS_GARANTIAS en promociones kind='external' (validación en servicio + constraint en BD).
- **FR-004**: El sistema MUST ocultar los bloques ZONAS_COMUNES y PLAZOS_GARANTIAS en la UI cuando la promoción es kind='external'.
- **FR-005**: El sistema MUST permitir reordenar bloques mediante drag & drop, actualizando sort_order en transacción atómica.
- **FR-006**: El sistema MUST permitir eliminar bloques, reindexando sort_order tras la eliminación.
- **FR-007**: El sistema MUST persistir updated_by (usuario que modifica) y updated_at en cada operación de escritura.
- **FR-008**: El sistema MUST bloquear la publicación de una promoción si algún bloque existente tiene payload inválido según su schema Zod.
- **FR-009**: El sistema MUST mostrar formularios específicos por tipo de bloque con los campos definidos en el schema Zod correspondiente.
- **FR-010**: El sistema MUST cargar y mostrar los bloques existentes al acceder a la edición de una promoción, ordenados por sort_order.
- **FR-011**: El sistema MUST integrar la sección de bloques editoriales dentro del formulario de edición de promoción existente (F011).
- **FR-012**: El sistema MUST respetar el aislamiento multi-tenant en todas las operaciones de bloques (tenant_id en queries y mutations).

### Key Entities

- **Bloque editorial de promoción**: Contenido estructurado asociado a una promoción. Atributos: tipo de bloque (enum cerrado de 5 valores), payload (JSONB validado por Zod según tipo), orden de visualización (sort_order), autor de última modificación, timestamp.
- **Payload por tipo**: DESCRIPCION_GENERAL → texto con formato limitado. MEMORIA_CALIDADES → lista de ítems (icono, título, descripción). ZONAS_COMUNES → lista de ítems (nombre, descripción). UBICACION_SERVICIOS → lista de distancias (servicio, distancia). PLAZOS_GARANTIAS → entrega estimada, licencias, aval, auditoría.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El operador puede crear un bloque editorial de cualquier tipo en menos de 1 minuto desde la edición de la promoción.
- **SC-002**: El 100% de los payloads inválidos son rechazados tanto en cliente como en servidor — verificable con tests automatizados.
- **SC-003**: Los bloques ZONAS_COMUNES y PLAZOS_GARANTIAS son inaccesibles en promociones kind='external' — el selector UI no los muestra y el backend rechaza intentos con error 422.
- **SC-004**: La reordenación de bloques persiste correctamente tras recargar la página — verificable con test E2E.
- **SC-005**: El constraint CHECK en BD impide INSERT de bloques restringidos en promociones external — verificable con test de integración que intente violar el constraint.
- **SC-006**: Los bloques existentes se cargan y muestran en el orden correcto (sort_order) al acceder a la edición.
- **SC-007**: La publicación se bloquea si hay bloques con payload inválido — el operador recibe mensaje claro indicando qué bloque falla.

## Assumptions

- La tabla `promocion_content_blocks` ya existe con el schema definido en F002 (id, tenant_id, promocion_id, block_type, payload JSONB, sort_order, updated_by, updated_at).
- Los schemas Zod para cada tipo de bloque ya están definidos en `src/shared/types/content-block-schema.ts`.
- El enum `CONTENT_BLOCK_TYPES` ya está definido en `src/shared/constants/db-enums.ts`.
- El repositorio `PromocionRepository` ya tiene el método `findContentBlock` para lectura. Los métodos de escritura (create, update, delete, reorder) se implementan en esta feature.
- El formulario de edición de promoción (F011) ya existe en `app/(auth)/panel/catalogo/[id]/page.tsx`. La sección de bloques se integra como un nuevo componente dentro de esa página.
- La sesión de Auth.js ya está funcional y devuelve tenant_id, user_id y role.
- El TenantContext (AuthenticatedContext) ya está implementado en F004.
- Los datos demo del seed (F009) incluyen bloques editoriales demo para las 8 promociones.
- El renderizado público de los bloques en la ficha de detalle NO es parte de esta feature (se implementa en F021).
- La migración para añadir el constraint CHECK por kind se incluye en esta feature.
