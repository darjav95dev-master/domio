# Feature Specification: global-content-editor

**Feature Branch**: `feature/017-global-content-editor`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Editor de contenidos comerciales globales (home, sobre, equipo, legales), configuración de contacto global, historial versionado con capacidad de revertir a versiones anteriores."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edición de bloques de contenido global (Priority: P1)

Un usuario con rol ADMIN u OPERATOR accede a `/panel/contenidos` y ve una interfaz organizada por páginas (home, sobre, equipo, aviso-legal, privacidad, cookies). Al seleccionar una página, el sistema muestra los bloques de contenido existentes para esa página, cada uno con su formulario estructurado específico según el tipo de bloque. El usuario puede editar los campos de cada bloque, guardar los cambios, y ver un Toast de confirmación. Si no hay bloques para una página, se muestra un estado vacío compuesto con opción de crear el primer bloque.

**Why this priority**: Sin la capacidad de editar contenidos globales, las páginas públicas muestran contenido estático hardcodeado y no pueden actualizarse sin redeploy. Es el núcleo de la feature.

**Independent Test**: Se puede probar accediendo a `/panel/contenidos`, seleccionando la página "home", editando un bloque (por ejemplo, el hero claim), guardando, y verificando que el cambio se persiste en la base de datos y se refleja en la página pública tras revalidación ISR.

**Acceptance Scenarios**:

1. **Given** un usuario con rol ADMIN u OPERATOR autenticado, **When** navega a `/panel/contenidos`, **Then** ve una lista de páginas editables (home, sobre, equipo, aviso-legal, privacidad, cookies).
2. **Given** una página con bloques existentes, **When** el usuario selecciona esa página, **Then** ve los bloques con sus formularios estructurados cargados con los datos actuales.
3. **Given** una página sin bloques, **When** el usuario selecciona esa página, **Then** ve un estado vacío compuesto con mensaje "Aún no hay contenido para esta página" y botón "Crear primer bloque".
4. **Given** un usuario editando un bloque, **When** modifica campos y hace clic en "Guardar", **Then** el sistema persiste los cambios, muestra Toast "Contenido guardado correctamente", y dispara revalidación ISR de la página afectada.
5. **Given** un usuario con rol AGENT, **When** intenta acceder a `/panel/contenidos`, **Then** es redirigido a `/panel` (dashboard) con mensaje de acceso denegado.
6. **Given** un bloque con payload JSONB, **When** el usuario envía el formulario, **Then** el sistema valida el payload contra el schema Zod específico del block_key y rechaza payloads inválidos con mensaje de error claro.

---

### User Story 2 - Configuración de contacto global (Priority: P1)

Un usuario con rol ADMIN u OPERATOR accede a `/panel/contenidos/contacto` y ve un formulario con los campos de configuración de contacto global: teléfono, email, dirección, horario, número de WhatsApp, mensaje predefinido de WhatsApp. El usuario puede editar estos campos y guardar. Los cambios se reflejan en cabecera, footer y fichas de detalle de la web pública tras revalidación.

**Why this priority**: La configuración de contacto es crítica para la conversión (formularios, WhatsApp, footer). Sin ella, los datos de contacto están hardcodeados y no pueden actualizarse dinámicamente.

**Independent Test**: Se puede probar accediendo a `/panel/contenidos/contacto`, modificando el número de teléfono, guardando, y verificando que el nuevo número aparece en el footer público y en la página de contacto tras revalidación ISR.

**Acceptance Scenarios**:

1. **Given** un usuario con rol ADMIN u OPERATOR autenticado, **When** navega a `/panel/contenidos/contacto`, **Then** ve un formulario con los campos: teléfono, email, dirección, horario, número de WhatsApp, mensaje predefinido de WhatsApp.
2. **Given** que ya existe configuración de contacto para el tenant, **When** el usuario accede a la página, **Then** el formulario se precarga con los valores actuales.
3. **Given** que no existe configuración de contacto para el tenant, **When** el usuario accede a la página, **Then** el formulario está vacío con placeholders descriptivos.
4. **Given** un usuario editando la configuración, **When** modifica campos y hace clic en "Guardar", **Then** el sistema persiste los cambios (INSERT si no existía, UPDATE si existía), muestra Toast "Configuración de contacto guardada", y dispara revalidación ISR de las páginas que consumen estos datos.
5. **Given** un usuario con rol AGENT, **When** intenta acceder a `/panel/contenidos/contacto`, **Then** es redirigido a `/panel` con mensaje de acceso denegado.
6. **Given** la configuración de contacto guardada, **When** se renderiza el footer público, **Then** muestra el teléfono, email y dirección actuales desde `contact_config`.

---

### User Story 3 - Historial versionado y revert (Priority: P2)

