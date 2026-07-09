# roadmap.md — Plan de features

> Generado por el subagente `architect` a partir de constitution.md, product.md, architecture.md y design.md.
> Actualizable. Cada feature se implementa en una iteración del ciclo `/speckit-*`.

---

## Orden de implementación

| # | Feature | Tamaño | Dependencias | Descripción |
|---|---------|--------|--------------|-------------|
| F001 | bootstrap-project | S | — | Scaffold del proyecto Next.js 15 + tooling obligatorio |
| F002 | db-schema-and-migrations | M | F001 | Schema Drizzle completo: tablas, RLS, índices compuestos, migraciones |
| F003 | visual-system-implementation | M | F001 | Tokens CSS Tailwind v4, fuentes, primitives base (Button, Input, Skeleton, Toast, MediaImage) |
| F004 | tenant-context-and-isolation | M | F002 | TenantContext (Public/Authenticated/ApiKey), repos context-aware con SET LOCAL, tests de aislamiento |
| F005 | auth-and-session | M | F002, F004, F007 | Auth.js v5, credentials provider, login page, middleware de protección, JWT con tenant_id+role, flujo de recuperación de contraseña |
| F006 | media-service-r2 | M | F001 | Cloudflare R2 client, upload/delete/transform, signed URLs, componente MediaImage |
| F007 | email-queue-and-resend | S | F001, F002 | Tabla email_queue, cliente Resend, worker de procesamiento, templates de notificación |
| F008 | rate-limiting-and-observability | S | F001 | Upstash Redis/Vercel KV para rate limiting, Sentry config (client + serverless), tenant_id en eventos |
| F009 | domain-constants-and-seed | S | F002 | Sets cerrados (PROPERTY_TYPES, AMENITIES, estados), zod schemas, seed data (tenant, admin, datos demo) |
| F010 | backoffice-shell | M | F003, F005, F009 | Layout panel (sidebar 240px slate), auth guard, badge leads no leídos, routing por rol |
| F011 | catalog-management | M | F010, F009 | CRUD promociones + tipologías + unidades, generación determinista de slugs, autoguardado de borrador, histórico de cambios |
| F012 | editorial-blocks-editor | M | F011 | Editor de bloques estructurados (descripción, calidades, zonas comunes, ubicación, plazos), Zod por block_type, constraint por kind |
| F013 | media-gallery-backoffice | M | F006, F011 | Upload server-side a R2, reordenar galería (drag & drop), marcar portada, alt_text obligatorio, categoría planos separada |
| F014 | leads-management | M | F010, F011 | Bandeja de leads: CRUD, máquina de estados (NEW→WON/LOST), marcas leído/no-leído por usuario, notas internas, scope por agente vía RLS |
| F015 | rgpd-compliance | M | F014 | Registro de consentimiento (consent_records), ejercicio de derechos ARSOP (export CSV + borrado en cascada), trazabilidad en arsop_requests |
| F016 | team-and-api-keys | M | F005, F007, F010 | Gestión de equipo (CRUD usuarios, roles, invitación por email, soft-delete), gestión de API keys (creación, revocación, hash, rate limit) |
| F017 | global-content-editor | M | F010 | Editor de contenidos globales (home, sobre, equipo, legales), configuración de contacto global, historial versionado con revert |
| F018 | public-shared-chrome | M | F003, F009 | Nav (fixed, over-hero/glass on scroll), Footer (slate 4-col), skip-to-content, layout público base |
| F019 | home-publica | M | F018, F011, F017 | Home completa SSR con 9 bloques: hero+TrustCard, cómo-trabajamos grid, sobre-Domio compare, portafolio destacado, métricas+testimonios, CTA band, FAQ accordion |
| F020 | portafolio-catalogo | M | F018, F011 | Catálogo público SSR: filter bar, grid 3-col de PropertyCards, cursor pagination, empty state compuesto, URL compartible con filtros |
| F021 | detalle-inmueble-core | M | F018, F011, F012, F013 | Ficha pública SSR/ISR: photo hero, infobar 4-col, renderizado de bloques editoriales, tabla de tipologías, mapa con modo de privacidad (EXACT/AREA), SEO meta + datos estructurados RealEstateListing |
| F022 | detalle-inmueble-engagement | M | F007, F008, F014, F017, F021 | Formulario de contacto (zod client+server), botón WhatsApp con mensaje predefinido, botón compartir (OG), inmuebles relacionados (regla: misma zona+tipo+precio ±20%) |
| F023 | contacto-y-sobre | S | F018, F017 | Páginas /contacto (formulario + quick-band + mapa) y /sobre (contenido desde bloques globales) |
| F024 | api-publica-v1 | M | F004, F007, F008, F011, F015 | GET /api/v1/promociones (filtro obligatorio kind=portfolio, cursor pagination) + POST /api/v1/leads/institutional (consentimiento RGPD, email queue), auth por API key, rate limiting, serialización que respeta modo de privacidad |
| F025 | seo-sitemap-meta | M | F019, F020, F021 | Sitemap XML autogenerado (solo PUBLISHED), robots.txt diferenciado (público vs panel), canonical URLs, Open Graph + Twitter Cards, meta tags con fallback determinista |
| F026 | e2e-tests | M | F019–F025 | Playwright E2E con Page Object Model para los 5 recorridos: visitante público, editor de catálogo, agente comercial, consumidor API, administrador |
| F027 | contract-tests | M | F024 | Tests de contrato para /api/v1/*, schemas zod versionados, espejo del consumidor, OpenAPI autogenerado (interno), test de no-divergencia bloqueante en CI |

---

## Detalle de cada feature

---

### F001 · bootstrap-project

**Tamaño**: S (1–2 días)
**Dependencias**: ninguna

**Descripción**: Scaffold del proyecto con `create-next-app` (Next.js 15, App Router, TypeScript strict). Configurar pnpm, ESLint (sonarjs + jsx-a11y), Prettier, Husky (pre-commit: lint+typecheck, pre-push: test+build), Vitest + Playwright con límites operacionales (singleFork, workers:1), tsconfig con exclusión de tests del build de producción, `.env.example` con todas las variables declaradas en architecture.md §8.

**Criterio de salida**: `pnpm dev` arranca, `pnpm lint` y `pnpm typecheck` pasan limpios, `pnpm test:run` ejecuta (aunque sin tests aún), estructura `app/` + `src/` + `tests/` creada según architecture.md §5.

---

### F002 · db-schema-and-migrations

**Tamaño**: M (3–5 días)
**Dependencias**: F001

**Descripción**: Schema Drizzle completo con todas las tablas del MVP según architecture.md §6: `tenants`, `users`, `api_keys`, `promociones` (con location PostGIS, map_privacy_mode, location_approx, draft_payload, seo_title, seo_description, **construction_status** — enum `ON_PLAN`/`IN_CONSTRUCTION`/`READY` NULL, aplicable principalmente a `kind='portfolio'`), `tipologias` (con amenities JSONB, energy_cert, plan_asset_id), `unidades`, `promocion_content_blocks`, `media_assets`, `leads`, `lead_read_marks`, `lead_notes`, `lead_history`, `consent_records`, `arsop_requests`, `content_blocks`, `contact_config`, `content_history`, `email_queue`. RLS activado en toda tabla de dominio con políticas que filtran por `app.current_tenant_id`. Índices compuestos con `tenant_id` como primera columna (según §6.6). Índice adicional `(tenant_id, construction_status)` en `promociones` para filtro de catálogo público. Índice GIST espacial en `promociones.location`. Constraint parcial UNIQUE en `media_assets.is_cover`. Migraciones con `drizzle-kit`.

**Criterio de salida**: `pnpm db:migrate` ejecuta sin errores y crea todas las tablas, índices y políticas RLS en la rama de desarrollo de Neon. Tipos TypeScript derivados del schema compilan sin errores.

---

### F003 · visual-system-implementation

**Tamaño**: M (3–5 días)
**Dependencias**: F001

**Descripción**: [FUNDACIONAL — design.md existe] Materializar el sistema de diseño visual en código. Cargar fuentes vía `next/font/google` (Fraunces con ejes opsz, Inter, Geist Mono). Definir CSS custom properties en `:root` de `app/globals.css` con toda la paleta (ink, parchment, slate, terracota, status) y tokens semánticos (bg, fg, border, accent) según design.md §2. Mapear a `@theme inline` de Tailwind v4. Construir los primitives base compartidos en `src/shared/components/`:

- **Button** — variantes primary/secondary/ghost/link con estados hover/active/disabled/focus-visible y motion según §7.1.
- **Input / FormField** — label asociado, estados focus/error/disabled, help text, mensaje de error vía `aria-describedby` (§7.2).
- **Skeleton** — `role="status"`, `aria-hidden="true"`, shimmer animado con gradient parchment, reduced-motion estático (§17).
- **Toast** — `role="alert"`, `aria-live="polite"`, variantes success/error/warning/info.
- **MediaImage** — wrapper sobre `next/image` con fallback robusto (`linear-gradient(135deg, ink-2, ink)`), alt_text obligatorio, transformaciones R2.

Además, instalar el set de iconos funcionales: `@phosphor-icons/react` (regular weight, 1.5px stroke) según design.md §14. Tamaños canónicos: 20×20 (nav), 16×16 (chips e inline), 12×12 (meta). Los iconos decorativos junto a texto llevan `aria-hidden="true"`; los iconos como único control llevan `aria-label`.

Sin esta feature, toda feature de UI posterior reinventa tokens y el diseño deriva. Toda feature de UI posterior **depende** de F003.

**Design tokens**: Completo — paleta §2, tipografía §3, espacio §4, radii/borders/elevation §5, motion §6, focus-ring §2.3, z-index scale §19.

**Criterio de salida**: `globals.css` con todas las custom properties y `@theme inline`, fuentes cargadas sin FOIT, primitives renderizados en una ruta de prueba, tokens auditables en DevTools.

---

### F004 · tenant-context-and-isolation

**Tamaño**: M (3–5 días)
**Dependencias**: F002

**Descripción**: Implementar los tres tipos de `TenantContext` según architecture.md §2.3: `PublicContext` (solo ve `status='PUBLISHED'`), `AuthenticatedContext` (desde sesión Auth.js, con `user_id`, `tenant_id`, `role`), `ApiKeyContext` (desde API key, aplica filtro `kind='portfolio' + status='PUBLISHED'`). Clase base `TenantAwareRepository` que encapsula el patrón `db.transaction(tx => { tx.execute(SET LOCAL app.current_tenant_id); … })`. Middleware que resuelve el contexto una vez por request y lo propaga por inyección. Suite `tests/isolation/` con dos tenants sintéticos que verifica que operaciones desde cada contexto nunca ven datos del otro. Esta suite es bloqueante en CI.

**Criterio de salida**: Tests de aislamiento pasan con dos tenants concurrentes operando sobre las mismas tablas sin fuga de datos cruzados. `SET LOCAL` (nunca `SET`) usado en toda transacción.

---

### F005 · auth-and-session

**Tamaño**: M (3–5 días)
**Dependencias**: F002, F004, F007

**Descripción**: Configurar Auth.js v5 con credentials provider (email + password). JWT con `tenant_id`, `user_id`, `role` embebidos. Página de login (`/panel/login`) con diseño editorial según design.md §13.5. Middleware de autorización: todas las rutas bajo `app/(auth)/` requieren sesión válida; ruteo condicional por rol. Sesión con expiración 2h + renovación deslizante. Cierre de sesión invalida JWT. Protección CSRF. Middleware de backoffice inyecta `X-Robots-Tag: noindex`.

**Flujo de recuperación de contraseña**: rutas `/panel/forgot-password` (formulario con email) y `/panel/reset-password?token=…` (formulario con nueva contraseña). Al solicitar recuperación, se genera un token firmado con TTL corto (30 minutos) y se encola un email vía `email_queue` (template "recuperación de contraseña") con enlace de reset. El token se invalida tras un uso o al expirar. Rate limiting por email + IP para prevenir enumeración. Validación de fortaleza de contraseña según constitution.md §5 (12 chars mínimo, mayúscula + minúscula + número + carácter especial).

**Criterio de salida**: Login funcional con credenciales contra tabla `users`, sesión JWT con claims correctos, rutas protegidas redirigen a login, rutas por rol deniegan acceso con 403. Flujo de recuperación de contraseña end-to-end funcional (solicitud → email → reset → login con nueva contraseña).

---

### F006 · media-service-r2

**Tamaño**: M (3–5 días)
**Dependencias**: F001

**Descripción**: Cliente Cloudflare R2 con interfaz S3. `MediaService` en `src/infrastructure/media/` con métodos: `uploadImage`, `signedReadUrl`, `reorderGallery`, `setCover`, `delete`. Upload siempre desde servidor (el cliente envía binario a endpoint interno; el servidor firma y coloca en R2). URLs firmadas con TTL corto para documentos privados. Transformaciones bajo demanda (WebP/AVIF, tamaños responsive). `MediaImage` componente que consume el servicio y aplica fallback robusto. Alt_text NOT NULL en schema; el servicio rechaza uploads sin alt_text. Categorización por `kind`: IMAGE_GALLERY, PLAN, DOCUMENT.

**Criterio de salida**: Upload de imagen desde el servidor a bucket R2 de desarrollo funciona; `MediaImage` renderiza correctamente con URL de R2; fallback se activa ante error de carga.

---

### F007 · email-queue-and-resend

**Tamaño**: S (1–2 días)
**Dependencias**: F001, F002

**Descripción**: Cliente Resend para envío transaccional de emails. Tabla `email_queue` con estados PENDING/SENT/FAILED y contador de reintentos. Worker de procesamiento (`pnpm worker:emails` en desarrollo, función serverless con cron trigger en Vercel en producción) que procesa la cola con backoff exponencial (máx 5 intentos). Templates de notificación: lead nuevo asignado a agente, confirmación de contacto a lead, invitación a nuevo miembro del equipo, recuperación de contraseña.

**Regla crítica**: El servicio de creación de lead **nunca** invoca a Resend directamente — siempre encola en `email_queue` en la misma transacción. Si Resend está caído, el lead se persiste igualmente (§6.3 product.md, §7.13 architecture.md).

**Criterio de salida**: Email encolado correctamente en BD, worker procesa y llama a Resend en modo test, reintentos con backoff funcionan, un fallo de Resend no impide la persistencia del registro de origen.

---

### F008 · rate-limiting-and-observability

**Tamaño**: S (1–2 días)
**Dependencias**: F001

**Descripción**: Rate limiting vía Upstash Redis / Vercel KV: contadores por API key en `/api/v1/*` y por IP en formularios públicos (login, contacto). Límites configurables. Degradación graceful: si el almacén de rate limiting no responde, se alerta vía log pero no se bloquea la request (§1 architecture.md). Sentry: configuración client + serverless con `tracesSampleRate` 0.1 en prod, 1.0 en dev. Wrapper que inyecta `tenant_id` en cada evento capturado. Error boundaries en React. DSN en variable de entorno.

**Criterio de salida**: Rate limiting funcional con contadores en Upstash/KV. Errores capturados en Sentry con tag `tenant_id`. Error boundary renderiza fallback sin crashear la app.

---

### F009 · domain-constants-and-seed

**Tamaño**: S (1–2 días)
**Dependencias**: F002

**Descripción**: Constantes centralizadas en `src/shared/constants/`: `PROPERTY_TYPES` (piso, ático, casa, chalet, dúplex, estudio, local, oficina, nave, garaje, trastero, terreno), `AMENITIES` (ascensor, terraza, balcón, piscina, garaje, trastero, calefacción, aire_acondicionado, amueblado, mascotas_permitidas, accesible, zonas_verdes, seguridad), enums para `PromotionKind` (`portfolio`/`external`), `PromotionStatus` (`DRAFT`/`PUBLISHED`/`RESERVED`/`SOLD`/`RENTED`/`WITHDRAWN`), **`OperationType` (`SALE`/`RENT`/`SALE_AND_RENT`)**, **`ConstructionStatus` (`ON_PLAN`/`IN_CONSTRUCTION`/`READY`)**, `LeadStatus` (`NEW`/`CONTACTED`/`IN_NEGOTIATION`/`WON`/`LOST`), `LeadSource` (`commercial`/`institutional`), `LeadChannel` (`FORM`/`WHATSAPP`), `MapPrivacyMode` (`EXACT`/`AREA`), `EnergyCert` (`A`..`G`/`EN_TRAMITE`), `BlockType` (`DESCRIPCION_GENERAL`/`MEMORIA_CALIDADES`/`ZONAS_COMUNES`/`UBICACION_SERVICIOS`/`PLAZOS_GARANTIAS`), `MediaKind` (`IMAGE_GALLERY`/`PLAN`/`DOCUMENT`), `UserRole` (`ADMIN`/`OPERATOR`/`AGENT`). Zod schemas de dominio que referencian estos sets. Script `db:seed` que inserta: 1 tenant por defecto, 1 admin, 2 agentes, 2 operadores, 8 promociones demo (4 portfolio con `construction_status` variados + 4 external con `construction_status='READY'`, con tipologías, unidades, bloques editoriales y media_assets de placeholder), 5 leads demo, configuración de contacto inicial.

**Criterio de salida**: Constantes y schemas compilan. `pnpm db:seed` puebla la BD de desarrollo con datos demo verificables.

---

### F010 · backoffice-shell

**Tamaño**: M (3–5 días)
**Dependencias**: F003, F005, F009

**Descripción**: Layout del backoffice en `app/(auth)/panel/layout.tsx`: sidebar fijo 240px con fondo slate (`bg.inverted`), items de navegación con estado activo (border-left terracota 3px), secciones: Dashboard, Catálogo, Leads, Equipo, Contenidos, API Keys, ARSOP. Auth guard que redirige a login si no hay sesión. Routing condicional por rol: AGENT no ve secciones de operador, OPERATOR no ve bandeja de leads. Badge de leads no leídos en el nav: endpoint `GET /api/internal/leads/unread-count` que consulta `lead_read_marks` filtrando por `user_id` de la sesión. Cliente refresca cada 30s con `aria-live="polite"`. Header superior con nombre del usuario y logout. `X-Robots-Tag: noindex` + `robots.txt` excluyendo `/panel/*`.

**Dashboard (`panel/page.tsx`)**: página de bienvenida con enlaces rápidos a las secciones del backoffice, contador de leads no leídos (grande, en `numeral-lg`), lista de las 5 últimas promociones editadas por el usuario actual, atajos a las acciones más frecuentes ("Nueva promoción", "Ver bandeja"). **Sin gráficos, sin analítica de tráfico, sin métricas de conversión** (regla product.md §7 "no dashboard de estadísticas / analítica"). Es una landing operativa, no un tablero de business intelligence.

**Design tokens**: Sidebar: `bg.inverted` (#2E2B27), texto `fg.on-inverted` (#FFFCF7), active: `border-l-[3px] border-accent`. Nav items: `type.body-sm weight-medium`.

**Criterio de salida**: Backoffice renderiza sidebar + área de contenido con datos de sesión reales. Badge numérico refleja leads no leídos del agente autenticado. Cambios de rol muestran/ocultan secciones correctamente. Panel no es indexable (verificar headers + robots.txt).

---

### F011 · catalog-management

**Tamaño**: M (3–5 días)
**Dependencias**: F010, F009

**Descripción**: CRUD completo de promociones, tipologías y unidades desde el backoffice. `PromocionRepository` context-aware con todos los métodos de consulta y mutación. Slugs generados por función pura determinista desde `(tipo, operacion, municipio, dormitorios, id_corto)` — se calculan al publicar y **nunca** cambian en ediciones posteriores (regla §7.18 architecture.md). Formulario de edición organizado en secciones: **Identidad** (nombre, tipo, operación, kind), **Estado comercial** (status, `construction_status` con opciones `ON_PLAN`/`IN_CONSTRUCTION`/`READY` — con warning suave no bloqueante si la etiqueta contradice el `entrega_estimada` del bloque `plazos_garantias`), **Ubicación** (isla, municipio, dirección, coordenadas, `map_privacy_mode`), **SEO** (campos opcionales `seo_title` y `seo_description`; si están vacíos, se aplica el fallback determinista descrito en F025), **Agente asignado**. Autoguardado de borrador: cada 30s, `PATCH /api/internal/promociones/:id/draft` actualiza `draft_payload` (JSONB). Al publicar, el draft se aplica y se limpia. Al descartar, se pone a NULL. El autoguardado nunca modifica los campos publicados (regla §7.14). Histórico de cambios en `promocion_history` (inmutable: sin UPDATE/DELETE vía RLS). Listado con filtros (estado, kind, ubicación, agente, `construction_status`). Validación zod en cliente y servidor (mismo schema). Revalidación incremental: al guardar, disparar `revalidateTag('promocion:{slug}')` y `revalidateTag('catalog')`.

**Criterio de salida**: CRUD completo operativo desde backoffice. Slugs generados y persistentes. Autoguardado funcional (sobrevive a refresco). Cambios en backoffice disparan revalidación ISR en superficies públicas.

---

### F012 · editorial-blocks-editor

**Tamaño**: M (3–5 días)
**Dependencias**: F011

**Descripción**: Editor de bloques editoriales estructurados para promociones. Cada `block_type` tiene su formulario específico y schema Zod:

- **`descripcion_general`** — 2–3 párrafos con formato limitado (negrita, cursiva, listas).
- **`memoria_calidades`** — lista de ítems (icono + título + descripción corta).
- **`zonas_comunes`** — lista de ítems (nombre + descripción). **Solo visible/habitable si `kind='portfolio'`**.
- **`ubicacion_servicios`** — lista de distancias (servicio + distancia).
- **`plazos_garantias`** — entrega estimada, licencias, aval, auditoría. **Solo visible/habitable si `kind='portfolio'`**.

Constraint en BD + validación en servicio: rechazar INSERT de `ZONAS_COMUNES` o `PLAZOS_GARANTIAS` en promociones `kind='external'` (regla §7.6). El editor bloquea guardar como publicado si el payload no valida contra el Zod del `block_type`. Sin editor markdown libre — solo bloques estructurados (regla product.md §7).

**Criterio de salida**: Los 5 tipos de bloque se crean, editan, reordenan y eliminan desde el backoffice. Constraints por `kind` funcionan: no se puede añadir `ZONAS_COMUNES` a una captación externa. Validación zod rechaza payloads inválidos.

---

### F013 · media-gallery-backoffice

**Tamaño**: M (3–5 días)
**Dependencias**: F006, F011

**Descripción**: Gestión de medios desde el backoffice de una promoción. Upload de imágenes: el cliente envía el binario a `POST /api/internal/media/upload`; el servidor firma y coloca en R2 vía `MediaService`, crea el registro en `media_assets`. Reordenación por drag & drop con `sort_order` atómico (método que reasigna todos los `sort_order` en una transacción). Marcar imagen como portada (`is_cover`) con constraint parcial UNIQUE. Texto alternativo obligatorio por imagen: el backend bloquea guardar si `alt_text` está vacío (regla §5.1 product.md). Categorización: subida de planos como `kind='PLAN'` (separados de la galería principal). Previsualización con `MediaImage`. El editor bloquea publicar la promoción si falta `alt_text` en alguna imagen o si no hay al menos una imagen (regla §5.2).

**Criterio de salida**: Upload, reordenación y marca de portada funcionales. Sin `alt_text`, el sistema rechaza el guardado. Planos aparecen en categoría separada de la galería de imágenes.

---

### F014 · leads-management

**Tamaño**: M (3–5 días)
**Dependencias**: F010, F011

**Descripción**: Bandeja de leads en el backoffice. `LeadRepository` context-aware con scope por rol: AGENT solo ve leads cuyo `assigned_agent_id` coincide con `current_setting('app.current_user_id')` (política RLS, regla §7.8). Máquina de estados: NEW → CONTACTED → IN_NEGOTIATION → WON | LOST. Cambios de estado registrados en `lead_history` (inmutable: sin UPDATE/DELETE). Notas internas vía `lead_notes` (agente escribe notas cronológicas). Marcas de leído por-usuario en `lead_read_marks` (PK compuesta `lead_id, user_id`): al abrir un lead, se inserta/actualiza `read_at`. Badge del nav se decrementa. Al reasignar un lead a otro agente (vía administrador), se borran las `lead_read_marks` del lead — queda "no leído" para el nuevo agente (regla §7.9). Filtros en bandeja: estado, source (`commercial`/`institutional`), rango de fechas, promoción asociada, búsqueda por nombre/email. Exportación CSV (agentes exportan solo sus leads; administradores exportan todo el tenant).

**Criterio de salida**: Leads visibles solo para el agente asignado (RLS). Transiciones de estado registradas en histórico inmutable. Marcas de leído por-usuario precisas. Reasignación reinicia estado "no leído". Badge del nav refleja el conteo real.

---

### F015 · rgpd-compliance

**Tamaño**: M (3–5 días)
**Dependencias**: F014

**Descripción**: Consentimiento RGPD como dato del lead: `consent_records` con `legal_basis`, `text_accepted`, `ip`, `user_agent`, `created_at`. Inmutable (sin UPDATE/DELETE). Sin consentimiento válido, el lead no se persiste — `422` en API, error visible en formulario (regla §7.4). Ejercicio de derechos ARSOP desde el backoffice (solo ADMIN):

- **Export** — genera CSV con todos los datos del lead (datos personales + notas + histórico + consentimientos) y lo almacena en R2. Registra en `arsop_requests` con `request_type='EXPORT'` y `result_asset_id`.
- **Delete** — borrado en cascada en una transacción única: `lead_read_marks` → `lead_notes` → `lead_history` → `consent_records` → `leads`. Registra en `arsop_requests` con `request_type='DELETE'`.

Trazabilidad completa en `arsop_requests` con timestamp, usuario que ejecutó, tipo de solicitud y referencia al asset (CSV) cuando aplica (§7.17).

**Criterio de salida**: Lead sin consentimiento rebotado (422). Exportación CSV funcional con todos los datos del lead. Borrado en cascada elimina todo rastro sin romper integridad referencial. Trazabilidad en `arsop_requests`.

---

### F016 · team-and-api-keys

**Tamaño**: M (3–5 días)
**Dependencias**: F005, F007, F010

**Descripción**: Gestión del equipo (solo ADMIN):

- CRUD de usuarios: crear con email + rol (ADMIN/OPERATOR/AGENT). El sistema envía email de invitación con enlace de establecimiento de contraseña (nunca crea contraseñas). Editar rol y datos. Desactivar es soft-delete (`is_active = false`) para preservar histórico de asignaciones. Reasignación de promociones queda registrada en `promocion_history`.
- Listado con filtros por rol y estado.

Gestión de API keys (solo ADMIN):

- Crear: genera clave aleatoria, la hashea con bcrypt/argon2 y almacena `key_hash`. Muestra la clave en claro **una sola vez**.
- Revocar: `is_active = false`. No se puede recuperar la clave original.
- Configurar rate limit por key (`rate_limit_per_min`).
- Listado con `last_used_at` y estado.

**Criterio de salida**: CRUD de usuarios con flujo de invitación por email. Soft-delete no rompe histórico. API keys hasheadas, clave en claro mostrada solo al crear, revocación funcional.

---

### F017 · global-content-editor

**Tamaño**: M (3–5 días)
**Dependencias**: F010

**Descripción**: Editor de contenidos comerciales globales (solo ADMIN y OPERATOR):

- **Bloques por página** (`content_blocks`): home (hero claim, destacados), sobre Domio, equipo, aviso legal, política de privacidad, política de cookies. Cada bloque tiene `page_key`, `block_key` y `payload` JSONB validado con Zod específico.
- **Configuración de contacto global** (`contact_config`): teléfono, email, dirección, horario, número de WhatsApp, mensaje predefinido de WhatsApp. Fila única por tenant.

Historial versionado en `content_history`: cada cambio guarda snapshot del payload con timestamp y autor. Permite revertir a cualquier versión anterior. Revalidación incremental: al guardar, disparar `revalidateTag` de las páginas afectadas.

**Design tokens**: Formularios según FormField §7.2. Editor tipo CMS ligero (sin WYSIWYG complejo — inputs estructurados por tipo de contenido).

**Criterio de salida**: Contenidos globales editables desde backoffice. Cambios se reflejan en superficies públicas tras guardar (ISR). Historial permite revertir a versiones anteriores. Configuración de contacto se refleja en cabecera, footer y fichas.

---

### F018 · public-shared-chrome

**Tamaño**: M (3–5 días)
**Dependencias**: F003, F009

**Descripción**: Componentes compartidos de la superficie pública que aparecen en todas las páginas:

- **Nav** (fixed, z-100): transparente sobre hero (`over-hero`: texto blanco), transiciona a glass al hacer scroll past 40px (`backdrop-filter blur(20px)`, bg `rgba(251,248,243,.85)`, shadow `0 1px 0 line-soft`). Logo Fraunces italic 20px. Links con underline animado (0→100% width). CTA pill (bg ink, fg bone, padding 11px 22px, radius pill). Hamburguesa en móvil (< 768px) con drawer.
- **Footer** (slate `bg.inverted`): grid `1.6fr 1fr 1fr 1fr` desktop. Tagline editorial en Fraunces italic con em en `warm-amber`. Columnas de enlaces con `caption` headers. Legal row con borde superior. Padding `120px 56px 40px`.
- **Skip-to-content**: enlace visible al focus para navegación por teclado.
- **Layout público base**: `<main id="main-content">`, `<html style={{ colorScheme: 'light' }}>`, sin dark mode.

**Design tokens**: Nav §7.7, Footer §7.10. Sin dark mode §12.4.

**Criterio de salida**: Nav y Footer renderizados en todas las páginas públicas. Nav cambia correctamente entre modo over-hero y glass. Footer con tagline y columnas. Skip-to-content funcional. Lighthouse a11y ≥ 90 en layout base.

---

### F019 · home-publica

**Tamaño**: M (3–5 días)
**Dependencias**: F018, F011, F017

**Descripción**: Página Home (`app/(public)/page.tsx`) renderizada SSR/ISR. Composición completa según design.md §13.1 con 9 bloques en orden vertical:

1. **Hero** (full-bleed 100vh): fotografía arquitectónica con overlay multicapa (radial + linear warm-ink + grain SVG). Grid `1.4fr 1fr`: copy bottom-left (H1 `display-xl` + eyebrow glass-pill + lead 52ch + 2 botones primary/secondary), TrustCard bottom-right (3 numerales Fraunces 26px con datos del tenant). Trust-marquee band inferior (14px, blurred glass, terracota icons).
2. **Cómo trabajamos** (how-grid 4-col): `sec-head` + 4 celdas con `gap: 1px` (fondos line-soft). Cada celda: numeral Fraunces italic 52px + icono circular + heading + body.
3. **Sobre Domio** (split `1fr 1.05fr`): fotografía arquitectónica 4/5 aspect con tag overlay a la izquierda, tabla comparativa "Agencia tradicional vs Domio" a la derecha (border-top 2px accent en columna Domio).
4. **Portafolio destacado** (grid `1.3fr 1fr 1fr`): header flex space-between + 3 PropertyCards (1 featured con span 2 rows). Datos desde `promociones` con `status='PUBLISHED'` y `kind='portfolio'`.
5. **Confianza** (`.sec-bone`): centered `sec-head` + métricas 4-col (numeral-hero 72px Fraunces) + testimonios 3-col (quote Fraunces italic 140px opacidad 0.10 como ::before) + logos de certificaciones.
6. **CTA final** (full-bleed photograph, min-height 620px): copy left-center (padding-left 96px, max-width 740px). H2 `display-lg` con em en `warm-amber`. Botón primary (white bg → terracota hover).
7. **FAQ** (grid `1fr 1.2fr`): `sec-head` izquierda, accordion derecha (6-8 preguntas, plus circular rota 45° al abrir).
8. **Footer** — ya implementado en F018, aquí solo se integra.

Contenidos de bloques 1, 3, 5 (métricas+testimonios), 6 y 7 se leen de `content_blocks` (F017). Bloque 4 consulta el catálogo (F011). Motion: scroll-reveal con stagger 80ms, property cards lift on hover, FAQ accordion. `prefers-reduced-motion` respetado. Lighthouse Performance ≥ 80, Accessibility ≥ 90.

**Design tokens**: Composición completa §13.1 + motion catalog §6 + responsive §18.

**Criterio de salida**: Home renderiza completa con datos reales (no placeholders). Todos los bloques presentes. Scroll-reveal funcional. Lighthouse cumple umbrales. Sin imágenes rotas ni cajas negras (regla constitution.md §6 suelo de calidad visual).

---

### F020 · portafolio-catalogo

**Tamaño**: M (3–5 días)
**Dependencias**: F018, F011

**Descripción**: Página de catálogo (`app/(public)/portafolio/page.tsx`) renderizada SSR. Header band: H1 `display-md` "Portafolio" + lead 52ch. Filter bar (`bg.surface`, radius surface, sticky top on scroll): filtros por isla, municipio, tipo de inmueble, operación (`SALE`/`RENT`/`SALE_AND_RENT`), rango de precio, dormitorios, baños, amenities (checkboxes), **estado de obra (mapea directamente a `construction_status`: `ON_PLAN` → "sobre plano", `IN_CONSTRUCTION` → "en construcción", `READY` → "entrega inmediata")**. `<form role="search">` con labels asociados. Active chips con bg `accent.subtle` + borde accent. Clear button. URL cambia con filtros — es compartible. Result count anunciado vía `aria-live="polite"`. Paginación **basada en cursor** (nunca offset, regla §7 architecture.md): cursor codifica `(sort_key, id)`. Ordenación: precio (asc/desc), fecha de publicación, relevancia. Grid de PropertyCards: 3-col ≥ xl, 2-col ≥ md, 1-col mobile. Empty state compuesto (eyebrow + heading-sm Fraunces + body-sm + botón secondary "Ver todo el portafolio"). Solo vista grid (sin vista lista — regla product.md §7).

**Design tokens**: PropertyCard §7.3 (variants standard), FilterBar §7.4, empty state §8, layout §13.2.

**Criterio de salida**: Catálogo con filtros funcionales, URL compartible, cursor pagination correcta, grid responsive, sin resultados muestra empty state compuesto. Solo promociones `PUBLISHED` visibles.

---

### F021 · detalle-inmueble-core

**Tamaño**: M (3–5 días)
**Dependencias**: F018, F011, F012, F013

**Descripción**: Página de detalle de promoción (`app/(public)/inmuebles/[slug]/page.tsx`) renderizada SSR con revalidación ISR. Componentes principales:

1. **Detail hero** (520px fixed height): fotografía exterior con overlay cálido. Address line + badges (LIVE con dot olive, HOT con bg terracota) + H1 `display-md` + pills de tipo/operación/estado.
2. **Infobar** (4-col grid, `bg.surface`, border-right dividers): Precio/m², Superficie, Plazas/Dormitorios, Entrega/Año. Valores en `numeral-lg` (Fraunces italic 32px). Esta es la primera aparición de la firma numeral en la ficha.
3. **Bloques editoriales** renderizados desde `promocion_content_blocks` según su `block_type`: descripción general (prosa con formato limitado), memoria de calidades (4×2 grid con iconos terracota + título Fraunces + descripción), zonas comunes (solo si `kind='portfolio'`), ubicación y servicios (lista de distancias), plazos y garantías (solo si `kind='portfolio'`, con timeline de 4 hitos: dot ink done / dot terracota next, línea conectora).
4. **Tabla de tipologías**: columnas nombre, superficie, dormitorios, baños, precio, estado. Datos desde `tipologias`. Planos renderizados en columna separada con `MediaImage` (kind='PLAN').
5. **Mapa**: instalación de `maplibre-gl` como cliente de mapas + tiles de OpenStreetMap (sin dependencia comercial de Google Maps, según architecture.md §1 "Servicios NO"). El componente `MapPromocion` respeta `map_privacy_mode`: si `EXACT`, muestra punto en coordenadas reales; si `AREA`, muestra círculo aproximado (centroide del municipio desde `location_approx`). **Nunca** expone coordenadas exactas en HTML, JSON embebido ni schema.org si `map_privacy_mode='AREA'` (regla §7.3).
6. **SEO**: `<title>` y `<meta description>` desde `seo_title`/`seo_description`, con fallback determinista: `{tipo} en {operacion} en {zona} — {n_dormitorios} dormitorios | Domio`. Datos estructurados `RealEstateListing` de schema.org generados **desde los bloques editoriales estructurados**, no desde texto libre. Open Graph y Twitter Cards con imagen de portada. Canonical URL. Slug en la URL es el persistente (no cambia con renombres — regla §7.18).

**Design tokens**: Composición §13.3, numeral-lg §3.4, tipografía §12.3.

**Criterio de salida**: Ficha renderiza todos los bloques con datos reales. Mapa respeta modo de privacidad (verificar que coordenadas exactas no aparecen en HTML con `AREA`). SEO meta tags generados con fallback funcional. Structured data válido según Google Rich Results Test. Sin imágenes rotas. Revalidación ISR funcional (cambio en backoffice → ficha actualizada).

---

### F022 · detalle-inmueble-engagement

**Tamaño**: M (3–5 días)
**Dependencias**: F007, F008, F014, F017, F021

**Descripción**: Componentes de interacción y conversión en la ficha de detalle:

1. **Formulario de contacto**: validación zod en cliente y servidor (mismo schema). Campos: nombre, email, teléfono, tipología de interés (opcional, select), mensaje. Consentimiento RGPD explícito con checkbox + texto legal. Al enviar, crea lead con `source='commercial'`, `channel='FORM'`. El consentimiento se registra en `consent_records` en la misma transacción. Si falta consentimiento, error visible en el formulario (no se persiste). Protegido con rate limiting por IP + captcha (sin degradar accesibilidad). Confirmación: "Solicitud recibida. Nuestro equipo te contactará en 24-48h." Email de confirmación al lead vía `email_queue`. Notificación al agente asignado.
2. **Botón de WhatsApp**: enlace `https://wa.me/{number}?text={prefilled_message}` con referencia de la promoción. El clic también genera un lead (`source='commercial'`, `channel='WHATSAPP'`) si el usuario previamente aceptó el envío de datos.
3. **Botón de compartir**: copia enlace + Open Graph para WhatsApp, Twitter, email. No genera lead.
4. **Inmuebles relacionados**: al pie de la ficha, hasta 4 PropertyCards con inmuebles de misma zona + tipo similar + rango de precio ±20%. Consulta espacial vía PostGIS (GIST index en `promociones.location`). Solo `PUBLISHED`.

**Criterio de salida**: Formulario crea lead con consentimiento RGPD. WhatsApp abre con mensaje predefinido correcto. Compartir funcional con OG tags. Relacionados muestra inmuebles relevantes de la misma zona.

---

### F023 · contacto-y-sobre

**Tamaño**: S (1–2 días)
**Dependencias**: F018, F017

**Descripción**: Páginas estáticas SSR desde `content_blocks`:

- **Contacto** (`/contacto`): Header centrado (padding-top 140px) con eyebrow + H1 + lead. Quick-band 4-col (`bg.surface` celdas con icono + caption + valor) con datos de `contact_config` (teléfono, email, dirección, horario). Main grid `1.4fr 1fr`: formulario de contacto genérico (izquierda, bone card) + mapa con ubicación de la oficina + datos de contacto (derecha). Footer integrado.
- **Sobre Domio** (`/sobre`): Contenido editorial desde `content_blocks` con `page_key='about'`. Layout editorial con fotografía arquitectónica.

**Design tokens**: Contacto §13.4. Formulario según FormField §7.2.

**Criterio de salida**: Páginas renderizan contenido desde `content_blocks`. Formulario de contacto funcional. Datos de contacto desde `contact_config`. Lighthouse a11y ≥ 90.

---

### F024 · api-publica-v1

**Tamaño**: M (3–5 días)
**Dependencias**: F004, F007, F008, F011, F015

**Descripción**: API pública versionada bajo `app/api/v1/`. Autenticación por API key en cabecera `X-API-Key`. `ApiKeyContext` resuelto en middleware de API.

**GET /api/v1/promociones**: Lista paginada de promociones. Filtros obligatorios aplicados a nivel de repositorio (no de endpoint): `kind='portfolio'` + `status='PUBLISHED'` — un consumidor externo **nunca** ve captaciones externas ni borradores aunque los pida explícitamente (regla §7.1). Respuesta paginada por cursor. Serialización que respeta `map_privacy_mode`: si `AREA`, el campo `location` se omite y solo se devuelve `location_approx` (regla §7.3). Rate limiting por API key. Headers de caché (CDN). Zod en response schema.

**POST /api/v1/leads/institutional**: Crea un lead cedido desde un consumidor externo. Payload validado con zod: nombre, email, teléfono, mensaje, promocion_id, tipologia_id (opcional), consentimiento RGPD (`legal_basis` + `text_accepted`). Si falta consentimiento → `422 Unprocessable Entity` con detalle del campo faltante. Source automático: `'institutional'`. Asignación de agente por reglas de la promoción. Creación vía `email_queue` (resiliente a fallos de Resend, regla §7.13). **No se reintenta automáticamente**: el consumidor es responsable de informar al usuario final si falla. Rate limiting por API key.

**Contract tests**: Schemas zod versionados en `tests/contract/v1/`. Test de no-divergencia: si un PR modifica el schema de respuesta de forma incompatible, el test falla y bloquea el merge (regla §7.12). OpenAPI autogenerado desde schemas zod, accesible solo internamente (`/api/internal/docs`).

**Criterio de salida**: GET filtra correctamente (portfolio+PUBLISHED). POST crea lead con consentimiento. Rate limiting funcional por key. Contract tests bloquean cambios incompatibles. Modo de privacidad del mapa respetado en todas las respuestas JSON.

---

### F025 · seo-sitemap-meta

**Tamaño**: M (3–5 días)
**Dependencias**: F019, F020, F021

**Descripción**: Configuración SEO completa para todas las superficies públicas:

- **Sitemap XML** (`app/sitemap.ts`): autogenerado incluyendo solo promociones `PUBLISHED`. Incluye home, portafolio, fichas de detalle, contacto, sobre. Con `lastmod` desde `updated_at`. Frecuencia: daily para portafolio, weekly para fichas, monthly para páginas estáticas.
- **Robots.txt** (`app/robots.ts`): permite indexar `/(public)/*`, bloquea `/(auth)/*`, `/*/api/*`. Backoffice tiene además `X-Robots-Tag: noindex` (ya implementado en F005).
- **Metadata API de Next.js**: `generateMetadata` en cada página pública con title, description, openGraph, twitter, canonical. Fallback determinista para fichas sin `seo_title`/`seo_description` (regla product.md §4). Open Graph image desde portada de la promoción o imagen por defecto del tenant.
- **Datos estructurados**: `RealEstateListing` de schema.org en cada ficha, autogenerado desde bloques editoriales estructurados. `Organization` en home. `BreadcrumbList` en fichas.
- **Lighthouse audit**: verificar Performance ≥ 80 y Accessibility ≥ 90 en home, portafolio y al menos 3 fichas de detalle.

**Criterio de salida**: Sitemap XML válido y accesible. Páginas públicas indexables, backoffice no. Meta tags únicos por página. Datos estructurados válidos según Google Rich Results Test. Lighthouse cumple umbrales.

---

### F026 · e2e-tests

**Tamaño**: M (3–5 días)
**Dependencias**: F019, F020, F021, F022, F023, F024, F025

**Descripción**: Tests end-to-end con Playwright y Page Object Model (una clase por página, encapsula selectores y acciones — constitution.md §3). Los 5 recorridos principales de product.md §5:

1. **Visitante público**: navega home → portafolio (aplica filtros, ve resultados) → ficha detalle (ve galería, infobar, bloques editoriales, tipologías) → envía formulario de contacto con consentimiento → recibe confirmación. Verifica que lead aparece en backoffice como no leído.
2. **Editor de catálogo**: login como OPERATOR → listado de catálogo con filtros → edita promoción (cambia avance de obra, sube 2 imágenes con alt_text, reordena) → autoguardado de borrador → publica → verifica cambios en ficha pública.
3. **Agente comercial**: login como AGENT → ve badge de leads no leídos → abre lead (se marca leído, badge decrementa) → cambia estado a CONTACTED → añade nota → cambia a WON. Verifica que solo ve sus leads (no los de otro agente).
4. **Consumidor API**: autentica con API key → GET /api/v1/promociones (verifica que solo devuelve portfolio+PUBLISHED) → POST /api/v1/leads/institutional (con consentimiento) → verifica lead creado en backoffice con source='institutional'. Verifica rechazo 422 si falta consentimiento. Verifica que captación externa no aparece en API.
5. **Administrador**: login como ADMIN → crea nuevo agente (recibe email de invitación) → asigna promociones → reasigna lead (verifica que lead aparece como no leído para nuevo agente) → exporta lead (CSV) → ejerce derecho ARSOP de borrado (verifica borrado en cascada) → gestiona API keys → edita configuración de contacto global (verifica cambio en footer público).

Limpiar estado (DB) antes de cada test. Selectores accesibles: `getByRole` > `getByTestId` > `getByText`.

**Criterio de salida**: Los 5 recorridos pasan en CI. Page Object Model usado consistentemente. Sin selectores frágiles.

---

### F027 · contract-tests

**Tamaño**: M (3–5 días)
**Dependencias**: F024

**Descripción**: Suite de tests de contrato para la API pública v1 en `tests/contract/v1/`. Schemas zod versionados para request y response de cada endpoint. Espejo del consumidor: tests que simulan el comportamiento del sistema consumidor externo y verifican que la respuesta de Domio cumple el contrato. Casos:

- **GET /promociones**: respuesta con schema correcto, filtrado obligatorio (sin external ni no-PUBLISHED), cursor pagination, modo de privacidad (sin coordenadas exactas si AREA), rate limiting.
- **POST /leads/institutional**: payload válido → 201, sin consentimiento → 422 con campo específico, payload malformado → 400, rate limiting.
- **No-divergencia**: test que compara el schema actual contra el snapshot versionado. Si hay cambios incompatibles, falla y bloquea merge (regla §7.12).
- **OpenAPI**: generación automática desde schemas zod, endpoint interno `/api/internal/docs` (no expuesto en producción pública).

**Criterio de salida**: Tests de contrato pasan para todos los endpoints v1. Snapshot versionado. CI bloquea merges que rompan el contrato.

---

## Cuestiones detectadas

Ninguna ambigüedad seria detectada tras la revisión v1.1. Los cuatro documentos de memoria (constitution, product v2.0, architecture v2.0, design) son coherentes entre sí y no presentan contradicciones que bloqueen la planificación.

---

**Versión:** 1.1 — Julio 2026
**Cambios desde v1.0:**
- CRIT-1: 5 dependencias implícitas ahora declaradas (F007→F002, F005→F007, F016→F007, F022→F007+F008+F017, F024→F007+F008)
- CRIT-2: enum `OperationType` completado con `SALE_AND_RENT`
- CRIT-3: nueva columna `construction_status` en `promociones` (`ON_PLAN`/`IN_CONSTRUCTION`/`READY`), reflejada en F002 (schema+índice), F009 (constante+seed), F011 (editor+warning suave si contradice `plazos_garantias`), F020 (filtro del catálogo público)
- IMP-1: instalación de `@phosphor-icons/react` en F003 con tamaños y reglas de a11y
- IMP-2: instalación de `maplibre-gl` en F021 (evita dependencia de Google Maps con billing)
- IMP-3: campos `seo_title` y `seo_description` explícitos en el editor de F011, con fallback determinista
- IMP-4: dashboard del backoffice descrito como landing operativa (enlaces + contador + últimas editadas), sin analítica
- MIN-1: flujo de recuperación de contraseña añadido a F005 con template en `email_queue`

**Generado por:** `architect` subagent a partir de constitution.md v1.0, product.md v2.0, architecture.md v2.0, design.md.
**Features totales:** 27 (S: 7, M: 20, L: 0 tras splits)