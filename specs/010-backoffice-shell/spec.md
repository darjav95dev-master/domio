# Feature Specification: backoffice-shell

**Feature Branch**: `feature/010-backoffice-shell`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Layout del backoffice con sidebar fijo, auth guard, navegación por rol, badge de leads no leídos, dashboard operativo de bienvenida, y protección contra indexación."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acceso protegido al backoffice (Priority: P1)

Un miembro del equipo de Domio (admin, operador o agente) accede a `/panel`. Si no tiene sesión activa, el sistema lo redirige automáticamente a `/panel/login`. Tras autenticarse, ve el layout del backoffice con el sidebar y el área de contenido.

**Why this priority**: Sin autenticación y layout base, ninguna funcionalidad del backoffice es usable. Es el prerrequisito estructural de todas las features de gestión posteriores.

**Independent Test**: Se puede probar intentando acceder a `/panel` sin sesión (redirige a login) y con sesión válida (renderiza el layout con sidebar). Verificable con navegador y con inspección de headers HTTP.

**Acceptance Scenarios**:

1. **Given** un usuario no autenticado, **When** navega a `/panel`, **Then** es redirigido a `/panel/login` con código 302/307.
2. **Given** un usuario autenticado con sesión válida, **When** navega a `/panel`, **Then** ve el layout del backoffice con sidebar de 240px y el área de contenido.
3. **Given** un usuario con sesión expirada, **When** intenta acceder a `/panel`, **Then** es redirigido a `/panel/login`.
4. **Given** cualquier respuesta bajo `/panel/*`, **When** se inspeccionan los headers HTTP, **Then** se encuentra `X-Robots-Tag: noindex, nofollow`.

---

### User Story 2 - Navegación condicional por rol (Priority: P1)

Un usuario autenticado ve en el sidebar solo las secciones de navegación que su rol le permite. Un AGENT ve Dashboard, Catálogo y sus propios leads. Un OPERATOR ve Dashboard, Catálogo, Leads, Contenidos. Un ADMIN ve las 7 secciones: Dashboard, Catálogo, Leads, Equipo, Contenidos, API Keys, ARSOP.

**Why this priority**: La segmentación por rol es fundamental para la seguridad y la experiencia de usuario. Cada rol debe ver solo lo que le corresponde.

**Independent Test**: Se puede probar iniciando sesión con cada rol (ADMIN, OPERATOR, AGENT) y verificando qué secciones aparecen en el sidebar.

**Acceptance Scenarios**:

1. **Given** un usuario con rol AGENT, **When** ve el sidebar, **Then** solo aparecen las secciones Dashboard, Catálogo y Leads.
2. **Given** un usuario con rol OPERATOR, **When** ve el sidebar, **Then** aparecen Dashboard, Catálogo, Leads y Contenidos. No aparecen Equipo, API Keys ni ARSOP.
3. **Given** un usuario con rol ADMIN, **When** ve el sidebar, **Then** aparecen las 7 secciones: Dashboard, Catálogo, Leads, Equipo, Contenidos, API Keys, ARSOP.
4. **Given** un usuario en cualquier rol, **When** hace clic en una sección activa, **Then** el item muestra un indicador visual de borde izquierdo terracota de 3px.

---

### User Story 3 - Dashboard operativo de bienvenida (Priority: P2)

Un usuario autenticado llega al dashboard (`/panel`) y ve una landing operativa con: su nombre y rol en el header, un contador grande de leads no leídos, enlaces rápidos a las secciones disponibles, la lista de las 5 últimas promociones que ha editado, y atajos a acciones frecuentes ("Nueva promoción", "Ver bandeja"). No hay gráficos, analítica de tráfico ni métricas de conversión.

**Why this priority**: El dashboard es la primera pantalla que ve el usuario. Debe ser útil y orientativo sin ser un tablero de business intelligence (regla de producto).

**Independent Test**: Se puede probar accediendo a `/panel` con un usuario autenticado y verificando que se muestran los elementos descritos sin gráficos ni métricas de conversión.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** accede a `/panel`, **Then** ve el header con su nombre y rol, el contador de leads no leídos, los enlaces rápidos, las últimas 5 promociones editadas y los atajos.
2. **Given** un usuario autenticado, **When** ve el dashboard, **Then** no aparecen gráficos, charts, analítica de tráfico ni métricas de conversión.
3. **Given** un usuario sin promociones editadas, **When** ve el dashboard, **Then** la sección de últimas promociones muestra un estado vacío apropiado.
4. **Given** un usuario con sesión activa, **When** hace clic en "Nueva promoción", **Then** navega a la página de creación de promoción (F011).