Un usuario con rol ADMIN u OPERATOR accede al historial de cualquier bloque de contenido o de la configuración de contacto. Ve una lista cronológica de versiones anteriores con timestamp, autor, y preview del contenido. Puede seleccionar cualquier versión histórica y revertir el contenido actual a esa versión con un clic confirmado. Cada cambio (edición o revert) genera una nueva entrada en el historial.

**Why this priority**: El historial versionado es esencial para la seguridad editorial: permite recuperar contenido anterior tras errores o cambios no deseados. Es menos crítico que la edición en sí, pero necesario para producción.

**Independent Test**: Se puede probar editando un bloque de contenido, guardando, editando nuevamente, guardando, accediendo al historial, viendo las dos versiones, y revirtiendo a la primera versión. Verificar que el contenido actual vuelve al estado de la primera versión y que se genera una nueva entrada en el historial.

**Acceptance Scenarios**:

1. **Given** un bloque de contenido con historial, **When** el usuario accede a la vista de historial del bloque, **Then** ve una lista cronológica (más reciente primero) de versiones con timestamp, nombre del autor, y preview del payload.
2. **Given** un usuario en la vista de historial, **When** selecciona una versión anterior y hace clic en "Revertir a esta versión", **Then** el sistema muestra un diálogo de confirmación "¿Revertir a la versión del [timestamp]? Esta acción creará una nueva versión en el historial."
3. **Given** un usuario confirmando el revert, **When** acepta, **Then** el sistema crea una nueva entrada en `content_history` con el payload de la versión seleccionada, actualiza `content_blocks` con ese payload, muestra Toast "Contenido revertido correctamente", y dispara revalidación ISR.
4. **Given** la configuración de contacto con historial, **When** el usuario accede al historial, **Then** ve las versiones anteriores de la configuración con timestamp y autor.
5. **Given** un usuario revirtiendo la configuración de contacto, **When** confirma el revert, **Then** el sistema actualiza `contact_config` con los valores de la versión seleccionada y genera nueva entrada en `content_history`.
6. **Given** que `content_history` es inmutable (RLS impide UPDATE/DELETE), **When** se intenta modificar una entrada histórica, **Then** la operación falla silenciosamente (la política RLS bloquea).

---

### Edge Cases

- ¿Qué ocurre si dos usuarios editan el mismo bloque simultáneamente? El último en guardar sobrescribe los cambios del primero (no hay merge conflict resolution). Se muestra Toast de confirmación al que guarda.
- ¿Qué ocurre si el payload JSONB excede el límite de tamaño de PostgreSQL (1GB)? En la práctica, los payloads de contenido editorial son pequeños (<100KB). No se implementa validación de tamaño explícita; PostgreSQL rechazará payloads excesivos con error de BD, que se captura y muestra como error genérico.
- ¿Qué ocurre si se intenta revertir a una versión que fue creada por un usuario ya eliminado? La versión se muestra con autor "Usuario eliminado" (updatedBy es NULL por ON DELETE SET NULL). El revert funciona normalmente.
- ¿Qué ocurre si no hay historial para un bloque recién creado? La vista de historial muestra "Aún no hay versiones anteriores" y el botón de revertir está deshabilitado.
- ¿Qué ocurre si el usuario intenta acceder a una página que no existe en el sistema (por ejemplo, `/panel/contenidos/pagina-inexistente`)? Se muestra error 404 con mensaje "Página de contenido no encontrada".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe permitir a usuarios con rol ADMIN u OPERATOR editar bloques de contenido global organizados por página (home, sobre, equipo, aviso-legal, privacidad, cookies).
- **FR-002**: El sistema debe validar el payload JSONB de cada bloque contra un schema Zod específico según el `block_key` antes de persistir.
- **FR-003**: El sistema debe persistir los bloques de contenido en la tabla `content_blocks` con `tenant_id`, `page_key`, `block_key`, `payload`, `updated_by`, `updated_at`.
- **FR-004**: El sistema debe permitir a usuarios con rol ADMIN u OPERATOR editar la configuración de contacto global (teléfono, email, dirección, horario, WhatsApp, mensaje predefinido WhatsApp).
- **FR-005**: El sistema debe persistir la configuración de contacto en la tabla `contact_config` con una fila única por tenant.
- **FR-006**: El sistema debe registrar cada cambio (edición o revert) en la tabla `content_history` con `content_type` ('block' o 'contact'), `content_key` (page_key+block_key para bloques, 'global' para contacto), `payload_snapshot`, `updated_by`, `created_at`.
- **FR-007**: El sistema debe permitir a usuarios con rol ADMIN u OPERATOR navegar el historial de versiones de cualquier bloque o de la configuración de contacto.
- **FR-008**: El sistema debe permitir revertir el contenido actual a cualquier versión histórica con un clic confirmado, generando una nueva entrada en el historial.
- **FR-009**: El sistema debe disparar revalidación ISR (`revalidateTag`) de las páginas públicas afectadas tras cada guardado o revert.
- **FR-010**: El sistema debe denegar el acceso a `/panel/contenidos` y `/panel/contenidos/contacto` a usuarios con rol AGENT, redirigiendo a `/panel` con mensaje de acceso denegado.
- **FR-011**: El sistema debe mostrar Toast de confirmación tras cada operación exitosa (guardar, revertir) y Toast de error tras fallos.
- **FR-012**: El sistema debe mostrar estados vacíos compuestos cuando no hay bloques para una página o no hay historial disponible.

