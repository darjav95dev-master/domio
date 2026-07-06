# architecture.md — Decisiones técnicas del proyecto **Domio**

> **Proyecto de producción.** Plataforma de comercialización inmobiliaria.
> **Repositorio:** `domio` — cara comercial pública, backoffice interno y API pública versionada.
> **Modo de operación: SaaS multi-servicio.** Domio depende de servicios externos gestionados (Neon, Cloudflare R2, Sentry, Resend, Vercel) y esa dependencia es deliberada: cada uno resuelve un problema operativo que no queremos gestionar internamente. La lista es cerrada y cualquier ampliación pasa por revisión de este archivo.
> **Relación con `product.md`:** este documento describe **cómo** se implementa lo que `product.md` describe **qué es**. Si hay conflicto, gana `product.md` — este documento se ajusta.

---

## 1. Stack técnico declarado

| Capa                  | Tecnología                                       | Notas                                                                                            |
|-----------------------|--------------------------------------------------|--------------------------------------------------------------------------------------------------|
| Framework             | Next.js 15 (App Router)                          | SSR/ISR obligatorio en superficies públicas; revalidación incremental disparada por backoffice   |
| Lenguaje              | TypeScript strict                                | Sin `any` implícitos, sin `@ts-ignore` sin justificación                                         |
| Estilos               | Tailwind CSS v4 (`@theme inline`)                | Tokens semánticos en `app/globals.css`; sistema de diseño en `shared/components`                 |
| ORM                   | Drizzle ORM                                      | Migraciones con `drizzle-kit`; tipos derivados del schema                                        |
| Base de datos         | PostgreSQL 16 en **Neon** (con PgBouncer)        | RLS activado. Transaction pooling: **`SET LOCAL` obligatorio dentro de transacción**             |
| Extensión geoespacial | PostGIS                                          | Punto geográfico en `promociones.location`. Consultas espaciales para "inmuebles relacionados"   |
| Autenticación         | Auth.js v5 (credentials + JWT)                   | Solo para backoffice. Sesión con `tenant_id` y `user_id` embebidos                               |
| API pública           | Route Handlers + zod                             | Autenticación por API key en cabecera. Rate limiting por key                                     |
| Almacenamiento medios | Cloudflare R2 (S3-compatible)                    | URLs firmadas emitidas en servidor. Transformaciones vía Workers o `next/image` sobre R2         |
| Envío de emails       | Resend (con cola de reintento)                   | Notificaciones a agentes, confirmaciones a leads, invitaciones. Cola persistente en BD           |
| Rate limiting         | Upstash Redis (o Vercel KV)                      | Contadores por API key y por IP en formularios públicos                                          |
| Observabilidad        | Sentry (frontend + serverless)                   | `tracesSampleRate` 0.1 en producción. `tenant_id` en cada evento                                 |
| Hosting               | Vercel                                           | Preview por PR, producción tras merge a `main`                                                   |
| Validación            | Zod                                              | Mismo schema en cliente, servidor y API pública. Bloques editoriales validados por Zod           |
| Tests                 | Vitest + Playwright                              | Coverage 80%, E2E de los 5 recorridos principales, tests de contrato en `tests/contract/`        |

### Servicios externos: SÍ

Domio integra los siguientes servicios de forma explícita. Cada uno tiene un propósito único y su ausencia impide operar:

- **Neon** — base de datos gestionada con PostGIS. Sustituible teóricamente por cualquier PostgreSQL 16 con transaction pooling, en la práctica es Neon.
- **Cloudflare R2** — almacenamiento de imágenes, planos y documentos. Toda imagen del catálogo pasa por aquí. No hay imágenes en filesystem ni URLs externas fijas.
- **Sentry** — error tracking en producción con contexto de tenant. Sin Sentry, un error en un sistema multi-tenant no es depurable.
- **Resend** — envío transaccional de emails. Su caída **no impide crear leads**: las notificaciones se encolan en tabla `email_queue` con reintento diferido (§6).
- **Upstash Redis / Vercel KV** — almacén de contadores para rate limiting. La caída degrada a modo "sin límite" con alerta, pero no bloquea la API.
- **Vercel** — hosting con preview environments por PR y producción tras merge a `main`. Sirve también como CDN de assets estáticos.

### Servicios externos: NO

Domio **no integra** ninguno de los siguientes servicios en el alcance del proyecto:

- **BaaS propietarios** (Supabase, Firebase). El modelo multi-tenant con RLS explícita es incompatible con las abstracciones opacas de estos servicios.
- **CMS externos** (Contentful, Sanity, Strapi). El contenido editorial de promociones y las páginas comerciales globales viven en base de datos propia, editables desde el backoffice, con schemas Zod estrictos.
- **Editores markdown genéricos**. El contenido editorial de promociones se compone de bloques estructurados con schema Zod, no texto libre. Rompe la regla del §6.5 del `product.md`.
- **Servicios de mapa de pago** (Google Maps API con billing activo). Se usa MapLibre + tiles de OpenStreetMap para la ubicación en mapa. Preserva RGPD y no compromete el proyecto a un billing externo dependiente del tráfico.
- **Portales inmobiliarios de terceros** (Idealista, Fotocasa, Habitaclia). Publicación cruzada es feature post-MVP; hoy no hay integración.
- **Herramientas de chat en vivo o soporte** (Intercom, Zendesk). Contacto es por formulario + WhatsApp + teléfono.
- **Frameworks de estado pesados** (Redux, MobX, Zustand global). Preferir Server Components + React Context puntual + `useReducer` local. El estado global genuino de Domio es mínimo.
- **Herramientas de analítica interna** (Mixpanel, Amplitude). El MVP no incluye dashboard de estadísticas; Google Analytics u OSS equivalente cubre la web pública.