---

### User Story 4 - Badge de leads no leídos (Priority: P2)

Un agente o administrador ve un badge numérico junto a la sección "Leads" en el sidebar que indica cuántos leads no ha leído. El badge se actualiza automáticamente cada 30 segundos consultando el endpoint interno `GET /api/internal/leads/unread-count`. El badge es accesible mediante `aria-live="polite"` para lectores de pantalla.

**Why this priority**: El badge es la señal más importante para el flujo comercial: alerta al agente de nuevos leads sin intervención manual.

**Independent Test**: Se puede probar verificando que el badge muestra el conteo correcto consultando `lead_read_marks`, y que se actualiza tras 30 segundos sin interacción del usuario.

**Acceptance Scenarios**:

1. **Given** un agente con 3 leads no leídos, **When** ve el sidebar, **Then** el badge junto a "Leads" muestra el número 3.
2. **Given** un agente que acaba de leer un lead, **When** pasan 30 segundos, **Then** el badge se actualiza reflejando el nuevo conteo.
3. **Given** un usuario con rol AGENT, **When** consulta el badge, **Then** solo cuenta leads asignados a él (no los de otros agentes).
4. **Given** un lector de pantalla activo, **When** el badge cambia de valor, **Then** el cambio se anuncia vía `aria-live="polite"`.

---

### User Story 5 - Protección contra indexación (Priority: P2)

El backoffice completo no es indexable por motores de búsqueda. El layout emite el header `X-Robots-Tag: noindex, nofollow` en todas las respuestas. El archivo `robots.ts` excluye explícitamente `/panel/*`.

**Why this priority**: El backoffice contiene datos sensibles de negocio. No debe aparecer en resultados de búsqueda.

**Independent Test**: Se puede probar con `curl -I /panel` verificando el header `X-Robots-Tag`, y accediendo a `/robots.txt` verificando que contiene la regla `Disallow: /panel`.

**Acceptance Scenarios**:

1. **Given** cualquier respuesta bajo `/panel/*`, **When** se inspeccionan los headers HTTP, **Then** se encuentra `X-Robots-Tag: noindex, nofollow`.
2. **Given** un bot de búsqueda, **When** accede a `/robots.txt`, **Then** encuentra una regla `Disallow: /panel` que bloquea el rastreo.
3. **Given** un bot que ignora robots.txt, **When** accede a `/panel`, **Then** el header `X-Robots-Tag` le indica que no indexe.

---

### User Story 6 - Header con identidad y logout (Priority: P3)

El header superior del backoffice muestra el nombre del usuario autenticado y un botón de logout. Al hacer clic en logout, la sesión se invalida y el usuario es redirigido a `/panel/login`.

**Why this priority**: Es una funcionalidad básica de usabilidad y seguridad. El usuario debe poder cerrar sesión fácilmente.

**Independent Test**: Se puede probar verificando que el nombre aparece en el header y que el botón de logout cierra la sesión y redirige.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** ve el header, **Then** aparece su nombre completo.
2. **Given** un usuario autenticado, **When** hace clic en "Cerrar sesión", **Then** la sesión se invalida y es redirigido a `/panel/login`.
3. **Given** un usuario que cierra sesión, **When** intenta acceder a `/panel` de nuevo, **Then** es redirigido a `/panel/login`.

---

### Edge Cases

