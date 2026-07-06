# product.md — Lógica de negocio de **Domio**

> **Proyecto de producción.** Plataforma de comercialización inmobiliaria.
> **Repositorio:** `domio` — Next.js 15, PostgreSQL 16 con RLS bajo Neon/PgBouncer, Auth.js v5, Cloudflare R2.
> **Naturaleza de este documento:** brief de producto en lenguaje natural, entrada del subagente `feature-briefer`. Es la fuente de verdad de **qué construye** la cadena. No describe cómo se implementa (eso vive en `architecture.md`).
> **Coherencia obligatoria:** cualquier feature que la cadena derive debe caber en las reglas de este documento. Si una feature no encaja, la feature está mal formulada o el documento debe actualizarse antes.

---

## 1. Visión

Domio es una **plataforma de comercialización inmobiliaria** especializada en vivienda en Canarias. Tiene tres superficies digitales: una **web pública** en `domio.com` donde cualquier persona interesada en comprar o alquilar vivienda explora el catálogo y contacta con el equipo comercial; un **backoffice** en `panel.domio.com` donde el equipo interno gestiona catálogo, medios y leads; y una **API HTTP pública** en `domio.com/api/v1/` que expone selectivamente el catálogo a consumidores externos autenticados.

Comercialmente, Domio persigue tres cosas simultáneas: **captar leads** con el mejor SEO posible en el nicho de vivienda canaria; **presentar dignamente** las promociones inmobiliarias del portafolio, con foco especial en las de obra nueva; y **operar con mínima fricción interna** para que el equipo comercial pueda enfocarse en cerrar operaciones, no en pelear con una herramienta.

Arquitectónicamente, Domio nace **single-tenant en operación pero multi-tenant en diseño**. Hoy la plataforma opera con un único tenant comercializador. Mañana podrían coexistir varios sin reescribir nada. Esta decisión no se relaja: toda tabla de dominio lleva `tenant_id`, toda consulta filtra por contexto, todo repositorio recibe un `TenantContext`. Es una regla estructural del sistema, protegida por tests de aislamiento.

---

## 2. Contexto operativo

Domio opera para una comercializadora inmobiliaria que forma parte de un grupo. El grupo tiene también una identidad institucional separada, con su propia presencia digital, que **no vende directamente**: ni gestiona catálogo, ni recibe leads, ni cierra operaciones. Toda la actividad comercial vive en Domio.

De esa realidad se derivan tres consecuencias operativas que la cadena debe interiorizar:

1. **El SEO y los leads viven en Domio.** La ficha detallada de cada promoción, con datos, imágenes y formularios de contacto, está en `domio.com`. Cualquier tráfico externo que derive hacia una promoción concreta aterriza aquí. Cualquier optimización de captación se hace aquí.
2. **El dato se gestiona una sola vez.** Cambiar un precio, marcar una vivienda como vendida, actualizar el avance de obra, subir un plano nuevo — todo ocurre en el backoffice de Domio. Cualquier consumidor externo autorizado refleja el cambio automáticamente vía API.
3. **No todo el catálogo se comparte.** Las promociones tienen dos naturalezas comerciales (definidas en §4): unas son parte del portafolio institucional del grupo, otras son captaciones que Domio hace de terceros. Solo las primeras son visibles para consumidores externos. Esta clasificación es una regla dura del dominio, no una preferencia cosmética.

---

## 3. Actores y superficies

Domio tiene **tres superficies** y se relaciona con **cinco tipos de actor**:

### Actores

- **Visitante público.** Anónimo. Llega a `domio.com` buscando vivienda. Explora, filtra, ve fichas, decide contactar. Convierte en **lead** cuando rellena un formulario, pulsa el botón de WhatsApp con envío de datos, o solicita una visita.
- **Lead.** No es un usuario del sistema: es un registro. Un visitante que ha dejado sus datos (nombre, contacto, mensaje, consentimiento RGPD) y espera respuesta. Un lead nace en la web comercial de Domio (`source: "commercial"`) o llega cedido desde un consumidor externo autenticado (`source: "institutional"`). Desde el punto de vista operativo interno, un lead es un lead; el `source` sirve para analítica y para trazabilidad legal.
- **Agente comercial.** Persona del equipo interno. Entra al backoffice. Solo ve **sus** promociones asignadas y **sus** leads asignados. No ve el catálogo completo ni la bandeja completa. Su trabajo diario es: recibir notificación de lead nuevo, contactar, mover el estado del lead, apuntar notas, cerrar operación.
- **Editor de catálogo (operador).** Persona del equipo interno responsable de mantener vivo el catálogo. Crea y edita promociones, sube imágenes, actualiza el avance de obra, cambia estados de publicación, mantiene los contenidos comerciales (home, sobre, equipo, legal). Ve todo el catálogo, no ve la bandeja de leads.
- **Administrador.** Persona del equipo interno con permisos completos. Gestiona el equipo (crea, modifica, desactiva agentes y operadores; asigna roles). Puede hacer todo lo que hacen operadores y agentes. Gestiona API keys de consumidores externos. Puede exportar leads y catálogo a CSV. Configura los datos de contacto globales (teléfono, email, dirección, horario, WhatsApp) que aparecen en la web pública.
- **Sistema consumidor externo.** No es humano. Es cualquier sistema externo que se autentica por **API key en cabecera** y consume `/api/v1/` para leer el catálogo público del portafolio institucional y/o publicar leads. Hoy existe un consumidor único: el escaparate institucional del grupo. Mañana podrían existir más (portales de terceros, aplicaciones móviles, integraciones de partners). La API es **agnóstica del consumidor**: esa neutralidad es una regla de diseño, no una casualidad.