> Si la cadena propone añadir cualquiera de estas cosas "porque simplificaría X", es una **señal de fragilidad crítica** que se documenta en el log de observación. Cualquier ampliación pasa por revisión de este documento.

### Lo que NO se permite en Domio

Además de las prohibiciones universales de `constitution.md`:

- Renderizado client-side en superficies públicas (rompe SEO, no negociable).
- Queries fuera de repositorios context-aware.
- URLs externas directas en `<img src>` (todo pasa por R2 vía componente controlado).
- Editores de contenido tipo WYSIWYG libre para promociones (rompe schema Zod).
- Paginación con `OFFSET` en catálogo público (usar cursor).
- Secretos en el código, en el repositorio o en logs de Sentry.
- Endpoints públicos sin rate limiting.
- Escritura en base de datos sin transacción con `SET LOCAL app.tenant_id`.
- Envío síncrono a Resend en el path crítico de crear lead (siempre encolado).

---

## 2. Arquitectura de datos: single-tenant con multi-tenant DNA

Domio se opera hoy como **single-tenant** (un único tenant comercializador activo) pero el modelo está diseñado para multi-tenancy desde el primer día. Esta es la propiedad arquitectónica más importante del sistema y no se relaja bajo ninguna circunstancia.

### 2.1 Reglas absolutas del modelo de datos

1. **Toda tabla de dominio lleva `tenant_id` NOT NULL** (FK a `tenants`). Sin excepciones, aunque solo exista un tenant hoy.
2. **Todos los índices son compuestos con `tenant_id` como primera columna**.
   Ejemplo: `CREATE INDEX idx_promociones_tenant_status ON promociones (tenant_id, status)`.
3. **Toda tabla de dominio tiene RLS activado** con políticas que filtran por `tenant_id` contra `app.current_tenant_id`.
4. **Excepción: tablas puente N:M** (por ejemplo, futuras `promocion_tags`) no llevan `tenant_id` ni RLS propio. La protección de tenant es transitiva: la FK a las tablas padre (que sí llevan `tenant_id`) garantiza que solo se accede a tuplas de join cuyos extremos pertenecen al tenant. Añadir `tenant_id` aquí duplicaría el dato y crearía riesgo de inconsistencia entre la FK y el tenant declarado.
5. **El agente NUNCA escribe una query directa** sin pasar por el repositorio context-aware (§2.3).
6. **Migraciones con Drizzle Kit.** El agente nunca toca el esquema manualmente en la base de datos.
7. **Aislamiento verificado con tests.** Existe una suite explícita (`tests/isolation/`) que crea dos tenants sintéticos, ejecuta operaciones desde el contexto de cada uno y verifica que ninguno ve datos del otro. Esta suite es bloqueante en CI.

### 2.2 RLS con `SET LOCAL` en transacción — regla obligatoria y crítica

Domio usa Neon con PgBouncer en **transaction pooling**. En este modo, la conexión física del cliente al servidor se comparte entre requests, y cualquier `SET` sin `LOCAL` **fuga contexto** de un tenant a otro. La regla `SET LOCAL` dentro de transacción no es una preferencia estética: es la única forma correcta de usar RLS bajo PgBouncer.

```typescript
// ❌ PROHIBIDO (en Neon fuga contexto entre requests)
await db.execute(sql`SET app.current_tenant_id = ${tenantId}`);
const result = await db.select().from(promociones);

// ✅ OBLIGATORIO
await db.transaction(async (tx) => {
  await tx.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);
  return tx.select().from(promociones);
});
```

El repositorio context-aware encapsula esta lógica. El código de aplicación nunca toca `SET LOCAL` directamente. La suite `tests/isolation/` verifica que dos requests concurrentes con tenants diferentes nunca ven datos cruzados.

### 2.3 Repositorios context-aware

Todo acceso a datos pasa por un repositorio que recibe el `TenantContext` y abre una transacción con `SET LOCAL`. Patrón obligatorio:

```typescript
// src/infrastructure/db/repositories/promocion.repository.ts
export class PromocionRepository {
  constructor(private readonly ctx: TenantContext) {}

  async findBySlug(slug: string): Promise<Promocion | null> {
    return this.ctx.withTransaction(async (tx) => {
      const [row] = await tx.select().from(promociones).where(eq(promociones.slug, slug));
      return row ?? null;
    });
  }
}
```

El `TenantContext` se resuelve en el middleware **una sola vez por request** y se propaga por inyección. **Nunca se lee del cliente.** Los tipos concretos de contexto son:

- **`PublicContext`** — resuelto por el host `domio.com`. Solo ve promociones `status='PUBLISHED'`. Sin sesión.
- **`AuthenticatedContext`** — resuelto en `panel.domio.com` desde la sesión Auth.js. Lleva `user_id`, `tenant_id`, `role`. Aplica scopes por rol (§4.2). Además, `SET LOCAL app.current_user_id` para políticas RLS que filtran por agente asignado.
- **`ApiKeyContext`** — resuelto en `/api/v1/*` desde la cabecera de API key. Lleva `api_key_id`, `tenant_id`. Aplica el filtro obligatorio `kind='portfolio'`, `status='PUBLISHED'` en lecturas del catálogo.

---

## 3. Provisión de medios — Cloudflare R2

Toda imagen, plano y documento del catálogo vive en Cloudflare R2. La abstracción es un **servicio de medios** que el resto del sistema consume; nadie toca R2 directamente.

```typescript
// src/infrastructure/media/media.service.ts
export class MediaService {
  async uploadImage(input: UploadImageInput): Promise<MediaAsset> { /* … */ }
  async signedReadUrl(assetId: string, opts?: TransformOptions): Promise<string> { /* … */ }
  async reorderGallery(promocionId: string, ordered: string[]): Promise<void> { /* … */ }
  async setCover(promocionId: string, assetId: string): Promise<void> { /* … */ }
  async delete(assetId: string): Promise<void> { /* … */ }
}
```

**Reglas:**
- **Upload siempre desde servidor.** El cliente envía el binario a un endpoint interno; el servidor firma y coloca en R2. Nunca se emiten credenciales de R2 al navegador.
- **URLs firmadas con TTL corto** para lecturas de documentos privados (planos privados, avales). Las URLs de imágenes públicas del catálogo pueden ser públicas de R2 detrás del CDN.
- **Transformaciones bajo demanda** (WebP/AVIF, tamaños responsive) vía integración de `next/image` con R2 como remote pattern.
- **Texto alternativo obligatorio.** El schema del asset lleva `alt_text` NOT NULL. El backoffice bloquea guardar sin él.
- **Categoría diferenciada.** Cada asset lleva `kind`: `IMAGE_GALLERY`, `PLAN`, `DOCUMENT`. Los planos y documentos **no aparecen en la galería principal** de la ficha pública; tienen su propio bloque visual y (para documentos) URLs firmadas.
- **Reordenación** vía `sort_order` en la tabla `media_assets`. Un método atómico reasigna los `sort_order` de todo el conjunto en una transacción para evitar estados inconsistentes.
- **Marca de portada** vía `is_cover: boolean`. Existe un constraint parcial `UNIQUE (tenant_id, owner_id) WHERE is_cover = true` para garantizar una única portada por promoción.
- **Fallback controlado.** El componente `MediaImage` renderiza un placeholder deterministico (gradient tintado con el tenant) si la imagen falla a cargar. Nunca aparece una imagen rota ni un box negro.
- **Está prohibido** poner URLs externas directas en `<img src>` en cualquier parte del HTML. Todo pasa por `MediaImage` o `next/image` apuntando a R2.

El componente público (`MediaImage`) es la única superficie de consumo. Si en el futuro se cambia R2 por otro proveedor S3-compatible, cambia solo la implementación del servicio; el componente y sus consumidores no se tocan.

---

## 4. Superficies del producto

Domio tiene **tres superficies** en el alcance de este proyecto. Cada una tiene su tratamiento técnico específico.

### 4.1 Web pública comercial — `app/(public)/`

- Renderizado **SSR/ISR** obligatorio (SEO crítico).
- **Sin sesión de usuario.** Toda lectura va con un `PublicContext` que solo ve registros con `status='PUBLISHED'`.
- Lighthouse Performance 80+ y Accessibility 90+ obligatorios en home, catálogo y ficha.
- **Paginación basada en cursor** en catálogo (no offset). El cursor codifica `(sort_key, id)` para orden estable.
- **Slugs descriptivos** generados por función pura desde `(tipo, operacion, municipio, dormitorios, id_corto)` — por ejemplo `piso-en-venta-en-santa-cruz-3hab-a4c9`. Se calculan en el momento de publicar y se persisten en `promociones.slug`.
- Datos estructurados `RealEstateListing` de schema.org en cada ficha, **generados desde los bloques editoriales estructurados** (no desde texto libre).
- Sitemap XML autogenerado incluyendo solo `PUBLISHED`.
- Revalidación incremental: al guardar en backoffice, se dispara `revalidateTag('promocion:{slug}')` y `revalidateTag('catalog')`.
- **Modo de privacidad del mapa respetado a todos los niveles**: si `map_privacy_mode='AREA'`, ni el HTML servido, ni el JSON de la API, ni el schema.org exponen coordenadas exactas — solo el centroide del municipio o un círculo aproximado.

### 4.2 Backoffice — `app/(auth)/`