### Key Entities

- **ContentBlock**: Representa un bloque de contenido editorial para una página específica. Atributos: `id`, `tenant_id`, `page_key` (home/sobre/equipo/aviso-legal/privacidad/cookies), `block_key` (identificador único del bloque dentro de la página, por ejemplo 'hero', 'sobre-texto', 'equipo-miembros'), `payload` (JSONB con estructura específica según block_key), `updated_by` (usuario que modificó por última vez), `updated_at`.
- **ContactConfig**: Representa la configuración de contacto global del tenant. Atributos: `tenant_id` (PK), `phone`, `email`, `address`, `hours`, `whatsapp_number`, `whatsapp_prefilled_message`, `updated_by`, `updated_at`. Fila única por tenant.
- **ContentHistory**: Representa una versión histórica de un contenido (bloque o configuración de contacto). Atributos: `id`, `tenant_id`, `content_type` ('block' o 'contact'), `content_key` (page_key+block_key para bloques, 'global' para contacto), `payload_snapshot` (JSONB con el payload completo en ese momento), `updated_by`, `created_at`. Tabla inmutable (RLS impide UPDATE/DELETE).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: ADMIN y OPERATOR pueden editar y guardar bloques de contenido global desde `/panel/contenidos` en menos de 30 segundos por bloque (tiempo de interacción humana, no incluye tiempo de red).
- **SC-002**: Los cambios en bloques de contenido se reflejan en las páginas públicas afectadas en menos de 60 segundos tras guardar (revalidación ISR).
- **SC-003**: La configuración de contacto global se actualiza en cabecera, footer y fichas en menos de 60 segundos tras guardar.
- **SC-004**: El historial versionado registra el 100% de los cambios (ediciones y reverts) sin pérdida de datos.
- **SC-005**: El revert a una versión histórica funciona correctamente y restaura el contenido al estado de esa versión en menos de 5 segundos.
- **SC-006**: El 100% de los payloads JSONB se validan contra schemas Zod antes de persistir; payloads inválidos son rechazados con mensaje de error claro.
- **SC-007**: Usuarios con rol AGENT no pueden acceder a `/panel/contenidos` ni `/panel/contenidos/contacto` (100% de denegación verificada).
- **SC-008**: La interfaz muestra estados vacíos compuestos cuando no hay datos, sin cajas negras ni placeholders rotos.

## Assumptions

- Los usuarios ADMIN y OPERATOR tienen permisos completos para editar todo el contenido global del tenant. Los usuarios AGENT no tienen acceso a esta sección.
- Las páginas editables son un conjunto cerrado y predefinido: home, sobre, equipo, aviso-legal, privacidad, cookies. No se permite crear páginas personalizadas desde la UI en esta feature.
- Los block_keys dentro de cada página son también un conjunto predefinido y conocido (por ejemplo, para home: hero, como-trabajamos, sobre, portafolio-destacado, confianza, cta-final, faq). No se permite crear bloques personalizados desde la UI en esta feature.
- Los payloads JSONB son pequeños (<100KB) y no requieren validación de tamaño explícita más allá de la validación de schema Zod.
- La revalidación ISR se dispara automáticamente tras cada guardado o revert; no se implementa invalidación manual.
- El historial versionado es infinito (no se implementa purge de versiones antiguas en esta feature).
- La configuración de contacto es una sola fila por tenant; no se soportan múltiples configuraciones de contacto por tenant.
- Los schemas Zod específicos por block_key ya están definidos o se definen en esta feature; no se implementa validación dinámica de schemas externos.
- La UI de edición es un formulario estructurado por tipo de bloque (inputs, textareas, selects), no un editor WYSIWYG libre.
- Los cambios en contenido global no requieren aprobación ni workflow de revisión; se publican inmediatamente tras guardar.
- La tabla `content_history` es inmutable gracias a políticas RLS que impiden UPDATE y DELETE; el sistema no intenta modificar entradas históricas.