### Superficies

- **Web pública comercial** (`domio.com`) — el escaparate. SEO intensivo. SSR/ISR. Es donde ocurre la captación.
- **Backoffice** (`panel.domio.com`) — la herramienta interna. Auth.js v5. Roles diferenciados. RLS activo. No indexable.
- **API HTTP pública versionada** (`domio.com/api/v1/`) — el contrato con el mundo exterior. Autenticación por API key. Rate limiting. Zod en cada payload. OpenAPI/Swagger interno autogenerado.

> ⚠️ **Nota para la cadena:** el conjunto de superficies es **cerrado**. Si un subagente propone añadir una app móvil, un webhook saliente, un chat en vivo, un endpoint gráfico, un panel de clientes finales, o cualquier otra superficie, está inventando alcance. Debe rechazarse. Cualquier ampliación futura viene por revisión de este documento, no por deriva de la cadena.

---

## 4. El catálogo: modelo conceptual del dominio

El catálogo es el corazón de Domio. Su modelo conceptual es sencillo de explicar pero **estricto en sus reglas**. La cadena debe protegerlo con tests.

### Promoción

Es la **unidad principal** del catálogo. Representa un conjunto de viviendas comercializadas juntas bajo una identidad de proyecto. Toda promoción pertenece a **una y sólo una** de estas dos categorías:

- **Promoción del portafolio institucional** (`kind: "portfolio"`) — obra nueva o inmueble del grupo, respaldada institucionalmente. Tiene aval, auditoría, plazos de entrega públicos, avance de obra cuando aplica. Es el producto premium. **Se expone por la API pública** para su consumo por sistemas externos autenticados.
- **Captación externa** (`kind: "external"`) — inmueble o conjunto de inmuebles que un particular, empresa o promotor externo ha encargado comercializar a Domio. No tiene respaldo institucional del grupo. **No se expone por la API pública**: es invisible para cualquier consumidor externo. Solo aparece en `domio.com`.

Toda promoción tiene:

- **Identidad**: nombre, slug descriptivo generado del nombre (`/inmuebles/piso-en-venta-en-{zona}-{habs}hab-{id}`), operación (`SALE` / `RENT` / `SALE_AND_RENT`), tipo de producto.
- **Tipo de producto**: `piso`, `ático`, `casa`, `chalet`, `dúplex`, `estudio`, `local`, `oficina`, `nave`, `garaje`, `trastero`, `terreno`. La lista es cerrada; añadir tipos nuevos pasa por revisión de este documento.
- **Estado comercial**: `DRAFT` (borrador, invisible), `PUBLISHED` (visible), `RESERVED` (visible con distintivo), `SOLD` (visible en histórico), `RENTED` (visible en histórico), `WITHDRAWN` (archivado, invisible).
- **Ubicación**: isla → municipio → dirección exacta + coordenadas geográficas. **Modo de privacidad del mapa** (`EXACT` muestra el punto, `AREA` muestra un círculo de zona aproximada) editable por promoción. Regla dura para captaciones en las que el propietario exige discreción.
- **Contenido editorial estructurado** (§ Contenido editorial).
- **Galería ordenada** de imágenes con drag & drop y marca de portada.
- **Planos** como categoría separada de las imágenes, con visor propio.
- **SEO por promoción**: título y meta-descripción opcionales. Si están vacíos, se **auto-generan** desde el nombre + tipo + operación + zona.
- **Formulario de contacto** asociado.

### Tipología

Dentro de cada promoción hay **una o más tipologías**: variantes de vivienda dentro del mismo proyecto (por ejemplo: "3 dormitorios planta baja con jardín", "2 dormitorios ático con terraza", "local comercial en planta baja"). Cada tipología tiene:

- **Plano** (imagen específica, no confundir con la galería general).
- **Superficies**: útil, construida.
- **Composición**: número de dormitorios, número de baños, plantas.
- **Antigüedad**: año de construcción (para obra terminada) o año estimado de entrega (para obra nueva).
- **Certificado energético**: letra (`A`–`G`) o `EN_TRAMITE`.
- **Precios**:
  - Precio de referencia de venta (o `null` → "consultar").
  - Precio de alquiler mensual (o `null`).
  - Gastos de comunidad (informativo).
  - Fianza (solo alquiler).
- **Amenities** — set cerrado de características, checkboxes agrupados: `ascensor`, `terraza`, `balcón`, `piscina`, `garaje`, `trastero`, `calefacción`, `aire_acondicionado`, `amueblado`, `mascotas_permitidas`, `accesible`, `zonas_verdes`, `seguridad`. La lista es cerrada; ampliaciones pasan por revisión.
- **Contador de unidades disponibles**.