- **Autenticación con Auth.js v5.** Credentials provider (email + password). JWT con `tenant_id`, `user_id`, `role`.
- **Middleware de autorización.** Todas las rutas bajo `(auth)/` requieren sesión válida; el middleware resuelve `AuthenticatedContext` y ejecuta `SET LOCAL app.current_user_id` en cada transacción.
- **Roles**:
  - `ADMIN` — ve y opera todo dentro del tenant. Gestiona equipo, API keys, configuración de contacto global.
  - `OPERATOR` — CRUD de catálogo y contenidos. No accede a la bandeja de leads.
  - `AGENT` — solo ve sus promociones y sus leads asignados. RLS + scope por rol.
- **Badge de leads no leídos** en la barra de navegación — endpoint dedicado `GET /internal/leads/unread-count` que consulta `lead_read_marks` filtrando por `user_id` de la sesión. Cliente refresca cada 30s o vía evento post-mutación.
- **Autoguardado de borrador** en formularios de edición de promoción — cada 30s, envía `PATCH /internal/promociones/:id/draft` que actualiza `promociones.draft_payload` (JSONB, nullable). Al publicar, `draft_payload` se aplica y se limpia. Al descartar, se pone a `NULL`.
- **No indexable**: `robots.txt` + `X-Robots-Tag: noindex` + subdominio dedicado `panel.domio.com`.
- **CSRF** protegido por Auth.js. **XSS** mitigado por escapado de React + validación zod en cada entrada.
- **Sesión con expiración corta** (2h) y renovación deslizante. Cierre de sesión invalida el JWT del lado servidor.

### 4.3 API pública — `app/api/v1/`

- **Autenticación por API key en cabecera** (`Authorization: Bearer <key>` o `X-API-Key`, decisión concreta en el contrato).
- **API keys hasheadas en BD** con bcrypt/argon2. Se muestran solo una vez en el momento de creación.
- **Rate limiting por key** con Upstash Redis / Vercel KV. Límites configurables por key.
- **Zod en cada payload** entrante y saliente. Sin excepciones.
- **Versionado explícito** en la ruta (`/api/v1/`). Una versión nueva se introduce en paralelo, nunca reemplazando en caliente.
- **Filtros obligatorios** aplicados en el `ApiKeyContext`:
  - `kind = 'portfolio'`
  - `status = 'PUBLISHED'`
  Aunque un consumidor pida explícitamente ver captaciones externas o borradores, el contexto los oculta a nivel de repositorio.
- **Serialización que respeta modo de privacidad**: el serializador de promoción **filtra explícitamente** el campo `location` si `map_privacy_mode='AREA'`, devolviendo solo `location_approx` (centroide del municipio o círculo). Los tests de contrato verifican que ninguna respuesta con `AREA` incluye coordenadas exactas.
- **Tests de contrato** en `tests/contract/` con schemas zod versionados y espejo del consumidor. Bloquean CI si divergen.
- **OpenAPI autogenerado** desde los schemas zod, accesible **solo internamente** (no expuesto en producción pública).

> Si la cadena genera una superficie que no está en este §4, ha fallado.

---

## 5. Estructura de carpetas concreta

Aplicando la Scope Rule de la constitución al proyecto:

```
domio/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                            ← home comercial
│   │   ├── portafolio/
│   │   │   └── page.tsx                        ← catálogo con filtros (grid)
│   │   ├── inmuebles/
│   │   │   └── [slug]/
│   │   │       └── page.tsx                    ← ficha de promoción
│   │   ├── sobre/
│   │   │   └── page.tsx
│   │   └── contacto/
│   │       └── page.tsx
│   ├── (auth)/
│   │   └── panel/
│   │       ├── layout.tsx                      ← sidebar + auth guard + badge leads no leídos
│   │       ├── page.tsx                        ← dashboard
│   │       ├── catalogo/                       ← CRUD promociones + editor de bloques
│   │       ├── leads/                          ← bandeja con filtros
│   │       ├── equipo/                         ← gestión de usuarios
│   │       ├── contenidos/                     ← globales + configuración de contacto
│   │       ├── arsop/                          ← ejercicio de derechos RGPD
│   │       └── api-keys/
│   ├── api/
│   │   ├── auth/                               ← Auth.js routes
│   │   ├── v1/                                 ← API pública versionada
│   │   │   ├── promociones/
│   │   │   └── leads/
│   │   └── internal/                           ← endpoints internos del backoffice
│   │       ├── promociones/
│   │       │   └── [id]/draft/                 ← autoguardado
│   │       ├── leads/
│   │       │   └── unread-count/               ← badge del nav
│   │       ├── media/                          ← upload firmado + reorder + set-cover
│   │       └── arsop/                          ← export + delete lead completo
│   ├── layout.tsx
│   ├── globals.css                             ← tokens Tailwind v4 (@theme inline)
│   ├── sitemap.ts
│   └── robots.ts
├── src/
│   ├── shared/
│   │   ├── types/
│   │   ├── constants/                          ← incluye AMENITIES, PROPERTY_TYPES (sets cerrados)
│   │   ├── components/                         ← UI reutilizable (MediaImage, Button, Skeleton, Toast…)
│   │   ├── hooks/
│   │   └── utils/
│   ├── features/
│   │   ├── catalog/                            ← lógica del catálogo público (cursor pagination, related)
│   │   ├── promociones/                        ← CRUD backoffice + editor de bloques estructurados
│   │   ├── leads/                              ← bandeja + estados + marcas leído/no leído
│   │   ├── equipo/                             ← gestión de usuarios
│   │   ├── arsop/                              ← export CSV + borrado en cascada
│   │   └── api-public/                         ← servicios de la API pública
│   ├── context/
│   └── infrastructure/
│       ├── db/
│       │   ├── schema/                         ← Drizzle schemas
│       │   ├── repositories/                   ← context-aware repos
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── media/                              ← Cloudflare R2 client + MediaService
│       ├── auth/                               ← Auth.js config
│       ├── api-keys/                           ← creación, hash, verificación, rate limit
│       ├── email/                              ← Resend client + templates + cola persistente
│       ├── slug/                               ← generador determinista de slugs
│       ├── tenant/                             ← TenantContext + middleware
│       └── observability/                      ← Sentry (frontend + serverless)
├── tests/
│   ├── unit/
│   ├── isolation/                              ← aislamiento tenant vs tenant
│   ├── contract/                               ← contratos API pública
│   └── e2e/
├── drizzle.config.ts
├── .env.example
└── package.json
```

