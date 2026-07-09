# Feature Specification: E2E Tests

**Feature Branch**: `feature/026-e2e-tests`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "Tests end-to-end con Playwright y Page Object Model para los 5 recorridos principales de Domio: visitante público, editor de catálogo, agente comercial, consumidor API, administrador"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitante público (Priority: P1)

Un visitante anónimo navega la superficie pública de Domio: carga la home, explora el portafolio aplicando filtros, abre una ficha de detalle, completa el formulario de contacto con consentimiento RGPD y recibe confirmación. Este recorrido verifica que toda la cadena de valor pública funciona: desde la presentación del catálogo hasta la captura de leads.

**Why this priority**: Es el recorrido principal de negocio. Si un visitante no puede navegar, filtrar, ver detalles y contactar, la plataforma no genera valor comercial. Es la primera línea de verificación E2E.

**Independent Test**: Se puede ejecutar de forma aislada navegando las rutas públicas y enviando un formulario de contacto. Verifica que la home carga, el portafolio filtra correctamente, la ficha muestra datos reales, el formulario crea un lead y la confirmación es visible.

**Acceptance Scenarios**:

1. **Given** la base de datos contiene promociones PUBLISHED con datos demo, **When** el visitante carga "/", **Then** la home muestra hero, portafolio destacado, bloques editoriales y footer con datos reales.
2. **Given** el visitante está en la home, **When** navega a "/portafolio" y aplica filtros (isla, tipo, operación, precio), **Then** la URL refleja los filtros, el grid muestra solo propiedades que cumplen los criterios y el contador de resultados es correcto.
3. **Given** el portafolio muestra resultados, **When** el visitante hace clic en una PropertyCard, **Then** la ficha de detalle muestra galería de fotos, infobar (precio, superficie, dormitorios, entrega), bloques editoriales, tabla de tipologías y mapa respetando el modo de privacidad.
4. **Given** el visitante está en una ficha de detalle, **When** completa el formulario de contacto (nombre, email, teléfono, mensaje) con consentimiento RGPD aceptado y envía, **Then** aparece mensaje de confirmación "Solicitud recibida. Nuestro equipo te contactará en 24-48h."
5. **Given** el lead fue creado desde el formulario público, **When** un agente hace login en el backoffice, **Then** el lead aparece en la bandeja con estado NEW y marcado como no leído.

---

### User Story 2 - Editor de catálogo (Priority: P2)

Un usuario con rol OPERATOR hace login en el backoffice, navega al listado de catálogo, edita una promoción (cambia avance de obra, sube imágenes con alt_text, reordena galería), verifica el autoguardado de borrador, publica los cambios y confirma que la ficha pública refleja las modificaciones.

**Why this priority**: Es el recorrido operativo principal del backoffice. Sin capacidad de editar y publicar catálogo, los agentes comerciales no tienen producto que vender.

**Independent Test**: Se puede ejecutar haciendo login como operador1@domio.dev, editando una promoción existente, publicando y verificando la ficha pública. No requiere que otros recorridos funcionen.

**Acceptance Scenarios**:

1. **Given** el operador está en la página de login, **When** introduce credenciales válidas (operador1@domio.dev / Domio2026!), **Then** es redirigido al dashboard del panel con su nombre visible.
2. **Given** el operador está en el dashboard, **When** navega a Catálogo, **Then** ve el listado de promociones con filtros funcionales (estado, kind, ubicación, agente, construction_status).
3. **Given** el operador está en el listado de catálogo, **When** hace clic en una promoción, **Then** accede al formulario de edición con todas las secciones (Identidad, Estado comercial, Ubicación, SEO, Agente).
4. **Given** el operador está editando una promoción, **When** cambia el construction_status y espera 30 segundos, **Then** el autoguardado persiste el borrador (visible tras refrescar la página).
5. **Given** el operador ha editado una promoción y la publica, **When** visita la ficha pública de esa promoción, **Then** los cambios son visibles (nuevo estado de obra, imágenes actualizadas).

---

### User Story 3 - Agente comercial (Priority: P2)

Un usuario con rol AGENT hace login en el backoffice, verifica el badge de leads no leídos, abre un lead (se marca como leído, badge decrementa), cambia el estado del lead a CONTACTED, añade una nota interna, y finalmente cambia a WON. Verifica que solo ve sus propios leads (aislamiento RLS).

**Why this priority**: La gestión de leads es el corazón del flujo comercial. Si un agente no puede ver, gestionar y cerrar leads, el sistema no cumple su función comercial.

**Independent Test**: Se puede ejecutar haciendo login como agente1@domio.dev, verificando leads, cambiando estados y añadiendo notas. Verifica RLS intentando acceder a leads de otro agente.

**Acceptance Scenarios**:

1. **Given** existen leads asignados a agente1 y agente2, **When** agente1 hace login, **Then** el badge del nav muestra el conteo de leads no leídos de agente1 (no los de agente2).
2. **Given** el agente está en la bandeja de leads, **When** abre un lead con estado NEW, **Then** el lead se marca como leído para ese agente y el badge decrementa.
3. **Given** el agente tiene un lead abierto con estado NEW, **When** cambia el estado a CONTACTED, **Then** el cambio se persiste y aparece registrado en el histórico del lead.
4. **Given** el agente tiene un lead en estado CONTACTED, **When** añade una nota interna, **Then** la nota se guarda y es visible en la cronología del lead.
5. **Given** el agente tiene un lead en CONTACTED o IN_NEGOTIATION, **When** cambia el estado a WON, **Then** el lead queda marcado como ganado y el histórico refleja la transición.
6. **Given** agente1 está autenticado, **When** intenta acceder a la URL directa de un lead asignado a agente2, **Then** el sistema deniega el acceso (403 o redirección a bandeja).

---

### User Story 4 - Consumidor API (Priority: P3)

Un consumidor externo se autentica con una API key y consume la API pública v1. Realiza GET /api/v1/promociones (verifica que solo devuelve portfolio+PUBLISHED, que no aparecen captaciones externas ni borradores, y que el modo de privacidad AREA no expone coordenadas exactas). Realiza POST /api/v1/leads/institutional con consentimiento (verifica 201 y lead creado con source=institutional) y sin consentimiento (verifica 422).

**Why this priority**: La API pública es el canal de integración con portales y sistemas externos. Su correcto funcionamiento es crítico para la expansión comercial, pero depende de que la superficie pública (F019-F021) y la gestión de leads (F014) estén operativas.

**Independent Test**: Se puede ejecutar usando `request` context de Playwright para hacer llamadas HTTP directas a los endpoints de la API, verificando códigos de estado y contenido de respuesta.

**Acceptance Scenarios**:

1. **Given** existe una API key activa, **When** el consumidor hace GET /api/v1/promociones con cabecera X-API-Key, **Then** la respuesta (200) contiene solo promociones con kind=portfolio y status=PUBLISHED.
2. **Given** la API devuelve promociones, **When** una promoción tiene map_privacy_mode=AREA, **Then** la respuesta JSON no contiene el campo location (coordenadas exactas), solo location_approx.
3. **Given** la API devuelve promociones, **When** se verifica el contenido, **Then** ninguna promoción con kind=external o status diferente a PUBLISHED aparece en la respuesta.
4. **Given** la API tiene cursor pagination, **When** el consumidor solicita el primer página, **Then** la respuesta incluye cursor para la siguiente página y el total es correcto.
5. **Given** el consumidor tiene API key válida, **When** hace POST /api/v1/leads/institutional con payload válido incluyendo consentimiento RGPD, **Then** recibe 201 y el lead se crea con source=institutional.
6. **Given** el consumidor intenta crear un lead, **When** el payload no incluye consentimiento RGPD, **Then** recibe 422 con detalle del campo faltante.

---

### User Story 5 - Administrador (Priority: P3)

Un usuario con rol ADMIN hace login en el backoffice y realiza tareas de administración: crea un nuevo agente (verifica que el sistema procesa la invitación), gestiona API keys (crea y revoca), edita la configuración de contacto global (verifica que el cambio se refleja en el footer público), y gestiona el ciclo de vida completo de leads (reasignación, exportación CSV, ejercicio ARSOP de borrado con verificación de borrado en cascada).

**Why this priority**: La administración es transversal a todo el sistema. Aunque es menos frecuente que los recorridos de agente o editor, garantiza que el sistema es gestionable y que las operaciones críticas (borrado RGPD, gestión de equipo) funcionan correctamente.

**Independent Test**: Se puede ejecutar haciendo login como admin@domio.dev y realizando las operaciones de administración. No depende de que otros recorridos estén funcionando simultáneamente.

**Acceptance Scenarios**:

1. **Given** el admin está en el panel de equipo, **When** crea un nuevo usuario con rol AGENT y email válido, **Then** el usuario aparece en el listado con estado activo.
2. **Given** el admin está en la sección de API Keys, **When** crea una nueva API key, **Then** la key se muestra en claro una sola vez y aparece en el listado con estado activo.
3. **Given** el admin tiene una API key visible, **When** la revoca, **Then** la key aparece como inactiva y no puede usarse para autenticar requests a la API.
4. **Given** el admin está en la bandeja de leads, **When** reasigna un lead de agente1 a agente2, **Then** el lead aparece como no leído para agente2.
5. **Given** el admin tiene un lead seleccionado, **When** solicita exportación CSV, **Then** se genera y descarga un archivo CSV con todos los datos del lead.
6. **Given** el admin ejecuta derecho ARSOP de borrado sobre un lead, **When** confirma la operación, **Then** el lead y todos sus datos asociados (notas, histórico, consentimientos, marcas de lectura) se eliminan en cascada y la operación queda registrada en arsop_requests.
7. **Given** el admin edita la configuración de contacto global (teléfono, email), **When** un visitante carga la home pública, **Then** el footer muestra los nuevos datos de contacto.

---

### Edge Cases