### Unidad de vivienda (opcional según promoción)

En promociones donde tenga sentido gestionar vivienda por vivienda, cada **unidad** se modela individualmente con estado propio (`AVAILABLE`, `RESERVED`, `SOLD`, `RENTED`). La disponibilidad pública que ve el visitante **agrega** estas unidades ("3 disponibles de 8"); el equipo interno gestiona el detalle unidad a unidad. En promociones de operación estándar (venta al detalle, alquileres individuales) el modelo de unidad es implícito y no se muestra al público.

### Inmueble suelto (dentro de una promoción de captación)

En la categoría de captación externa, una **promoción de un solo inmueble** es el caso más común: Domio capta el piso de un particular, lo publica, lo vende. Modelísticamente sigue siendo una promoción con una única tipología y una única unidad — así se evita bifurcar el modelo entre "promoción" e "inmueble suelto". Es una decisión deliberada: **un solo concepto de agregación en todo el sistema**.

### Contenido editorial de la promoción — bloques estructurados

El contenido editorial de una promoción **no es texto libre**. Se compone de **bloques estructurados** con schema Zod, cada uno con su editor propio en el backoffice y su renderizado propio en la ficha pública. Esta decisión garantiza consistencia visual, hace posible generar datos estructurados `RealEstateListing` automáticamente y evita que la calidad de ficha dependa del operador que la edita.

Los bloques son:

- **`descripcion_general`** — 2-3 párrafos con formato limitado (negrita, cursiva, listas). Presente en toda promoción.
- **`memoria_calidades[]`** — lista de items con icono + título + descripción corta. Ejemplo: "Suelos de porcelánico rectificado 60×60", "Carpintería exterior de aluminio con rotura de puente térmico". Presente en toda promoción.
- **`zonas_comunes[]`** — lista de items (nombre + descripción corta). **Solo aparece en `kind='portfolio'`** con obra nueva. Ejemplo: "Piscina comunitaria", "Zonas ajardinadas".
- **`ubicacion_servicios[]`** — lista de "distancias" (servicio + distancia). Ejemplo: "Colegio a 300m", "Supermercado a 500m". Presente en toda promoción, opcional por item.
- **`plazos_garantias`** — bloque con entrega estimada (fecha), estado de licencias, aval bancario (`sí`/`no` + entidad), auditoría externa (`sí`/`no`). **Solo aparece en `kind='portfolio'`** con obra nueva.

El backoffice presenta cada bloque con su propio formulario. La ficha pública renderiza solo los bloques que tienen contenido. El editor **no permite escribir markdown libre** en un textarea genérico — la libertad está acotada al schema.

### Lead

Registro nominal de una persona interesada en un inmueble o promoción concreta. Tiene: nombre, contacto (email, teléfono), mensaje libre, `source` (`"commercial"` si nace en `domio.com`, `"institutional"` si viene cedido de un consumidor externo autenticado), referencia al recurso de origen (promoción / tipología), estado (`NEW`, `CONTACTED`, `IN_NEGOTIATION`, `WON`, `LOST`), agente asignado, notas internas, marca de leído / no leído, timestamps, y **consentimiento RGPD explícito** con base legal declarada (§ Reglas RGPD, §6).

### Agente asignado

Cada promoción (y por herencia, cada tipología y cada lead nacido en ella) tiene un **agente comercial asignado**. La asignación puede ser automática (por reglas de zona / tipo) o manual (el administrador reasigna). El lead nuevo dispara notificación por email al agente asignado.

### Imágenes y medios

Las imágenes son un **activo crítico** del producto. Toda imagen pasa por **Cloudflare R2** con transformaciones bajo demanda (miniaturas, formato WebP/AVIF, tamaños responsive). Cada imagen tiene **texto alternativo obligatorio** (accesibilidad y SEO — no es opcional). Las galerías permiten **reordenar por drag & drop** y **marcar una imagen como portada**. Los planos y documentos (avales, certificados) se almacenan también en R2, en categoría separada de la galería, con URLs firmadas para acceso privado cuando aplica.

### Contenidos comerciales globales

Fuera del catálogo, hay páginas de contenido que también se editan desde el backoffice: la home (hero, claim, destacados), la página "Sobre Domio", la página de equipo, los textos legales comerciales (aviso legal, política de privacidad, política de cookies). Y la **configuración de contacto** que aparece en cabecera, footer y ficha: teléfono, email, dirección de la oficina, horario de atención, número de WhatsApp con mensaje predefinido. Estos contenidos son editables sin necesidad de commit.

---

## 5. Recorridos clave

Los recorridos son la forma más honesta de describir el producto. Son cinco. Cada uno tiene reglas que la cadena debe garantizar.

### 5.1 Recorrido del visitante público

> Una familia busca vivienda en Tenerife. Aterriza en Domio desde Google.