- ¿Qué ocurre si la sesión expira mientras el usuario está en el dashboard? El sistema detecta la expiración en la siguiente request y redirige a login.
- ¿Qué ocurre si el endpoint de unread-count falla? El badge muestra un estado de error graceful (sin número, o "—") sin romper el layout.
- ¿Qué ocurre si un usuario intenta acceder a una URL de sección que no le corresponde por rol? El sistema redirige al dashboard o muestra un error 403.
- ¿Qué ocurre si el usuario no tiene promociones editadas? La sección muestra un estado vacío ("Aún no has editado promociones").
- ¿Qué ocurre si el usuario no tiene leads no leídos? El badge no se muestra (o muestra 0, según decisión de diseño).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE renderizar un layout de backoffice con un sidebar fijo de 240px de ancho con fondo slate (`bg.inverted`).
- **FR-002**: El sidebar DEBE contener 7 secciones de navegación: Dashboard, Catálogo, Leads, Equipo, Contenidos, API Keys, ARSOP.
- **FR-003**: El sistema DEBE indicar visualmente la sección activa con un borde izquierdo de 3px en color terracota (`accent`).
- **FR-004**: El sistema DEBE redirigir a `/panel/login` cualquier request a `/panel/*` sin sesión válida.
- **FR-005**: El sistema DEBE filtrar las secciones del sidebar según el rol del usuario autenticado (ADMIN ve todas, OPERATOR no ve Equipo/API Keys/ARSOP, AGENT no ve Equipo/Contenidos/API Keys/ARSOP).
- **FR-006**: El sistema DEBE mostrar un badge numérico junto a la sección "Leads" con el conteo de leads no leídos del usuario autenticado.
- **FR-007**: El badge DEBE actualizarse automáticamente cada 30 segundos consultando `GET /api/internal/leads/unread-count`.
- **FR-008**: El badge DEBE usar `aria-live="polite"` para anunciar cambios a lectores de pantalla.
- **FR-009**: El header superior DEBE mostrar el nombre del usuario autenticado y un botón de logout.
- **FR-010**: El dashboard (`/panel`) DEBE mostrar: contador de leads no leídos, enlaces rápidos a secciones, lista de las 5 últimas promociones editadas por el usuario, y atajos a acciones frecuentes.
- **FR-011**: El dashboard NO DEBE mostrar gráficos, analítica de tráfico ni métricas de conversión.
- **FR-012**: Todas las respuestas bajo `/panel/*` DEBEN incluir el header `X-Robots-Tag: noindex, nofollow`.
- **FR-013**: El archivo `robots.ts` DEBE incluir una regla `Disallow: /panel` para bloquear el rastreo por bots.
- **FR-014**: El endpoint `GET /api/internal/leads/unread-count` DEBE devolver el conteo de leads no leídos filtrando por `user_id` de la sesión y `lead_read_marks`.
- **FR-015**: El sistema DEBE respetar las convenciones de diseño: sidebar `bg.inverted` (#2E2B27), texto `fg.on-inverted` (#FFFCF7), active `border-l-[3px] border-accent`, nav items `type.body-sm weight-medium`.

### Key Entities

- **NavItem**: Elemento de navegación del sidebar con label, ruta, icono, y roles permitidos.
- **UnreadCount**: Respuesta del endpoint interno con el conteo de leads no leídos para el usuario autenticado.
- **DashboardData**: Datos agregados para el dashboard: conteo de leads no leídos, últimas promociones editadas, enlaces rápidos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las requests sin sesión a `/panel/*` son redirigidas a `/panel/login` (verificable con tests automatizados).
- **SC-002**: El badge de leads no leídos refleja el conteo correcto en menos de 31 segundos tras un cambio (verificable con test E2E).
- **SC-003**: El 100% de las respuestas bajo `/panel/*` incluyen el header `X-Robots-Tag: noindex, nofollow` (verificable con test de integración).
- **SC-004**: El archivo `/robots.txt` bloquea `/panel` (verificable con test unitario o inspección manual).
- **SC-005**: Los usuarios con diferentes roles ven exactamente las secciones que les corresponden (verificable con tests E2E por rol).
- **SC-006**: El dashboard carga en menos de 2 segundos en condiciones normales de red (verificable con Lighthouse).
- **SC-007**: El acceso con teclado y lectores de pantalla es completo: todos los elementos interactivos son alcanzables y el badge se anuncia (verificable con auditoría a11y).

## Assumptions

- La autenticación ya está implementada en F005 (Auth.js v5 con credentials provider, JWT con `tenant_id`, `user_id`, `role`).
- Los tokens de diseño ya están definidos en F003 (globals.css con `bg.inverted`, `fg.on-inverted`, `accent`, etc.).
- Las tablas `lead_read_marks` y `promociones` ya existen en el schema de BD (F002).
- Los roles de usuario son ADMIN, OPERATOR y AGENT (definidos en F009 como constantes de dominio).
- El endpoint `GET /api/internal/leads/unread-count` es nuevo en esta feature y se implementa aquí.
- El dashboard muestra datos reales del usuario autenticado (nombre, rol, promociones editadas).
- No se implementan las vistas de las secciones (Catálogo, Leads, etc.) en esta feature — solo el shell y el dashboard.
- El sidebar es responsivo: en móvil (< 768px) se colapsa en un drawer hamburguesa (según design.md §13.5).
- La sesión tiene expiración de 2 horas con renovación deslizante (según F005).