- ¿Qué ocurre si la base de datos no tiene datos seed antes de ejecutar los tests? Los tests deben fallar con un mensaje claro indicando que el seed es necesario.
- ¿Qué ocurre si el servidor de desarrollo no está corriendo? Playwright ya configura `webServer` con `pnpm dev` — arranca automáticamente.
- ¿Qué ocurre si un formulario de contacto se envía sin marcar el checkbox de consentimiento? El sistema debe mostrar error visible y no crear el lead.
- ¿Qué ocurre si un agente intenta acceder a la URL directa de un lead que no le pertenece? El sistema debe denegar el acceso (403 o redirección).
- ¿Qué ocurre si la API key ha sido revocada y se usa para autenticar? La API debe responder 401 Unauthorized.
- ¿Qué ocurre si se intenta crear un lead institucional sin los campos obligatorios? La API debe responder 400 Bad Request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema de tests E2E MUST ejecutar los 5 recorridos principales definidos en product.md §5 usando Playwright.
- **FR-002**: Cada página del sistema bajo test MUST estar encapsulada en un Page Object (una clase por página) que abstrae selectores y acciones.
- **FR-003**: Los tests MUST usar selectores accesibles en orden de preferencia: `getByRole` > `getByTestId` > `getByText`.
- **FR-004**: El estado de la base de datos MUST limpiarse/resetearse antes de cada test suite para garantizar aislamiento.
- **FR-005**: Los tests de login MUST autenticarse usando las credenciales seed (admin@domio.dev, agente1@domio.dev, agente2@domio.dev, operador1@domio.dev — todas con contraseña Domio2026!).
- **FR-006**: El test de consumidor API MUST crear o disponer de una API key activa para autenticar requests.
- **FR-007**: Los tests que verifican leads creados desde la superficie pública MUST confirmar que el lead aparece en el backoffice con el estado y source correctos.
- **FR-008**: Los tests de aislamiento RLS MUST verificar que un agente no puede ver leads de otro agente ni acceder a sus URLs directas.
- **FR-009**: Los tests de la API pública MUST verificar que GET /api/v1/promociones solo devuelve kind=portfolio y status=PUBLISHED.
- **FR-010**: Los tests de la API pública MUST verificar que POST /api/v1/leads/institutional sin consentimiento RGPD devuelve 422.
- **FR-011**: Los tests del modo de privacidad del mapa MUST verificar que cuando map_privacy_mode=AREA, las coordenadas exactas no aparecen en la respuesta JSON de la API.
- **FR-012**: Los tests de autoguardado de borrador MUST verificar que tras esperar 30 segundos, los cambios no publicados persisten al refrescar la página.
- **FR-013**: El test de ejercicio ARSOP de borrado MUST verificar que tras el borrado, el lead y todos sus datos asociados (notas, histórico, consentimientos, marcas de lectura) han sido eliminados.
- **FR-014**: Los tests MUST ejecutar con `workers: 1` y `fullyParallel: false` según la configuración existente de Playwright.
- **FR-015**: Los tests MUST ser ejecutables individualmente por archivo y como suite completa mediante `pnpm test:e2e`.

### Key Entities

- **Page Object**: Clase que encapsula los selectores y acciones de una página específica del sistema. Cada página relevante tiene su Page Object.
- **Test Fixture**: Configuración de base de datos y estado inicial antes de cada test suite. Incluye seed de datos y limpieza posterior.
- **API Key Fixture**: API key creada para el test de consumidor API, con ciclo de vida gestionado dentro del test.
- **Test Credentials**: Credenciales de los usuarios seed (admin, agentes, operadores) usadas para autenticación en tests.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los 5 recorridos E2E pasan exitosamente en ejecución local con `pnpm test:e2e`.
- **SC-002**: Cada recorrido se completa en menos de 60 segundos individualmente.
- **SC-003**: El 100% de los Page Objects usan selectores accesibles (`getByRole` como selector primario).
- **SC-004**: Cero selectores frágiles basados en CSS class names o XPath en los tests.
- **SC-005**: Los tests son deterministas: 5 ejecuciones consecutivas producen el mismo resultado sin flaky tests.
- **SC-006**: La suite completa E2E se ejecuta en menos de 5 minutos en total.

## Assumptions

- Los datos seed del script `pnpm db:seed` están disponibles en la base de datos de desarrollo antes de ejecutar los tests.
- El servidor de desarrollo (`pnpm dev`) arranca correctamente en el puerto 3000.
- Las variables de entorno necesarias (DATABASE_URL, AUTH_SECRET, etc.) están configuradas en `.env.local`.
- El servicio de email (Resend) está en modo test o mock — los tests no verifican envío real de emails, solo que el sistema los encola.
- Cloudflare R2 está configurado o mockeado — los tests de upload de imágenes verifican la UI pero no requieren un bucket real accesible.
- La API key para el test de consumidor API se crea dentro del propio test (vía backoffice ADMIN) o se añade al seed.
- Solo se testea en Chromium desktop (configuración actual de Playwright). No se testea en móvil ni otros navegadores.
- Los tests E2E no reemplazan los tests unitarios ni de integración existentes — son complementarios.