---

## 6. Modelo de datos (esquema lógico)

Tablas del alcance del MVP. Cada una lleva `tenant_id NOT NULL` (excepto puentes N:M) y RLS activado.

### 6.1 Núcleo de acceso

| Tabla                    | Campos clave                                                                                                                              | Notas                                                                              |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `tenants`                | `id`, `slug`, `name`, `created_at`                                                                                                        | Una fila operativa hoy. El modelo soporta N.                                       |
| `users`                  | `id`, `tenant_id`, `email`, `password_hash`, `name`, `role`, `is_active`, `created_at`                                                    | `role`: ADMIN / OPERATOR / AGENT. Auth.js consume esta tabla.                      |
| `api_keys`               | `id`, `tenant_id`, `key_hash`, `name`, `is_active`, `rate_limit_per_min`, `created_by`, `created_at`, `last_used_at`                      | La clave en claro se muestra una sola vez al crear. Nunca se recupera.             |

### 6.2 Catálogo

| Tabla                    | Campos clave                                                                                                                              | Notas                                                                              |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `promociones`            | `id`, `tenant_id`, `slug`, `name`, `kind`, `status`, `operation`, `property_type`, `island`, `municipality`, `address`, `location` (PostGIS), `location_approx` (PostGIS), `map_privacy_mode`, `seo_title` (NULL), `seo_description` (NULL), `assigned_agent_id`, `draft_payload` (JSONB NULL), `created_at`, `updated_at` | `kind`: portfolio/external. `status`: DRAFT/PUBLISHED/RESERVED/SOLD/RENTED/WITHDRAWN. `operation`: SALE/RENT/SALE_AND_RENT. `property_type`: enum cerrado (piso, ático, casa, chalet, dúplex, estudio, local, oficina, nave, garaje, trastero, terreno). `map_privacy_mode`: EXACT/AREA. `location_approx` es el centroide del municipio, se rellena siempre para permitir renderizar en modo `AREA`. `draft_payload` para autoguardado (se limpia al publicar). |
| `tipologias`             | `id`, `tenant_id`, `promocion_id`, `name`, `useful_area`, `built_area`, `floors`, `bedrooms`, `bathrooms`, `year_built`, `energy_cert`, `reference_price_sale`, `reference_price_rent`, `community_fee`, `deposit`, `amenities` (JSONB), `plan_asset_id` | `energy_cert`: enum A..G o EN_TRAMITE. `amenities` es JSONB validado por Zod contra AMENITIES cerrado (ascensor, terraza, balcón, piscina, garaje, trastero, calefacción, aire_acondicionado, amueblado, mascotas_permitidas, accesible, zonas_verdes, seguridad). Precios null → "consultar". `plan_asset_id` FK a `media_assets`. |
| `unidades`               | `id`, `tenant_id`, `tipologia_id`, `identifier`, `status`                                                                                 | `status`: AVAILABLE/RESERVED/SOLD/RENTED. Opcional según promoción.                 |
| `promocion_content_blocks` | `id`, `tenant_id`, `promocion_id`, `block_type`, `payload` (JSONB), `sort_order`, `updated_by`, `updated_at`                             | `block_type`: DESCRIPCION_GENERAL / MEMORIA_CALIDADES / ZONAS_COMUNES / UBICACION_SERVICIOS / PLAZOS_GARANTIAS. `payload` validado por Zod específico del `block_type`. Existe constraint `CHECK` que impide `ZONAS_COMUNES` y `PLAZOS_GARANTIAS` si la promoción es `kind='external'`. |
| `media_assets`           | `id`, `tenant_id`, `owner_type`, `owner_id`, `kind`, `r2_key`, `mime_type`, `size_bytes`, `alt_text`, `sort_order`, `is_cover`, `created_at` | `owner_type`: PROMOCION / TIPOLOGIA / CONTENT. `kind`: IMAGE_GALLERY / PLAN / DOCUMENT. `alt_text` NOT NULL. Constraint parcial `UNIQUE (tenant_id, owner_id) WHERE is_cover = true`. |
| `promocion_history`      | `id`, `tenant_id`, `promocion_id`, `field`, `old_value`, `new_value`, `author_id`, `created_at`                                           | Auditoría inmutable. RLS sin UPDATE/DELETE.                                        |