1. Llega a la **home** de `domio.com`. Ve un hero con buscador rápido, un bloque de promociones destacadas del portafolio institucional (marcadas visualmente como producto premium), un bloque de otras oportunidades del catálogo, y un pie con "Sobre Domio".
2. Va al **catálogo** y aplica filtros: isla, municipio, tipo de inmueble, operación (`SALE`/`RENT`), rango de precio, dormitorios, baños, amenities (checkboxes), estado (sobre plano / en construcción / entrega inmediata). La URL cambia con los filtros — es compartible. Puede ordenar por precio (asc/desc), fecha de publicación o relevancia. La paginación es **basada en cursor** (no offset) para mantener el rendimiento con catálogos grandes. Ve solo **vista grid** (una decisión de producto — la lista se descarta como no-objetivo, §7).
3. Elige una promoción y entra en su **ficha detallada** (URL con slug descriptivo). Ve galería con visor a pantalla completa y navegación por teclado, bloques editoriales estructurados (descripción, calidades, zonas comunes cuando aplica, ubicación y servicios, plazos y garantías cuando aplica), tabla de tipologías con planos y precios, disponibilidad agregada, mapa (respetando el modo de privacidad `EXACT`/`AREA`), calendario de obra si aplica, y distintivo de portafolio institucional cuando aplica.
4. Decide pedir información. Tiene tres canales:
   - **Formulario de contacto** de esa promoción — puede añadir la tipología concreta que le interesa, da consentimiento explícito RGPD.
   - **Botón de WhatsApp** — abre WhatsApp con mensaje predefinido que incluye la referencia de la promoción. El clic con envío de datos también genera un lead (`source: "commercial"`, canal `whatsapp`).
   - **Botón de compartir** con Open Graph (WhatsApp, Twitter, email, copiar enlace) — no genera lead, es para que el visitante mueva la ficha por su cuenta.
5. Recibe **email de confirmación**. El agente asignado a esa promoción recibe **notificación** simultánea del lead nuevo. En el backoffice aparece con marca de "no leído".
6. Puede volver al catálogo y ver **inmuebles relacionados** al pie de cada ficha (regla: misma zona + tipo similar + rango de precio ±20%, hasta 4 resultados).

**Reglas que la cadena debe garantizar en este flujo:**
- Home, catálogo y ficha se renderizan en el servidor (SSR/ISR) para ser indexables por buscadores.
- Cada ficha lleva metadatos SEO únicos: título y meta-descripción editados por el operador, o **auto-generados** por fallback determinista (`{tipo} en {operación} en {zona} — {n_dormitorios} dormitorios | Domio`) si el operador no los rellena. Datos estructurados `RealEstateListing` de schema.org generados desde los bloques estructurados de la ficha.
- El sitemap XML se genera automáticamente incluyendo solo promociones `PUBLISHED`.
- El formulario valida en cliente y servidor con **el mismo schema zod**.
- El formulario está protegido contra envíos automatizados (rate limiting + captcha) sin degradar la accesibilidad.
- Los datos personales del lead se almacenan con la base legal RGPD declarada y son visibles solo dentro del backoffice de Domio, con RLS aplicando el `tenant_id` en cada consulta.
- La revalidación incremental refresca la ficha en cuanto el operador cambia algo en el backoffice.

### 5.2 Recorrido del editor de catálogo

> Un operador entra al backoffice porque una promoción cambió de fase (empezó la cimentación).

1. Entra en `panel.domio.com`, autenticándose con su email y contraseña (Auth.js v5, sesión segura, JWT con `tenant_id`).
2. Va al listado del catálogo. Aplica filtros (por estado, `kind`, ubicación, agente asignado). Encuentra la que le toca.
3. Entra en la ficha de edición. Actualiza el **avance de obra** en el bloque `plazos_garantias`. Sube dos fotografías nuevas del solar, con texto alternativo obligatorio para cada una, y las reordena arrastrándolas dentro de la galería hasta la segunda y tercera posición.
4. Mientras edita, el sistema hace **autoguardado de borrador** en background cada 30 segundos. Si el navegador se cierra, al volver los cambios están ahí como borrador.
5. Al guardar como publicado, el sistema **valida** con el schema Zod. Guarda. Registra en el histórico de cambios quién y cuándo hizo la modificación, con detalle de qué campos cambiaron.
6. La revalidación incremental se dispara. La ficha pública se actualiza sin redeploy. La respuesta de la API pública también refleja el cambio en cuanto expira el TTL de caché.

**Reglas que la cadena debe garantizar:**
- Toda operación de escritura pasa por un repositorio context-aware que abre transacción, ejecuta `SET LOCAL app.tenant_id` con el contexto, opera, y confirma.
- Las imágenes se suben a R2 desde el servidor con URL firmada temporal — nunca desde el navegador con credenciales.
- El editor bloquea guardar como publicado si falta el texto alternativo de alguna imagen (accesibilidad no negociable).
- El editor bloquea publicar si faltan bloques mínimos (`descripcion_general` no vacío + al menos una imagen + al menos una tipología).
- El histórico de cambios es una tabla auditable, no un log volátil.
- El autoguardado de borrador es transparente para el operador — nunca pierde trabajo por refresco accidental.