### 6.3 Leads y RGPD

| Tabla                    | Campos clave                                                                                                                              | Notas                                                                              |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `leads`                  | `id`, `tenant_id`, `promocion_id`, `tipologia_id`, `source`, `channel`, `name`, `email`, `phone`, `message`, `status`, `assigned_agent_id`, `created_at`, `updated_at` | `source`: commercial/institutional. `channel`: FORM/WHATSAPP (solo commercial). `status`: NEW/CONTACTED/IN_NEGOTIATION/WON/LOST. **No lleva marca `is_read` global** — se resuelve por-usuario en `lead_read_marks`. |
| `lead_read_marks`        | `tenant_id`, `lead_id`, `user_id`, `read_at`                                                                                              | Marca de leído por-usuario. Al reasignar un lead, se borran las marcas (queda "no leído" para el nuevo agente). PK compuesta `(lead_id, user_id)`. |
| `lead_notes`             | `id`, `tenant_id`, `lead_id`, `author_id`, `body`, `created_at`                                                                           | Notas internas del agente.                                                         |
| `lead_history`           | `id`, `tenant_id`, `lead_id`, `from_status`, `to_status`, `author_id`, `created_at`                                                       | Inmutable. RLS sin UPDATE/DELETE.                                                  |
| `consent_records`        | `id`, `tenant_id`, `lead_id`, `legal_basis`, `text_accepted`, `ip`, `user_agent`, `created_at`                                            | Registro RGPD por lead. Inmutable.                                                 |
| `arsop_requests`         | `id`, `tenant_id`, `lead_id`, `request_type`, `requested_at`, `processed_by`, `processed_at`, `result_asset_id`                           | `request_type`: EXPORT / DELETE. `result_asset_id` FK a `media_assets` para el CSV exportado. Trazabilidad del ejercicio de derechos. |

### 6.4 Contenidos y configuración global

| Tabla                    | Campos clave                                                                                                                              | Notas                                                                              |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `content_blocks`         | `id`, `tenant_id`, `page_key`, `block_key`, `payload` (JSONB), `updated_by`, `updated_at`                                                 | Contenidos globales (home, sobre, equipo, legales). Distinto de `promocion_content_blocks`. |
| `contact_config`         | `tenant_id` (PK), `phone`, `email`, `address`, `hours`, `whatsapp_number`, `whatsapp_prefilled_message`, `updated_by`, `updated_at`       | Fila única por tenant. Configuración de contacto global que aparece en cabecera, footer y ficha. |
| `content_history`        | `id`, `tenant_id`, `content_type`, `content_key`, `payload_snapshot` (JSONB), `updated_by`, `created_at`                                  | Histórico de cambios en `content_blocks` y `contact_config` (permite revertir).    |

### 6.5 Infraestructura operativa

| Tabla                    | Campos clave                                                                                                                              | Notas                                                                              |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `email_queue`            | `id`, `tenant_id`, `to_email`, `template`, `payload` (JSONB), `status`, `attempts`, `next_attempt_at`, `last_error`, `created_at`, `sent_at` | `status`: PENDING/SENT/FAILED. Cola persistente para desacoplar la creación de lead del envío a Resend. Worker procesa con backoff exponencial (5 intentos máx). |

### 6.6 Índices compuestos obligatorios (extracto)

- `(tenant_id, status)` en `promociones`, `leads`
- `(tenant_id, kind, status)` en `promociones` — sirve al filtro obligatorio de la API pública
- `(tenant_id, slug)` UNIQUE en `promociones`
- `(tenant_id, assigned_agent_id, status)` en `leads` — sirve a la bandeja del agente
- `(tenant_id, email)` UNIQUE en `users`
- `(tenant_id, key_hash)` UNIQUE en `api_keys`
- `(tenant_id, promocion_id)` en `tipologias`, `leads`, `media_assets`, `promocion_content_blocks`
- `(tenant_id, promocion_id, sort_order)` UNIQUE en `media_assets` cuando `kind='IMAGE_GALLERY'`
- `(tenant_id, lead_id, created_at)` en `lead_history`, `lead_notes`
- `(lead_id, user_id)` PK compuesta en `lead_read_marks`
- Índice espacial GIST en `promociones.location` — sirve a "inmuebles relacionados" y consultas espaciales
- `(status, next_attempt_at)` en `email_queue` — sirve al worker de reintento

---

## 7. Reglas de negocio inviolables (técnicamente protegidas)

Estas reglas vienen del dominio (definidas en `product.md`) y se traducen aquí a invariantes técnicas que el agente protege con tests:

1. **Solo `kind='portfolio'` y `status='PUBLISHED'` se exponen por la API pública.** El filtro vive en el `ApiKeyContext` (a nivel de repositorio, no de endpoint). Un test de contrato verifica que ninguna combinación de query devuelve captaciones externas ni borradores.
2. **Las captaciones externas no salen de `domio.com`.** El sitemap XML filtra explícitamente por `kind='portfolio'` en la sección expuesta a consumidores externos; la sección comercial incluye ambas.
3. **El modo de privacidad del mapa se respeta en toda serialización.** Si `map_privacy_mode='AREA'`, ni HTML, ni JSON de la API, ni schema.org exponen coordenadas exactas. Un test de contrato específico verifica que la respuesta de `/api/v1/promociones` con una promoción `AREA` **no contiene** los decimales de `location` — solo `location_approx`.
4. **Sin consentimiento RGPD válido, un lead no se persiste.** El servicio de creación de lead valida `consent_records` en la misma transacción. Si falta o es inválido, `422` en la API pública y error visible en el formulario web. Test unitario cubre esta ruta.
5. **Toda imagen pasa por Cloudflare R2 y tiene `alt_text` NOT NULL.** El schema Drizzle define `alt_text: text().notNull()`. Un test de lint en CI busca `<img src="` en cualquier archivo `.tsx` fuera del componente `MediaImage` y falla si lo encuentra.
6. **Los bloques editoriales tienen schema Zod estricto y respetan la restricción por `kind`.** El repositorio rechaza `INSERT` de `ZONAS_COMUNES` o `PLAZOS_GARANTIAS` en promociones `kind='external'` (constraint en BD + validación previa en servicio). Test unitario verifica ambos caminos.
7. **Las listas de tipos de inmueble y amenities son cerradas.** Los valores viven en `src/shared/constants/PROPERTY_TYPES.ts` y `AMENITIES.ts`. El schema Zod de tipologías y promociones referencia estos sets. Añadir un valor requiere migración explícita + actualización de constantes + PR aprobado.
8. **El agente comercial solo ve sus leads asignados.** La política RLS de `leads` en el rol `AGENT` filtra por `assigned_agent_id = current_setting('app.current_user_id')`. Un test de aislamiento entre agentes verifica esto.
9. **La marca leído/no leído es por-usuario y se reinicia con reasignación.** El servicio de reasignación borra la fila de `lead_read_marks` para el lead reasignado en la misma transacción que actualiza `assigned_agent_id`. Test unitario cubre esto.
10. **El histórico es inmutable.** `lead_history`, `promocion_history` y `consent_records` tienen políticas RLS sin `UPDATE` ni `DELETE`. Solo `INSERT` y `SELECT`. Test de política verifica que un intento de `UPDATE` falla incluso con rol de aplicación.
11. **El backoffice no es indexable.** El middleware inyecta `X-Robots-Tag: noindex, nofollow` en cualquier respuesta bajo `(auth)/`. El `robots.txt` excluye `/panel/*`. Test E2E verifica ambas cosas.
12. **La API pública versionada nunca cambia en caliente.** `tests/contract/v1/` es bloqueante. Si un PR modifica un endpoint de `v1` de forma que rompa el schema, el test falla y el PR no mergea. Una versión nueva vive en paralelo (`/api/v2/`).
13. **La captura de leads es resiliente a fallos de Resend.** El servicio de creación de lead **no invoca a Resend directamente**: encola en `email_queue` en la misma transacción que persiste el lead. Un test verifica que con Resend mockeado a lanzar excepción, el lead se crea correctamente y aparece la fila en `email_queue`.
14. **El autoguardado nunca destruye la versión publicada.** El campo `promociones.draft_payload` es independiente del resto de columnas. Publicar aplica el payload y lo pone a `NULL`. Descartar solo lo pone a `NULL`. Test verifica que un guardado de borrador nunca modifica los campos publicados.
15. **El sistema es single-tenant operativamente, multi-tenant en el modelo.** Toda tabla lleva `tenant_id`. Toda consulta pasa por repositorio context-aware. **No hay shortcuts.** Test de aislamiento entre dos tenants sintéticos bloquea CI.
16. **Errores en producción tienen contexto de tenant.** El wrapper de Sentry inyecta `tenant_id` en cada evento capturado. Un test verifica que un error lanzado dentro de un `TenantContext` llega a Sentry con el tag `tenant_id` correcto.
17. **El ejercicio de derechos ARSOP es trazable.** Cada export/delete queda registrado en `arsop_requests` con timestamp, usuario que lo ejecutó y (en export) referencia al CSV generado en R2. La eliminación borra en cascada: `leads` + `lead_notes` + `lead_history` + `consent_records` + `lead_read_marks` en una transacción única.
18. **Los slugs son deterministas y persistentes.** Se generan una vez al publicar y **no cambian** en ediciones posteriores. Si el operador cambia el nombre de una promoción publicada, el slug antiguo sigue siendo el canonical hasta que se genere una migración explícita con redirect 301. Test verifica que renombrar no rompe URLs indexadas.

---

## 8. Arranque local

Domio requiere credenciales de servicios SaaS para arrancar. El desarrollo local usa las mismas dependencias que producción, con instancias de desarrollo separadas (rama de desarrollo en Neon, bucket de desarrollo en R2, DSN de desarrollo en Sentry, modo test en Resend).

```bash
pnpm install
cp .env.example .env.local          # rellenar con credenciales de desarrollo
pnpm db:migrate && pnpm db:seed
pnpm dev
```