### 5.3 Recorrido del agente comercial

> Un agente recibe email diciendo que le han asignado un lead nuevo.

1. Abre el email, hace clic en el enlace. Le lleva al backoffice, autenticado (o le pide login si no lo estaba). En la barra de navegación superior ve un **badge numérico** con el total de leads no leídos.
2. Entra directamente a la ficha del lead. Ve datos de contacto, mensaje libre, promoción de origen, tipología marcada si la hay, canal (`commercial` / `institutional`), consentimientos RGPD, fecha. Al abrir la ficha, se marca automáticamente como **leído** y el badge del nav se decrementa.
3. Va a la **bandeja de leads**. Aplica filtros por estado, source (`commercial`/`institutional`), rango de fechas, promoción asociada, o palabra en nombre/email. Ve solo los suyos.
4. Contacta con la persona por email o WhatsApp. Al cerrar la conversación, cambia el estado a `CONTACTED`. Añade una nota interna resumiendo la conversación.
5. Días después, la operación avanza. Cambia a `IN_NEGOTIATION`. Añade otra nota.
6. Cierra: `WON` o `LOST`. La bandeja marca ese lead como cerrado.

**Reglas que la cadena debe garantizar:**
- El agente **solo ve sus leads asignados**. Las políticas RLS bloquean acceso a leads de otros agentes.
- El badge de leads no leídos en el nav es preciso — se actualiza en tiempo real con `aria-live="polite"`.
- El histórico de estados es inmutable — cambios registrados con timestamp y autor.
- La exportación a CSV incluye solo los leads visibles para el agente que la solicita (los administradores exportan todo).
- La marca de leído/no leído es por-lead y por-usuario — un lead reasignado a otro agente vuelve a estado "no leído" para el nuevo agente.

### 5.4 Recorrido del sistema consumidor externo

> Un sistema autenticado por API key consume el catálogo institucional y publica leads.

1. El servidor consumidor hace `GET /api/v1/promociones` con su API key en cabecera.
2. Domio autentica la API key, resuelve el tenant, aplica **el filtro obligatorio** de `kind: "portfolio"` y `status: "PUBLISHED"`, y responde con la lista paginada.
3. El consumidor cachea la respuesta (con headers de caché declarados) y la renderiza en su superficie.
4. Cuando un usuario final del consumidor decide contactar sobre una promoción, el consumidor envía `POST /api/v1/leads/institutional` con los datos + consentimiento RGPD. **No los almacena localmente**.
5. Domio valida el payload con zod, crea el lead con `source: "institutional"`, asigna al agente que corresponda por reglas de la promoción, dispara la notificación por email.

**Reglas que la cadena debe garantizar:**
- La API filtra automáticamente por `kind: "portfolio"` — un consumidor externo **nunca** puede ver captaciones externas, ni siquiera pidiéndolas explícitamente.
- Cada API key tiene rate limiting individual. El abuso de una clave no degrada al resto.
- Los payloads de escritura (`POST /leads/institutional`) requieren consentimiento RGPD explícito en el propio payload — si falta, se responde `422 Unprocessable Entity` con detalle del campo faltante.
- Los `POST` de escritura **no se reintentan automáticamente**: un fallo debe informarse al usuario final del consumidor para que decida. Solo las lecturas son idempotentes y reintentales.
- El contrato HTTP tiene sus schemas zod versionados y sus tests de contrato aseguran no-divergencia entre publisher y consumidor.
- El versionado es explícito (`/api/v1/`). Una versión nueva se introduce en paralelo, nunca reemplazando la anterior en caliente.
- La documentación OpenAPI se autogenera desde los schemas zod y está accesible **solo internamente** — no en producción pública.

### 5.5 Recorrido del administrador

> Un administrador necesita dar de alta un agente nuevo y asignarle unas cuantas promociones.

1. Entra al backoffice. Va a **gestión del equipo**. Crea el nuevo agente con email + rol `AGENT`.
2. El sistema envía email de invitación con enlace de establecimiento de contraseña.
3. El administrador va al catálogo y **reasigna** las promociones deseadas al nuevo agente.
4. Desde ese momento, los leads futuros de esas promociones se le asignan automáticamente. Los leads históricos siguen con su agente original.
5. Adicionalmente, el administrador puede en cualquier momento actualizar la **configuración de contacto global** (teléfono, email, dirección, horario, WhatsApp con mensaje predefinido) desde la sección de contenidos comerciales. El cambio se refleja en cabecera, footer y ficha de todas las promociones tras revalidación incremental.

**Reglas que la cadena debe garantizar:**
- El alta de usuario **no crea contraseñas**: envía enlace de establecimiento (buenas prácticas de auth).
- La desactivación de un miembro del equipo es **soft** (`is_active = false`), no borrado — para preservar histórico de asignaciones.
- La reasignación de promociones queda registrada en el histórico.
- La configuración de contacto es un contenido versionado como cualquier otro contenido comercial global — se puede revertir a versiones anteriores.

---

## 6. Reglas de negocio transversales

Reglas que la cadena trata como invariantes del sistema y protege con tests. Si una feature las viola, la feature es defectuosa.

1. **Multi-tenant en el diseño, single-tenant en la operación.** Toda tabla de dominio lleva `tenant_id NOT NULL`. Toda consulta filtra por contexto de tenant. Toda transacción abre con `SET LOCAL app.tenant_id`. Esta regla no se relaja aunque hoy solo haya un tenant activo.
2. **Aislamiento RLS bajo PgBouncer.** El pooling es transactional. El contexto de tenant se establece con `SET LOCAL` **dentro** de la transacción, nunca con `SET` global. Se prueba con tests explícitos de aislamiento entre dos tenants sintéticos.
3. **Solo las promociones `kind: "portfolio"` y `status: "PUBLISHED"` se exponen por la API pública.** Un consumidor externo nunca ve captaciones externas, ni promociones en borrador, reservadas, vendidas, alquiladas o retiradas.
4. **Las captaciones externas no salen de `domio.com`.** Ni por API, ni por sitemap externo, ni por caché de terceros. Son visibles solo desde el escaparate comercial.
5. **El contenido editorial es estructurado, no libre.** Los bloques (`descripcion_general`, `memoria_calidades`, `zonas_comunes`, `ubicacion_servicios`, `plazos_garantias`) tienen schema Zod. `zonas_comunes` y `plazos_garantias` solo aparecen en `kind='portfolio'`. El backoffice bloquea el guardado si un bloque viola su schema.
6. **La lista de tipos de inmueble y amenities es cerrada.** Ampliaciones pasan por revisión de este documento y migración explícita. La cadena no puede añadir tipos o amenities libres.
7. **El consentimiento RGPD es dato del lead, no metadato.** Se almacena con base legal declarada, fecha, texto exacto aceptado, IP y user agent. Sin consentimiento válido, el lead no se persiste (`422` en la API pública; error visible en el formulario web).
8. **Cadena de responsabilidad RGPD en leads institucionales.** Cuando un lead llega vía `POST /leads/institutional`, la responsabilidad del tratamiento pasa formalmente al momento del envío: el consumidor externo era responsable en la captura, Domio es responsable desde la recepción. El texto de consentimiento que el visitante acepta debe informar de esta cesión — el consumidor externo es responsable de mostrarlo, Domio es responsable de rechazar leads con base legal insuficiente.
9. **Derechos del interesado ejercitables.** Domio soporta ejercicio de derechos ARSOP (acceso, rectificación, supresión, oposición, portabilidad) sobre cualquier lead. El mecanismo es un endpoint interno del backoffice que un administrador ejecuta a petición: exporta todos los datos del lead o los borra en cascada (lead + notas + historial + consent_records + cualquier referencia).
10. **Los leads cedidos desde consumidores externos llegan en el acto del envío.** El consumidor externo no almacena leads institucionales — los reenvía en el mismo request. Si el envío a Domio falla, el consumidor informa al usuario final y no reintenta silenciosamente. Los `POST` **no se reintentan automáticamente** — solo lecturas.
11. **Toda imagen vive en Cloudflare R2 y respeta el modo de privacidad del mapa.** El texto alternativo es obligatorio en cada imagen (bloqueo en formulario). Los planos son categoría separada de la galería. El modo de privacidad `AREA` renderiza un círculo aproximado en el mapa, nunca las coordenadas exactas — ni en HTML, ni en JSON del API, ni en datos estructurados.
12. **El agente asignado hereda de la promoción.** Un lead nace con el agente de su promoción de origen. Reasignar cambia al agente del lead, no al de la promoción. La reasignación de un lead vuelve a marcarlo como "no leído" para el nuevo agente.
13. **La visibilidad en backoffice está regida por RLS + rol.** Un agente no puede ver leads que no le pertenecen, ni siquiera por URL directa. Un operador no puede acceder a la bandeja de leads. Un administrador ve todo.
14. **El histórico es auditable.** Cambios de estado de lead, cambios de campos de promoción, reasignaciones, altas y bajas de usuario, cambios en la configuración de contacto — todo queda registrado con timestamp y autor. No se borra.
15. **SEO no negociable en superficies públicas.** SSR en home, catálogo y fichas. Metadatos únicos por página con fallback determinista. Slug descriptivo generado del nombre. Datos estructurados `RealEstateListing` desde bloques editoriales. Sitemap. Canonicals. Open Graph. Revalidación incremental.
16. **Accesibilidad WCAG AA es piso, no techo.** Lighthouse a11y ≥ 90 en cada página pública antes de merge a `main`. Formularios con labels asociados, focus visible, contraste verificado, navegación por teclado completa. Visor de imágenes navegable por teclado.
17. **El backoffice no es indexable.** `robots.txt` + `noindex` + headers HTTP + subdominio dedicado (`panel.domio.com`).
18. **Errores en producción tienen contexto de tenant.** Sentry captura `tenant_id` en cada evento. Sin contexto de tenant, un error no es depurable en un sistema multi-tenant.
19. **Resiliencia entre subsistemas.** Si el subsistema de emails cae (Resend inaccesible), un lead se persiste igualmente y la notificación se encola para reintento diferido. La captura de leads nunca depende de la disponibilidad de servicios auxiliares.
20. **Autoguardado de borrador es transparente y no destructivo.** El operador nunca pierde trabajo por refresco, cierre accidental o pérdida de sesión mientras edita. El borrador convive con la versión publicada hasta que el operador decide publicarlo.