El `.env.example` declara las variables obligatorias:

- `DATABASE_URL` — Neon (rama de desarrollo del proyecto)
- `AUTH_SECRET` — string aleatorio
- `AUTH_URL` — `http://localhost:3000` en dev
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — credenciales de bucket de desarrollo
- `RESEND_API_KEY` — clave de API en modo test
- `SENTRY_DSN` — DSN del proyecto Sentry (env: development)
- `RATE_LIMIT_STORE_URL` — Upstash/KV para rate limiting

**No hace falta** cuenta en Vercel para desarrollar en local, pero el deploy a preview y producción sí la requiere.

Un **worker de background** procesa la cola `email_queue`. En desarrollo se ejecuta como script standalone (`pnpm worker:emails`); en producción es una función serverless con cron trigger de Vercel (cada 1 minuto).

---

## 9. Lo que el agente NUNCA puede hacer en Domio (refuerzo específico)

Además de las prohibiciones universales de `constitution.md`:

- **Nunca** escribir una query SQL fuera de un repositorio context-aware.
- **Nunca** usar `SET` (sin `LOCAL`) para establecer el tenant o cualquier variable de sesión.
- **Nunca** crear una tabla de dominio sin `tenant_id`, sin RLS y sin índice compuesto.
- **Nunca** exponer captaciones externas (`kind='external'`) por la API pública, ni siquiera detrás de un flag o parámetro.
- **Nunca** exponer coordenadas exactas de una promoción con `map_privacy_mode='AREA'` — ni en HTML, ni en JSON, ni en schema.org, ni en logs.
- **Nunca** poner URLs externas directas en `<img src>` del HTML. Todo pasa por `MediaImage` o `next/image` sobre R2.
- **Nunca** almacenar una imagen sin `alt_text`.
- **Nunca** aceptar un `payload` de `promocion_content_blocks` que no valide contra el Zod específico de su `block_type`.
- **Nunca** insertar `ZONAS_COMUNES` o `PLAZOS_GARANTIAS` en una promoción `kind='external'`.
- **Nunca** añadir un valor a `PROPERTY_TYPES` o `AMENITIES` sin migración explícita + PR.
- **Nunca** persistir un lead sin `consent_records` válido en la misma transacción.
- **Nunca** invocar a Resend directamente desde el servicio de creación de lead: siempre vía `email_queue`.
- **Nunca** paginar el catálogo público con `OFFSET`. Cursor obligatorio.
- **Nunca** modificar `/api/v1/*` de forma que rompa el schema versionado. Una versión nueva es `/api/v2/`, en paralelo.
- **Nunca** ejecutar `UPDATE` o `DELETE` sobre `lead_history`, `promocion_history`, `consent_records` o `arsop_requests`.
- **Nunca** subir imágenes al servidor sin pasar por `MediaService` (nada de multipart directo a rutas ad-hoc).
- **Nunca** hacer render client-side de home, catálogo o ficha (rompe SEO).
- **Nunca** exponer OpenAPI, Swagger UI o metadata técnica interna en la superficie pública de producción.
- **Nunca** dejar el backoffice indexable ni accesible sin autenticación.
- **Nunca** cambiar el slug de una promoción publicada sin generar redirect 301.
- **Nunca** editor markdown libre en promociones — bloques estructurados obligatorios.
- **Nunca** capturar errores en Sentry sin contexto de tenant.

---

**Versión:** 2.0 — Julio 2026
**Cambios desde v1.0:** alineación completa con `product.md` v2.0. Ampliación del schema (§6): tabla `promocion_content_blocks` (bloques editoriales estructurados con validación Zod por `block_type` y constraint por `kind`), tabla `lead_read_marks` (marca por-usuario, se reinicia con reasignación), tabla `contact_config` (configuración global editable), tabla `content_history` (revertible), tabla `email_queue` (resiliencia), tabla `arsop_requests` (trazabilidad RGPD). Ampliación de `promociones` con `map_privacy_mode`, `location_approx`, `seo_title`, `seo_description`, `draft_payload`. Ampliación de `tipologias` con `energy_cert`, `floors`, `year_built`, `community_fee`, `deposit`, `amenities` (JSONB validado contra set cerrado). Nuevos estados `RENTED` en `promociones` y `unidades`. Campo `channel` en `leads` (FORM/WHATSAPP). PostGIS añadido al stack (§1). Nuevas reglas técnicamente protegidas (§7): modo de privacidad respetado en serialización, bloques editoriales por `kind`, listas cerradas, marca por-usuario reinicio en reasignación, captura resiliente a Resend caído, autoguardado no destructivo, slugs deterministas. Nuevas prohibiciones específicas (§9).
**Propósito:** Decisiones técnicas de Domio, complementarias a `product.md` y subordinadas a `constitution.md`.
**Relación con otros archivos de memoria:**
- `constitution.md` — principios universales de ingeniería. Este archivo los aplica al proyecto.
- `product.md` — lógica de negocio del producto. Este archivo la traduce a stack concreto.
- `design.md` — sistema de diseño visual. Este archivo declara los tokens Tailwind v4 que aquel consume.