---

## 7. Restricciones y no-objetivos (scope creep control)

Lo que Domio **no es** en el alcance del TFM, declarado explícitamente para que la cadena no invente:

- **No es un CRM completo.** No hay pipeline visual, no hay automations complejas, no hay integraciones con calendarios ni telefonía. La bandeja de leads es funcional, sencilla y suficiente para el equipo comercial.
- **No es un portal inmobiliario tipo Idealista.** No hay comparador, no hay favoritos persistentes de visitante (sin auth pública), no hay alertas por email de nuevos inmuebles, no hay valoración automática.
- **No hay vista lista en el catálogo público.** Solo vista grid. Es una decisión de posicionamiento editorial coherente con `design.md`. La vista lista se descarta como no-objetivo del MVP.
- **No hay editor markdown libre.** El contenido editorial de una promoción se compone de bloques estructurados con schema Zod. El editor libre queda fuera de alcance por consistencia visual y por generación fiable de datos estructurados.
- **No hay dashboard de estadísticas / analítica en el backoffice.** Ni visitas, ni conversión, ni ranking de inmuebles vistos. Si el equipo necesita métricas, se apoya en Google Analytics o similar en la web pública. El backoffice del MVP no las expone.
- **No es multi-idioma.** Solo español en el MVP. La internacionalización queda fuera de alcance.
- **No hay exportación de datos personales estructurada en JSON.** El derecho de portabilidad se cubre con exportación a CSV para el interesado a petición. Formatos más ricos son v2.
- **No tiene app móvil nativa.** La web es responsive y suficiente.
- **No tiene chat en vivo ni asistente conversacional.** El contacto es por formulario, WhatsApp (enlace, no integración de mensajería completa) o teléfono.
- **No tiene sistema de reservas online con pago.** La operación se cierra fuera de la plataforma. En la ficha se puede indicar "reservada" como estado, pero no hay flujo de pago.
- **No tiene búsqueda de texto libre.** Solo filtros estructurados. Añadir búsqueda semántica es una feature futura, no del MVP.
- **No tiene recomendaciones inteligentes.** El bloque "inmuebles relacionados" en la ficha se calcula por reglas simples (misma zona + tipo similar + rango de precio ±20%), no por ML.
- **No tiene panel de usuario final público.** No hay login público. No hay área de cliente. Los visitantes son anónimos hasta que envían un formulario, y a partir de ahí son un lead gestionado internamente.
- **No integra con portales externos** (Idealista, Fotocasa, Habitaclia). Publicación cruzada es feature post-MVP.
- **No tiene webhooks salientes.** La integración con consumidores externos es pull-based (ellos hacen GET) más un push transaccional acotado (ellos hacen POST del lead). No hay eventos de Domio empujados a terceros.
- **No tiene sistema de comisiones o de contabilidad interna.** El seguimiento comercial vive en el CRM externo del equipo o en su ERP, no en Domio.

> ⚠️ **Test de fragilidad de la cadena:** si algún subagente propone añadir "chat en vivo porque mejoraría la conversión", "favoritos porque los usuarios lo esperan", "un endpoint público de leads porque simplificaría integraciones futuras", "una vista lista alternativa al grid porque Idealista la tiene", "un editor markdown porque es más flexible", o cualquier otra sugerencia razonable, debe rechazarse. La cadena **no inventa valor**. Ejecuta el spec. Cualquier ampliación pasa por revisión de este documento.

---

## 8. Criterios transversales de calidad

Toda feature derivada de este brief debe cumplir, sin excepción:

- **SEO** — páginas públicas indexables, SSR/ISR, metadatos únicos con fallback determinista, slugs descriptivos generados desde el contenido, datos estructurados `RealEstateListing` desde bloques editoriales, sitemap XML autogenerado (solo `PUBLISHED`), Open Graph, Twitter Cards, canonical, revalidación incremental cuando el operador guarda.
- **Accesibilidad** — WCAG AA. Lighthouse a11y ≥ 90 en cada página pública. Focus visible siempre. Contraste verificado. Formularios con labels asociados. Navegación por teclado completa. Textos alternativos obligatorios. Visor de imágenes navegable con flechas. `aria-live` en actualizaciones dinámicas (badge de leads no leídos, resultado de filtros).
- **Rendimiento** — Lighthouse performance ≥ 80 en home, catálogo y ficha. Imágenes responsive con `next/image` o equivalente sobre R2. Fuentes cargadas con `next/font`. Paginación de catálogo basada en cursor (no offset) para rendimiento con catálogos grandes. Sin waterfalls evitables.
- **Multi-tenant DNA respetada** — toda query observable en código pasa por repositorio context-aware con `SET LOCAL` en transacción. Tests explícitos de aislamiento entre tenants sintéticos.
- **RGPD** — consentimiento explícito registrado en cada lead, base legal declarada, política de privacidad accesible, banner de cookies conforme, texto de cesión informado en formularios cuyos leads salen de la plataforma de captura, endpoint interno para ejercicio de derechos ARSOP (exportación CSV + borrado en cascada).
- **Resiliencia** — el subsistema de captura de leads no depende de la disponibilidad de servicios auxiliares (emails, revalidación externa). Un fallo de Resend no impide crear un lead; se encola la notificación.
- **Observabilidad** — errores en Sentry con contexto de tenant. Logs estructurados. Métricas de uso de la API pública por key.
- **Contrato HTTP** — schemas zod versionados, tests de contrato que garantizan no-divergencia entre publisher y consumidor, OpenAPI autogenerado (interno).
- **Tests** — TDD en lógica de dominio (repositorios, servicios, reglas). E2E de los cuatro recorridos principales (visitante, editor, agente, consumidor API). Cobertura ≥ 90% en capa de tenancy.
- **Backoffice no indexable** — `robots.txt`, `noindex`, subdominio dedicado, autenticación obligatoria.
- **Seguridad** — API keys hasheadas en BD, nunca en logs. Rate limiting por key. Captcha en formularios públicos. Validación zod en cada límite (client, server, API).

---

## 9. Glosario

| Término                          | Definición                                                                                                          |
|----------------------------------|---------------------------------------------------------------------------------------------------------------------|
| **Domio**                        | Este proyecto. Plataforma de comercialización inmobiliaria.                                                          |
| **Tenant**                       | Comercializadora cliente de la plataforma. Hoy solo una activa. El modelo soporta N.                                 |
| **TenantContext**                | Estructura que viaja con cada request y establece `SET LOCAL app.tenant_id` en transacción.                          |
| **Promoción**                    | Unidad principal del catálogo. Conjunto de viviendas comercializadas juntas.                                         |
| **Promoción de portafolio (`portfolio`)** | Obra nueva o inmueble del portafolio institucional. Aval y auditoría. Se expone por API pública.            |
| **Captación externa (`external`)** | Inmueble captado de terceros. Solo visible en `domio.com`.                                                         |
| **Tipología**                    | Variante de vivienda dentro de una promoción. Plano, superficies, dormitorios, baños, año, cert. energético, precios.|
| **Unidad**                       | Vivienda concreta dentro de una tipología. Estado `AVAILABLE` / `RESERVED` / `SOLD` / `RENTED`.                      |
| **Amenity**                      | Característica de una tipología. Set cerrado (ascensor, terraza, piscina, garaje, calefacción, A/C…).                |
| **Modo de privacidad del mapa**  | `EXACT` (punto exacto) o `AREA` (círculo de zona aproximada). Editable por promoción. Regla dura.                    |
| **Bloque editorial**             | Componente estructurado del contenido de una promoción con schema Zod y editor propio en el backoffice.              |
| **Lead**                         | Registro de una persona interesada. Nace en `domio.com` (`commercial`) o cedido por API (`institutional`).           |
| **Source del lead**              | Canal de origen. `"commercial"` o `"institutional"`. No cambia el tratamiento operativo, sí la trazabilidad legal.   |
| **Agente asignado**              | Miembro del equipo comercial responsable de una promoción y de sus leads derivados.                                  |
| **ARSOP**                        | Derechos del interesado bajo RGPD: acceso, rectificación, supresión, oposición, portabilidad.                        |
| **Backoffice**                   | Herramienta interna en `panel.domio.com`. Auth.js v5. RLS activo. No indexable.                                      |
| **API pública**                  | `/api/v1/` versionada. Autenticación por API key. Consumida por sistemas externos autorizados.                       |
| **Consumidor externo**           | Sistema autenticado por API key que consume `/api/v1/`. La API es agnóstica de su identidad.                         |
| **RLS**                          | Row-Level Security de PostgreSQL. Aplica el filtro de tenant a nivel de motor.                                       |
| **Revalidación incremental**     | ISR de Next.js: la ficha pública se refresca cuando el backoffice guarda un cambio.                                  |

---

**Versión:** 2.0 — Julio 2026
**Cambios desde v1.2:** ampliación completa del modelo del dominio (tipos de inmueble cerrados, estados de venta/alquiler diferenciados, datos físicos completos, amenities como set cerrado, planos como categoría separada, modo de privacidad del mapa, SEO editable por-inmueble). Bloques editoriales estructurados. Detalles UX del catálogo (cursor pagination, ordenación, slug descriptivo, botón WhatsApp, botón compartir, inmuebles relacionados con regla concreta). Detalles del backoffice (autoguardado, drag&drop galería, marca leído/no leído, badge leads no leídos, filtros, configuración de contacto editable). Cadena RGPD completa con ARSOP. Regla de resiliencia entre subsistemas. Vista grid única y editor estructurado como no-objetivos explícitos.
**Propósito:** Fuente de verdad del producto Domio.
**Documento vivo:** cambios pasan por revisión y quedan versionados en este archivo, nunca por deriva de la cadena.
