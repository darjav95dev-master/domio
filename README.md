# Domio

**Plataforma de comercialización inmobiliaria multiinquilino.**

Domio permite a una empresa de servicios operar sitios web de venta de viviendas para múltiples promotoras inmobiliarias desde una sola instancia, con aislamiento completo de datos entre cada una. Cada promotora (tenant) obtiene su propio catálogo publicable, un backoffice de gestión comercial (leads, equipo, contenido CMS) y una API REST pública versionada para integración con portales y canales externos.

- **Web pública**: [wedomio.com](https://wedomio.com)
- **Backoffice**: `/panel` sobre el mismo dominio
- **API pública v1**: `/api/v1/`

---



## Problema que resuelve

El mercado inmobiliario español tiene cientos de pequeñas y medianas promotoras que necesitan presencia web profesional y gestión digital de leads, pero no tienen presupuesto ni equipo técnico para desarrollar su propia plataforma. Domio les da servicio como tenant aislado dentro de una misma instancia: web pública, backoffice comercial, y API REST, todo sin compartir datos entre promotoras.

## Casos de uso

| Actor | Funcionalidad | Módulo |
|-------|---------------|--------|
| Visitante anónimo | Explorar catálogo público de promociones | `catalog`, `home` |
| Visitante anónimo | Ver detalle de una promoción (galería, mapa, tipologías) | `detail` |
| Visitante anónimo | Enviar formulario de contacto o solicitar info de una promoción | `engagement`, `contact` |
| Visitante anónimo | Guardar favoritos en el navegador | `favorites` |
| Administrador (tenant) | CRUD completo de promociones con editor de bloques | `promociones` |
| Administrador (tenant) | Gestionar leads: listar, filtrar, cambiar estado, reasignar | `leads` |
| Administrador (tenant) | Gestionar equipo: invitar, activar, desactivar, eliminar usuarios | `team` |
| Administrador (tenant) | Editar contenido CMS de páginas públicas con versionado | `contenidos` |
| Administrador (tenant) | Gestionar API keys para acceso a la API pública | `api-keys` |
| Administrador (tenant) | Ver dashboard con KPIs de leads y promociones | `backoffice` |
| Operador (tenant) | Ver leads, promociones, cambiar estado, añadir notas | `leads`, `promociones` |
| Agente (tenant) | Ver leads asignados, cambiar estado, añadir notas | `leads` |
| Editor (tenant) | Editar contenido CMS | `contenidos` |
| Sistema externo | Consultar promociones publicadas via API REST | `api-public` |
| Sistema externo | Crear leads institucionales via API REST | `api-public` |

### Roles de usuario (backoffice)

| Rol | Privilegios |
|-----|-------------|
| `ADMIN` | Acceso completo: promociones, leads, equipo, contenido, API keys, dashboard |
| `OPERATOR` | Gestión de leads + promociones (sin gestión de equipo ni API keys) |
| `AGENT` | Gestión de leads asignados (cambio de estado, notas) |

Fuente: `src/shared/constants/db-enums.ts:1` (enumerado `USER_ROLES`), `src/infrastructure/auth/require-admin.ts`, `src/infrastructure/auth/require-auth.ts`.

## Conceptos del dominio

### Tenant

Un **tenant** es una promotora inmobiliaria. Cada tenant tiene su propio UUID (`tenants.id`), un slug para identificación, un nombre comercial y una configuración JSON. El tenant activo para la web pública se define con la variable de entorno `PUBLIC_TENANT_ID`.

El sistema está diseñado para que una misma instancia de Domio sirva a N tenants con datos completamente aislados. No hay tabla `tenants` con RLS porque es el catálogo raíz del que dependen todas las demás.

Fuente: `src/infrastructure/db/schema/tenants.ts`, `src/infrastructure/tenant/PublicContext.ts`.

### Promoción

Una **promoción** (`promociones`) es la unidad principal del catálogo. Representa una promoción inmobiliaria (edificio completo, promoción privada, obra nueva, etc.). Sus atributos incluyen:

- **kind**: `portfolio` (catálogo público) o `external` (privada, solo backoffice).
- **status**: `DRAFT`, `PUBLISHED`, `RESERVED`, `SOLD`, `RENTED`, `WITHDRAWN`.
- **operation**: `SALE`, `RENT`, `SALE_AND_RENT`.
- **propertyType**: `piso`, `ático`, `casa`, `chalet`, `dúplex`, `estudio`, `local`, `oficina`, `nave`, `garaje`, `trastero`, `terreno`.
- **constructionStatus**: `ON_PLAN`, `IN_CONSTRUCTION`, `READY`.
- **location**: punto geográfico (PostGIS `geometry(Point,4326)`) con un segundo punto aproximado (`location_approx`) y un modo de privacidad (`mapPrivacyMode`).
- **draftPayload**: JSON con cambios no publicados (borrador).

Cada promoción puede tener un agente asignado (`assignedAgentId`). Si se publica por primera vez, se genera un slug determinista con el formato `{tipo}-en-{operacion}-en-{municipio}-{n}hab-{idCorto}`.

Fuente: `src/infrastructure/db/schema/promociones.ts`, `src/infrastructure/slug/generate-slug.ts`, `src/shared/constants/db-enums.ts:4-15`.

### Tipología y Unidad

Una **tipología** (`tipologias`) es un modelo de vivienda dentro de una promoción (ej: "Piso 3 dormitorios 120m²"). Una **unidad** (`unidades`) es una unidad concreta dentro de esa tipología (ej: "Piso 3B, 4ª planta, 350.000€").

Fuente: `src/infrastructure/db/schema/tipologias.ts`, `src/infrastructure/db/schema/unidades.ts`.

### Lead

Un **lead** (`leads`) representa un contacto o posible comprador interesado en una promoción. El flujo típico es:

1. Un visitante rellena un formulario en el detalle de una promoción (público).
2. Se crea un lead con estado `NEW`, el origen (`source`: `commercial`) y el canal (`channel`: `FORM` o `WHATSAPP`).
3. Se registra el consentimiento RGPD (registro inmutable en `consent_records`).
4. Se encolan dos emails: confirmación al remitente + notificación al agente asignado.
5. El agente gestiona el lead: cambia su estado siguiendo una máquina de estados (`NEW → CONTACTED → IN_NEGOTIATION → WON/LOST`), añade notas internas y puede exportar a CSV.

Cada lead puede ser asignado a un agente y reasignado por un admin. Los cambios de estado y las notas tienen auditoría en `lead_history`.

Fuente: `src/features/engagement/server/create-lead-action.ts`, `src/features/leads/actions/leads.actions.ts`, `src/infrastructure/db/schema/leads.ts`, `src/infrastructure/db/schema/lead-history.ts`, `src/infrastructure/db/schema/lead-notes.ts`, `src/infrastructure/db/schema/consent-records.ts`.

### API Key

Una **API key** (`api_keys`) permite a sistemas externos autenticarse contra la API pública v1. Cada key pertenece a un tenant, tiene un nombre descriptivo, un límite de peticiones por minuto configurable y puede desactivarse. La key en texto plano solo se muestra al crearla; en base de datos se almacena hasheada con bcrypt. Los primeros 8 caracteres se guardan como `key_prefix` para búsquedas O(1) sin comparar todos los hashes.

Fuente: `src/infrastructure/db/schema/api-keys.ts`, `src/features/api-public/middleware/api-key-auth.ts`.

### Media Asset

Un **media asset** (`media_assets`) es una imagen subida a Cloudflare R2 asociada a una promoción (o a otro owner). Cada asset tiene un tipo (`kind`: `IMAGE_GALLERY`, `PLAN`, `DOCUMENT`), un orden (`sortOrder`), un texto alternativo (`altText`) y una marca de si es portada (`isCover`). Los archivos se almacenan en R2 con una clave UUID.

Fuente: `src/infrastructure/db/schema/media-assets.ts`, `src/infrastructure/media/media.service.ts`.

### ARSOP

ARSOP es un módulo de cumplimiento normativo para gestionar peticiones de exportación o eliminación de datos personales (RGPD). Un administrador puede iniciar una solicitud ARSOP desde el backoffice, que queda registrada en `arsop_requests` vinculada a un lead.

Fuente: `src/features/leads/components/ArsopPanel.tsx`, `src/infrastructure/db/schema/arsop-requests.ts`, `src/shared/constants/db-enums.ts:91-92`.

## Arquitectura

### Diagrama general

```mermaid
graph TB
    subgraph Clientes
        PB["Navegador público<br/>(visitante anónimo)"]
        BO["Navegador backoffice<br/>(admin, operador, agente)"]
        API["API externa<br/>(portales, integraciones)"]
    end

    subgraph EdgeRuntime["Middleware Edge (middleware.ts)"]
        ME[Verificar JWT]
        RL["Rate limiting login<br/>(Upstash HTTP, 5 intentos / 15 min)"]
        RT["X-Robots-Tag<br/>noindex, nofollow"]
    end

    subgraph NextJS["Next.js 15 App Router"]
        direction LR
        SC["Server Components<br/>(páginas públicas y backoffice)"]
        SA["Server Actions<br/>(formulario lead, cambio estado)"]
        RH["Route Handlers<br/>(API pública v1, API interna)"]
    end

    subgraph Features["Features de dominio (src/features/)"]
        CAT["catalog<br/>catálogo público"]
        LEAD["leads<br/>gestión comercial"]
        PROM["promociones<br/>CRUD"]
        APIPUB["api-public<br/>pública v1 + API keys"]
        CONT["contenidos<br/>CMS"]
        TEAM["team<br/>gestión de usuarios"]
    end

    subgraph Infra["Infraestructura (src/infrastructure/)"]
        REPOS["Repositorios<br/>TenantAwareRepository"]
        CTX["TenantContext<br/>→ Public / Authenticated / ApiKey"]
        EMAIL["EmailService<br/>email_queue + worker"]
        MEDIA["MediaService<br/>R2 + placeholders"]
        RATELIMIT["RateLimiter<br/>Upstash / Noop"]
    end

    subgraph Externos["Servicios externos"]
        PG[(PostgreSQL 16<br/>+ PostGIS + RLS)]
        R2[("Cloudflare R2<br/>imágenes y assets")]
        RESEND["Resend<br/>email transaccional"]
        UPSTASH["Upstash Redis<br/>rate limiting"]
        SENTRY["Sentry<br/>errores y rendimiento"]
    end

    PB --> ME
    BO --> ME
    API --> RH

    ME -->|/panel/*| RL
    RL --> RT
    RT --> SC

    ME -->|/api/v1/*| RH
    ME -->|/api/auth/*| SA

    SC --> CAT
    SC --> PROM
    SC --> CONT
    SA --> LEAD
    SA --> PROM
    RH --> APIPUB
    CAT --> REPOS
    LEAD --> REPOS
    PROM --> REPOS
    APIPUB --> CTX
    CONT --> REPOS
    TEAM --> REPOS

    REPOS --> CTX
    CTX --> PG
    CTX --- EMAIL
    EMAIL --> RESEND
    EMAIL --> PG

    MEDIA --> R2
    RATELIMIT --> UPSTASH
    RH -.-> RATELIMIT
    SA -.-> RATELIMIT

    CAT --> MEDIA
    LEAD --> EMAIL
    PROM --> MEDIA

    SC -.-> SENTRY
    RH -.-> SENTRY
    SA -.-> SENTRY

    ME -.->|login rate limit| UPSTASH
```

Fuentes: `middleware.ts`, `src/infrastructure/tenant/TenantContext.ts`, `src/infrastructure/tenant/PublicContext.ts`, `src/infrastructure/tenant/AuthenticatedContext.ts`, `src/infrastructure/tenant/ApiKeyContext.ts`, `src/infrastructure/rate-limiting/`, `src/infrastructure/email/`, `src/infrastructure/media/`, `next.config.ts:23` (`output: "standalone"`).

### Patrones detectados

#### Repository Pattern

Todas las operaciones de base de datos se encapsulan en repositorios que extienden `TenantAwareRepository`. Esta clase base proporciona `withTransaction()`, que automáticamente fija el contexto de tenant en cada transacción mediante `set_config('app.current_tenant_id', ..., true)`.

```mermaid
classDiagram
    class TenantAwareRepository {
        #ctx: TenantContext
        #withTransaction(fn): Promise~T~
    }
    class UserRepository {
        +findAll(filters)
        +create(data)
        +update(id, data)
        +delete(id)
        +deactivate(id)
        +reactivate(id)
    }
    class LeadRepository {
        +findAll(filters, pagination)
        +findById(id)
        +updateStatus(id, status, userId)
        +reassign(id, agentId)
        +addNote(id, text, userId)
    }
    class PromocionRepository {
        +findById(id)
        +update(id, data)
        +findPublished(slug)
    }
    TenantAwareRepository <|-- UserRepository
    TenantAwareRepository <|-- LeadRepository
    TenantAwareRepository <|-- PromocionRepository
```

Fuente: `src/infrastructure/db/repositories/TenantAwareRepository.ts`, todos los repositorios en `src/infrastructure/db/repositories/`.

#### Strategy Pattern (contextos de tenant)

Tres implementaciones de `TenantContext` encapsulan la estrategia de resolución de tenant según el tipo de acceso:

| Clase | Tipo | Resolución de tenant | Fija en la transacción |
|-------|------|---------------------|------------------------|
| `PublicContext` | `public` | Variable de entorno `PUBLIC_TENANT_ID` | `app.current_tenant_id` |
| `AuthenticatedContext` | `authenticated` | Del JWT (`token.tenant_id`) | `app.current_tenant_id` + `app.current_user_id` |
| `ApiKeyContext` | `apikey` | De la API key (bcrypt-match contra `api_keys`) | `app.current_tenant_id` |

Fuente: `src/infrastructure/tenant/TenantContext.ts`, `src/infrastructure/tenant/PublicContext.ts`, `src/infrastructure/tenant/AuthenticatedContext.ts`, `src/infrastructure/tenant/ApiKeyContext.ts`.

#### Dependency Injection (constructor)

Todos los servicios y repositorios reciben sus dependencias por constructor, lo que permite inyectar mocks en los tests:

- `EmailService(repository: EmailRepository)`
- `MediaService(ctx: TenantContext)`
- `PromocionPublishService(repository, contentBlockRepo)`
- `UpstashRateLimiter(redis: Redis)`

Fuente: `src/infrastructure/email/email.service.ts:25`, `src/infrastructure/media/media.service.ts:24`, `src/features/promociones/server/promocion-publish.service.ts`, `src/infrastructure/rate-limiting/rate-limiter.ts:16`.

#### Forward-Only Migrations

Las migraciones de base de datos son forward-only (no existe `db:migrate:down`). Los cambios incompatibles (renombrar columnas, añadir NOT NULL) se ejecutan en dos fases: primero un cambio compatible (expand), luego en una release posterior el cambio rompiente (contract). Para rollback se restaura un `pg_dump` previo.

Fuente: `src/infrastructure/db/migrations/`, `src/infrastructure/db/drizzle.config.ts`, `docs/DESPLIEGUE.md`.

### Mapa de capas y módulos

```mermaid
graph TB
    subgraph "Capa de presentación (Next.js App Router)"
        A["Páginas públicas<br/>(home, portafolio, detalle, contacto)"]
        B["Backoffice /panel<br/>(dashboard, leads, promociones, equipo)"]
        C["Route Handlers /api<br/>(v1 pública, internal)"]
    end

    subgraph "Capa de dominio (features)"
        D["home<br/>catalog<br/>detail<br/>engagement<br/>contact<br/>favorites"]
        E["promociones<br/>(CRUD + editor bloques + media)"]
        F["leads<br/>(listado, detalle, notas, histórico, ARSOP)"]
        G["team<br/>(invitar, activar, desactivar, eliminar)"]
        H["contenidos<br/>(CMS con versionado)"]
        I["api-keys<br/>(gestionar claves)"]
        J["api-public<br/>(middleware, serializers, OpenAPI)"]
        K["backoffice<br/>(layout, sidebar, dashboard KPIs)"]
        L["seo<br/>(JSON-LD, sitemap, metadata)"]
    end

    subgraph "Capa de infraestructura"
        M["Repositorios (DAO)<br/>TenantAwareRepository + tx"]
        N["Servicios externos<br/>EmailService, MediaService,<br/>RateLimiter"]
        O["Contextos de tenant<br/>Public · Authenticated · ApiKey"]
        P["Auth<br/>NextAuth v4 + JWT credentials"]
    end

    subgraph "Servicios externos"
        Q[("PostgreSQL + PostGIS")]
        R[("Cloudflare R2")]
        S[("Resend")]
        T[("Upstash Redis")]
        U[("Sentry")]
        V[("Cloudflare Turnstile")]
    end

    A --> D
    B --> E
    B --> F
    B --> G
    B --> H
    B --> I
    B --> K
    C --> J
    D --> M
    E --> M
    F --> M
    G --> M
    H --> M
    I --> M
    J --> M
    J --> N
    L -.->|sitemap/robots| C
    M --> O
    M --> N
    N --> Q
    N --> R
    N --> S
    N --> T
    P --> O
```

### Sistema multiinquilino

Domio implementa aislamiento entre tenants mediante **Row-Level Security (RLS)** de PostgreSQL, no con tablas separadas ni bases de datos distintas.

```mermaid
sequenceDiagram
    participant App as Aplicación
    participant Repo as Repositorio
    participant TX as Transacción
    participant PG as PostgreSQL

    App->>Repo: new UserRepository(ctx)
    App->>Repo: repo.findAll()
    Repo->>TX: this.ctx.withTransaction(fn)
    TX->>PG: BEGIN
    TX->>PG: SELECT set_config('app.current_tenant_id', $1, true)
    Note over TX: Equivalente a SET LOCAL.<br/>Dura solo durante esta transacción.
    TX->>PG: SELECT * FROM users
    PG->>PG: RLS policy evalúa:<br/>tenant_id = current_setting('app.current_tenant_id')::uuid
    PG->>TX: Solo filas del tenant activo
    TX->>PG: COMMIT
    TX->>Repo: Resultado
    Repo->>App: rows[]
```

La política RLS (`src/infrastructure/db/schema/rls.ts`) es:

```sql
tenant_id = current_setting('app.current_tenant_id')::uuid
```

Se aplica a todas las tablas de dominio (`promociones`, `leads`, `users`, `api_keys`, `media_assets`, `tipologias`, `unidades`, `content_blocks`, `contact_config`, `lead_history`, `lead_notes`, `lead_read_marks`, `consent_records`, `promocion_history`, `content_history`, `arsop_requests`). Las tablas sin RLS son `tenants` (catálogo raíz) y `email_queue` (cola de infraestructura sin tenant_id).

El parámetro `true` de `set_config` hace que la variable sea local a la transacción — al hacer COMMIT o ROLLBACK, PostgreSQL la descarta automáticamente. No puede haber fuga entre transacciones.

### Flujo de una petición HTTP

```mermaid
sequenceDiagram
    participant C as Cliente
    participant N as Next.js Edge
    participant SC as Server Component
    participant SA as Server Action
    participant RH as Route Handler
    participant V as Zod
    participant A as Auth
    participant RL as Rate Limiter
    participant TX as Transacción (RLS)
    participant DB as PostgreSQL
    participant R2 as Cloudflare R2
    participant S as Sentry

    alt Página pública (SSR)
        C->>N: GET /inmuebles/[slug]
        N->>SC: Render server component
        SC->>SC: PublicContext()
        SC->>TX: withTransaction(fn)
        TX->>DB: set_config + SELECT
        DB->>TX: row(s)
        TX->>SC: datos
        SC->>R2: getPublicUrl(r2Key)
        SC->>C: HTML + JSON-LD (SEO)
    else Server Action (formulario)
        C->>N: POST (formulario lead)
        N->>SA: Server Action
        SA->>V: Zod validation
        SA->>V: Turnstile token verification
        SA->>RL: checkIpRateLimit(ip)
        SA->>TX: PublicContext().withTransaction()
        TX->>DB: INSERT lead + consent
        TX->>DB: INSERT email_queue (×2)
        TX->>SA: result
        SA->>C: { success: true }
    else API pública v1
        C->>N: GET /api/v1/promociones
        N->>RH: Route Handler
        RH->>RH: extractApiKeyFromRequest()
        RH->>A: validateApiKey()
        A->>DB: SELECT api_keys WHERE is_active
        A->>A: bcrypt.compare(key, hash)
        A->>RL: consume(apiKeyId)
        RL->>T: INCR(key)
        RH->>TX: ApiKeyContext().withTransaction()
        TX->>DB: SELECT promociones WHERE status=PUBLISHED
        DB->>TX: rows
        RH->>C: 200 + X-RateLimit-*
    end
    S-->>S: Capturar errores no controlados
```

### Flujo de autenticación (backoffice)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant P as /panel/login (página)
    participant M as Middleware Edge
    participant A as NextAuth v4
    participant PC as PublicContext
    participant B as bcryptjs
    participant DB as PostgreSQL
    participant JWT as Cookie httpOnly
    participant RL as Rate Limiter (IP)

    U->>P: email + password
    P->>A: signIn("credentials", {email, password})

    Note over M: El middleware intercepta POST a<br/>/api/auth/callback/credentials<br/>antes de que llegue a NextAuth
    M->>RL: checkIpRateLimit(ip, "login")
    RL->>M: allowed / denied

    alt Rate limit excedido
        M->>U: 429 Demasiados intentos (Retry-After header)
    else Allow
        A->>A: authorize()
        Note over A: Las importaciones (db, bcrypt)<br/>son lazy para preservar compatibilidad Edge
        A->>PC: new PublicContext()
        A->>PC: withTransaction(tx)
        PC->>DB: set_config('app.current_tenant_id', PUBLIC_TENANT_ID, true)
        PC->>DB: SELECT id, email, password_hash, is_active<br/>FROM users<br/>WHERE email=X AND tenant_id=current_setting(...)
        DB->>PC: user row
        A->>B: bcrypt.compare(password, user.passwordHash)
        B->>A: true/false
        A->>A: user.isActive? SÍ → continuar
        A->>A: Crear JWT: {user_id, tenant_id, role}
        JWT-->>U: Cookie httpOnly (__Secure-next-auth.session-token)
        P->>U: Redirect a /panel
    end

    Note over A: En adelante, el middleware valida el JWT en cada petición a /panel/* (auth guard + X-Robots-Tag), excepto login.

    Note over A: Cada 5 minutos...
    A->>A: jwt callback (lastVerifiedAt)
    A->>DB: SELECT is_active FROM users WHERE id=token.user_id
    DB->>A: {isActive: true/false}
    A->>A: Si isActive=false → token=null (sesión destruida)
```

Detalles técnicos (fuente: `src/infrastructure/auth/auth.config.ts`):
- La sesión dura 2 horas (`maxAge`). Con renovación deslizante cada hora (`updateAge`).
- El JWT contiene `user_id`, `tenant_id`, `role` y `lastVerifiedAt`.
- La verificación de `isActive` ocurre cada 5 minutos. Si el usuario fue desactivado, la sesión se invalida en el siguiente chequeo, no al instante.
- El rate limiting de login (5 intentos en 15 minutos por IP) se aplica en el middleware Edge (`middleware.ts:31-34`) antes de que la petición llegue a NextAuth.

### Flujo de captura de un lead

```mermaid
sequenceDiagram
    participant V as Visitante
    participant T as Turnstile
    participant SA as createLeadService
    participant V2 as Zod
    participant RL as Rate Limiter (IP)
    participant TX as Transacción
    participant DB as PostgreSQL
    participant ES as EmailService
    participant EQ as email_queue
    participant W as Worker (proceso separado)
    participant R as Resend

    V->>T: Carga página → challenge
    T->>V: token
    V->>SA: submit(name, email, message, promocionId, turnstileToken)
    SA->>V2: Validar campos (contactFormSchema)
    SA->>T: verifyTurnstileToken(token)
    T->>SA: {success: true/false}

    alt Turnstile no válido
        SA->>V: {success: false, error: "Error de verificación"}
    end

    SA->>V2: Validar promocionId (UUID)
    SA->>RL: checkIpRateLimit(ip, "contact")
    RL->>SA: {allowed: true/false}

    alt Rate limit excedido
        SA->>V: {success: false, error: "Demasiados intentos"}
    end

    SA->>TX: PublicContext().withTransaction()
    TX->>DB: SELECT promocion (WHERE id AND tenant_id)
    TX->>DB: SELECT agent asignado
    TX->>DB: INSERT lead (status=NEW, assignedAgent)
    TX->>DB: INSERT consent_record (RGPD, ip, userAgent)
    TX->>ES: enqueue(confirmation to sender.email)
    ES->>EQ: INSERT (PENDING, template=LEAD_CONFIRMATION)
    TX->>ES: enqueue(notification to agent.email)
    ES->>EQ: INSERT (PENDING, template=LEAD_ASSIGNED_AGENT)
    TX->>SA: {success: true, message: "Solicitud recibida"}

    Note over W: Bucle cada 30s
    W->>EQ: SELECT PENDING WHERE next_attempt_at <= now()
    W->>EQ: FOR UPDATE SKIP LOCKED
    W->>R: resend.emails.send(template, to, payload)

    alt Éxito
        R->>W: sent
        W->>EQ: UPDATE status=SENT, sent_at=now()
    else Error transitorio (EmailProviderError)
        W->>EQ: UPDATE intentos++<br/>Si < 5: next_attempt_at = now() + 2^(attempts+1) minutos
        W->>EQ: Si >= 5: UPDATE status=FAILED
    else Error no transitorio
        W->>EQ: UPDATE status=FAILED
    end
```

Fuente: `src/features/engagement/server/create-lead-action.ts`, `src/infrastructure/email/worker.ts`.

### Flujo de publicación de promoción

```mermaid
sequenceDiagram
    participant U as Admin (backoffice)
    participant SA as Server Action
    participant PS as PromocionPublishService
    participant R as Repositorio
    participant TX as Transacción
    participant DB as PostgreSQL

    U->>U: Edita la promoción (formulario + bloques + imágenes)
    U->>SA: "Publicar"

    alt Es primera publicación (no tiene slug)
        SA->>PS: prepareUpdateData()
        PS->>PS: generateSlug(tipo, operación, municipio, habs, shortId)
        PS->>PS: Fusionar draftPayload si existe
        PS->>SA: updateData + newSlug
    else Es republicación (ya tiene slug)
        PS->>SA: updateData (slug NO se regenera)
    end

    PS->>PS: convertLocationFields ({lng,lat} → tubería PostGIS)

    SA->>PS: validateBlocksOnPublish(promocionId, isPublishing)
    PS->>R: contentBlockRepo.validateBlocksForPublish()
    R->>PS: {valid: true/false, errors: [...]}

    SA->>PS: validateMediaOnPublish(promocionId, isPublishing)
    PS->>R: validateMediaForPublish()
    R->>PS: {valid: true/false, errors: [...]}

    alt Validaciones fallan
        PS->>U: Errores de validación (bloques o media)
    else Todo válido
        SA->>TX: AuthenticatedContext().withTransaction()
        TX->>DB: UPDATE promocion SET status=PUBLISHED, slug=..., ...
        TX->>SA: updated row
        SA->>U: Revalidar cache ISR + redirect
    end
```

Fuente: `src/features/promociones/server/promocion-publish.service.ts`.

### Flujo del worker de email

El worker de email es un proceso independiente (no un endpoint HTTP) que corre en bucle consultando la tabla `email_queue`:

`pnpm worker:emails` → bucle infinito con polling cada 30 segundos.

```mermaid
stateDiagram-v2
    [*] --> PENDING: Se encola
    PENDING --> PROCESSING: Worker reclama (FOR UPDATE SKIP LOCKED)
    PROCESSING --> SENT: Resend acepta
    PROCESSING --> FAILED: Error permanente (template no existe, etc.)
    PROCESSING --> RETRY: Error transitorio (Resend timeout, etc.)
    RETRY --> PENDING: next_attempt_at en futuro
    RETRY --> FAILED: intentos >= 5
    SENT --> [*]
    FAILED --> [*]
```

Fuente: `src/infrastructure/email/worker.ts`, `src/infrastructure/email/email.repository.ts`.

### Flujo de rate limiting de login

```mermaid
sequenceDiagram
    participant C as Cliente (navegador)
    participant M as Middleware Edge
    participant RL as IpRateLimiter
    participant R as Upstash Redis
    participant NA as NextAuth

    C->>M: POST /api/auth/callback/credentials (email + password)
    M->>M: pathname === "/api/auth/callback/credentials" && POST
    M->>RL: checkIpRateLimit(ip, "login")
    RL->>R: exists(rl:lockout:login:{ip})
    R->>RL: 0 (no locked out)
    RL->>R: INCR(rl:ip:login:{ip}:window)
    R->>RL: count

    alt count <= 5
        RL->>M: { allowed: true }
        M->>NA: NextAuth authorize()
        NA->>M: JWT cookie
        M->>C: 302 redirect /panel
    else count > 5
        RL->>R: SET(rl:lockout:login:{ip}, 1, EX=900)
        RL->>M: { allowed: false, lockedOut: true }
        M->>C: 429 Demasiados intentos + Retry-After header
    end
```

Fuente: `middleware.ts:31-34`, `src/infrastructure/auth/rate-limit-login.ts`, `src/infrastructure/rate-limiting/ip-rate-limit.ts`.

### Flujo del middleware Edge

El middleware Edge (`middleware.ts`) se ejecuta en el Edge Runtime de Next.js antes de que la petición llegue al Route Handler o Server Component. Cubre tres responsabilidades en una sola función:

```mermaid
flowchart TD
    REQ["Request entrante"] --> PATH{¿Qué ruta?}

    PATH -->|"/api/auth/callback/credentials" POST| RL["Rate limiting de login"]
    RL -->|checkIpRateLimit(ip)| DECIDE{¿Permitido?}
    DECIDE -->|No| RESP429["Response 429 Too Many Requests"]
    DECIDE -->|Sí| NA["Pasar a NextAuth"]

    PATH -->|"/panel/*" + no pública| AUTH["getToken() JWT"]
    AUTH -->|token válido| ROBOTS["X-Robots-Tag: noindex"]
    AUTH -->|sin token| REDIR["302 → /panel/login"]
    ROBOTS --> PASS["NextResponse.next()"]

    PATH -->|"/api/internal/*"| ROBOTS2["X-Robots-Tag: noindex + x-pathname"]
    ROBOTS2 --> PASS2["NextResponse.next()"]

    PATH -->|otras| PASS3["NextResponse.next()"]
```

El matcher del middleware se define en `middleware.ts:61-62`:

```typescript
export const config = {
  matcher: ["/panel/:path*", "/api/internal/:path*", "/api/auth/callback/credentials"],
};
```

## Stack tecnológico

### Framework y lenguaje

| Tecnología | Versión | Propósito | Evidencia |
|-----------|---------|-----------|-----------|
| Next.js | 15.5.20 | Framework React con App Router, Server Components, Route Handlers y Turbopack | `package.json:48` |
| React | 19.2.4 | Librería de UI con Server Components | `package.json:51-52` |
| TypeScript | ~5.5 | Tipado estricto con `noUncheckedIndexedAccess` | `tsconfig.json:12` |

### Base de datos

| Tecnología | Versión | Propósito | Evidencia |
|-----------|---------|-----------|-----------|
| PostgreSQL | 15+ | Base de datos relacional | `deploy/docker-compose.app.yml:12` |
| PostGIS | 16-3.4 | Extensiones geoespaciales (puntos, índices GiST) | `deploy/docker-compose.app.yml:12`, `src/infrastructure/db/schema/promociones.ts:68-69` |
| Drizzle ORM | 0.45.2 | ORM con type-safety, migraciones y soporte RLS (`pgPolicy`) | `package.json:46`, `src/infrastructure/db/schema/rls.ts` |
| pg | 8.22.0 | Cliente PostgreSQL (Pool TCP) | `package.json:49`, `src/infrastructure/db/client.ts` |

### Servicios externos

| Tecnología | Propósito | Evidencia |
|-----------|-----------|-----------|
| Cloudflare R2 | Almacenamiento de imágenes con CDN (SDK S3 compatible) | `src/infrastructure/media/`, dependencia `@aws-sdk/client-s3` |
| Resend | Envío de email transaccional | `src/infrastructure/email/resend.client.ts`, dependencia `resend` |
| Upstash Redis | Rate limiting (cliente HTTP, no TCP) | `src/infrastructure/rate-limiting/`, dependencia `@upstash/redis` |
| Sentry | Captura de errores server + client | `sentry.server.config.ts`, `instrumentation-client.ts`, dependencia `@sentry/nextjs` |
| Cloudflare Turnstile | Captcha en formularios públicos | `src/shared/utils/turnstile.ts`, `.env.example:62-65` |
| MapLibre GL | Mapas en detalle de promoción | `src/features/detail/components/MapPromocion.tsx`, dependencia `maplibre-gl` |

### Testing

| Tecnología | Versión | Propósito | Evidencia |
|-----------|---------|-----------|-----------|
| Vitest | 3.2.0 | Test runner (unitario + integración) | `package.json:85` |
| @vitest/coverage-v8 | 3.2.0 | Reporte de cobertura | `package.json:70` |
| Playwright | 1.52.0 | Tests end-to-end | `package.json:57` |
| @testing-library/react | 16.3.0 | Testing de componentes | `package.json:61` |
| jsdom | 26.0.0 | Entorno DOM para tests | `package.json:80` |

### Tooling

| Tecnología | Versión | Propósito | Evidencia |
|-----------|---------|-----------|-----------|
| pnpm | 9.15.9 | Gestor de paquetes (via corepack) | `package.json:5` |
| ESLint | 9.x | Linter con flat config: sonarjs (complejidad cognitiva), jsx-a11y (accesibilidad), react-hooks | `package.json:74-78` |
| Prettier | 3.5.x | Formateador de código | `package.json:81` |
| Husky | 9.1.0 | Git hooks: pre-commit (lint+typecheck), pre-push (test+build) | `package.json:35` |
| tsx | 4.23.0 | Ejecución de TypeScript (scripts, worker) | `package.json:83` |
| Drizzle Kit | 0.31.10 | Generación y aplicación de migraciones | `package.json:72` |
| Zod | 4.4.3 | Validación runtime con inferencia de tipos | `package.json:54` |
| @asteasolutions/zod-to-openapi | 8.5.0 | Generación automática de OpenAPI desde schemas Zod | `package.json:38` |
| @aws-sdk/client-s3 | 3.x | SDK S3 para Cloudflare R2 | `package.json:39` |
| @aws-sdk/s3-request-presigner | 3.x | Signed URLs para acceso controlado a R2 | `package.json:40` |
| next-auth | 4.24.14 | Autenticación con JWT y provider credentials | `package.json:49` |
| bcryptjs | 3.x | Hashing de contraseñas y API keys | `package.json:71` |
| @phosphor-icons/react | 2.1.10 | Iconos | `package.json:43` |
| @dnd-kit | 6.x | Drag & drop (editor de bloques, galería) | `package.json:41-42` |


## Organización del proyecto

```
app/
├── (auth)/panel/           ← Backoffice protegido con autenticación
│   ├── catalogo/           ← CRUD de promociones
│   ├── contenidos/         ← Editor CMS (páginas)
│   ├── equipo/             ← Gestión de usuarios del tenant
│   ├── leads/              ← Gestión de leads
│   ├── api-keys/           ← Gestión de API keys
│   └── arsop/              ← Peticiones ARSOP
├── (public)/               ← Web pública (sin autenticación)
│   ├── page.tsx            ← Home
│   ├── portafolio/         ← Catálogo de promociones
│   ├── inmuebles/[slug]/   ← Detalle de promoción
│   ├── contacto/           ← Formulario de contacto
│   ├── sobre/              ← Página "sobre nosotros"
│   ├── favoritos/          ← Favoritos del usuario (client-side)
│   └── legal/[slug]/       ← Páginas legales (aviso legal, privacidad, cookies)
├── api/
│   ├── health/             ← Health check
│   ├── auth/[...nextauth]/ ← NextAuth handler
│   ├── v1/                 ← API pública versionada
│   └── internal/           ← API interna del backoffice

middleware.ts                ← Edge Middleware: auth guard, rate limiting de login, X-Robots-Tag
instrumentation.ts           ← Sentry server init + fail-fast de rate limiting en producción
instrumentation-client.ts    ← Sentry client init (se carga nativamente desde Next 15.3+)
sentry.server.config.ts      ← Configuración de Sentry server-side (DSN, tracesSampleRate)
next.config.ts               ← Config: security headers, standalone output, images remotePatterns

src/
├── features/               ← Código de negocio organizado por dominio
│   ├── home/               ← Página principal pública
│   ├── catalog/            ← Catálogo público
│   ├── detail/             ← Detalle de promoción
│   ├── engagement/         ← Captura de leads
│   ├── contact/            ← Página de contacto
│   ├── favorites/          ← Favoritos (localStorage)
│   ├── promociones/        ← CRUD y editor de promociones
│   ├── leads/              ← Gestión de leads (backoffice)
│   ├── team/               ← Gestión de usuarios
│   ├── contenidos/         ← Editor de contenido CMS
│   ├── api-keys/           ← Gestión de API keys
│   ├── api-public/         ← API pública v1 (auth, serializers, OpenAPI)
│   ├── backoffice/         ← Layout del panel, sidebar, dashboard KPIs
│   └── seo/                ← Utilidades SEO (JSON-LD, sitemap, metadata)
│
├── infrastructure/         ← Servicios e integraciones externas
│   ├── db/                 ← Cliente, schema, migraciones, repositorios
│   ├── tenant/             ← Contextos de tenant (Public, Authenticated, ApiKey)
│   ├── auth/               ← NextAuth, helpers de sesión
│   ├── email/              ← EmailService, worker, templates, Resend client
│   ├── media/              ← MediaService, R2 client
│   ├── rate-limiting/      ← Rate limiter (Upstash), API key middleware, IP limiter
│   ├── observability/      ← Sentry wrapper (common config, sanitize)
│   └── slug/               ← Generación de slugs
│
├── shared/                 ← Código compartido entre features
│   ├── components/         ← UI reutilizable (button, input, toast, skeleton, nav, footer)
│   ├── constants/          ← Constantes de dominio (db-enums, rate-limits, panel-routes, etc.)
│   ├── schemas/            ← Schemas Zod compartidos (contact, promocion, tipologia, unidad)
│   ├── types/              ← Tipos TypeScript (api-key, consent, content-block, lead, media, pagination)
│   ├── hooks/              ← Custom hooks React (backoffice-form)
│   ├── strategies/         ← Estrategias de negocio
│   ├── styles/             ← Estilos globales
│   ├── utils/              ← Utilidades (cn, logger, turnstile, csv, seo, extract-ip)
│   └── config/             ← Configuración de entorno (APP_ENV)
│
└── features/.../__tests__/ ← Tests junto al código que prueban

tests/
├── unit/                   ← Tests puramente unitarios
├── integration/            ← Tests con DB real u otros servicios
├── isolation/              ← Tests de aislamiento multiinquilino
├── contract/               ← Tests de contrato de la API pública
├── e2e/                    ← Tests end-to-end con Playwright
├── app/                    ← Tests de páginas
├── features/               ← Tests de features
├── shared/                 ← Tests de componentes compartidos
└── setup.ts                ← Configuración global de tests

deploy/                     ← Artefactos de despliegue
├── docker-compose.app.yml  ← Stack app (postgres + web + worker)
├── docker-compose.proxy.yml ← Proxy Caddy compartido
├── Caddyfile               ← Configuración del reverse proxy
├── Makefile                ← Comandos de operación (up, migrate, backup, restore-test)
├── app-role.sql            ← Creación del rol restringido domio_app
├── scripts/                ← Scripts de migración de datos
├── env.dev                 ← Variables de entorno de desarrollo
├── env.prod                ← Variables de entorno de producción
└── env.proxy               ← Variables del proxy Caddy

docs/                       ← Documentación de procesos
├── DESPLIEGUE.md           ← Guía de despliegue
├── RUNBOOK-PRODUCCION.md   ← Runbook de operaciones
├── PLAN-DEPLOY.md          ← Plan de despliegue
├── PLAN-MANANA.md          ← Plan de migración y puesta en marcha
├── PLAN-PRUEBAS-TFM.md     ← Plan de pruebas
└── ENTREGA-TFM.md          ← Documentación de entrega TFM

specs/                      ← Especificaciones por feature
├── 001-bootstrap-project/
├── 002-db-schema-and-migrations/
├── ...
└── 027-contract-tests/

scripts/                    ← Scripts de utilidad
├── seed.ts                 ← Seed de datos de prueba
├── worker-emails.ts        ← Worker de email (bucle principal)
└── check-services.ts       ← Verificación de servicios externos
```

## Base de datos

### Entidades y relaciones

```mermaid
erDiagram
    tenants ||--o{ promociones : "tenant_id"
    tenants ||--o{ users : "tenant_id"
    tenants ||--o{ leads : "tenant_id"
    tenants ||--o{ api_keys : "tenant_id"
    tenants ||--o{ media_assets : "tenant_id"
    tenants ||--o{ content_blocks : "tenant_id"
    tenants |o--|| contact_config : "tenant_id"

    promociones ||--o{ tipologias : "promocion_id"
    tipologias ||--o{ unidades : "tipologia_id"
    promociones ||--o{ leads : "promocion_id"
    promociones ||--o{ media_assets : "owner_id"
    promociones ||--o{ promocion_content_blocks : "promocion_id"
    promociones ||--o{ promocion_history : "promocion_id"
    users ||--o{ promociones : "assigned_agent_id"
    users ||--o{ leads : "assigned_agent_id"
    users ||--o{ api_keys : "created_by"

    leads ||--o{ lead_notes : "lead_id"
    leads ||--o{ lead_history : "lead_id"
    leads ||--o{ lead_read_marks : "lead_id"
    leads ||--o{ consent_records : "lead_id"
    leads ||--o{ arsop_requests : "lead_id"

    content_blocks ||--o{ content_history : "content_block_id"

    email_queue {
        uuid id PK
        text to_email
        text template
        jsonb payload
        enum status "PENDING|SENT|FAILED"
        integer attempts
        timestamp next_attempt_at
    }

    promociones {
        uuid id PK
        uuid tenant_id FK "RLS"
        text slug "único por tenant"
        text name
        enum kind "portfolio|external"
        enum status "DRAFT|PUBLISHED|RESERVED|SOLD|RENTED|WITHDRAWN"
        enum operation "SALE|RENT|SALE_AND_RENT"
        geometry location "Point,4326 (PostGIS)"
        uuid assigned_agent_id FK "SET NULL on delete"
        jsonb draft_payload
    }

    leads {
        uuid id PK
        uuid tenant_id FK "RLS"
        uuid promocion_id FK
        uuid tipologia_id FK "SET NULL"
        enum status "NEW|CONTACTED|IN_NEGOTIATION|WON|LOST"
        text name
        text email
        text phone
        uuid assigned_agent_id FK "SET NULL"
    }

    users {
        uuid id PK
        uuid tenant_id FK "RLS"
        text email "único por tenant"
        text password_hash
        enum role "ADMIN|OPERATOR|AGENT"
        boolean is_active "default true"
        uuid invitation_token_hash
    }
```

### Estrategia de migraciones

Las migraciones se generan con `drizzle-kit generate` a partir del schema Drizzle y se aplican con `drizzle-kit migrate`. Existen 8 migraciones versionadas (`0000_round_captain_marvel.sql` a `0007_early_deadpool.sql`). El flujo es:

```bash
# 1. Modificar el schema en src/infrastructure/db/schema/
# 2. Generar el SQL de migración
pnpm db:generate

# 3. Revisar el SQL generado
# 4. Aplicar en local
pnpm db:migrate

# 5. Verificar que no hay drift (debe producir 0 cambios)
pnpm db:generate
```

Limitaciones conocidas (documentadas en `docs/DESPLIEGUE.md`):
- Drizzle no genera migraciones *down*. Rollback = restaurar `pg_dump` previo.
- La migración `0007` requirió `ADD COLUMN IF NOT EXISTS` porque re-añadía una columna ya creada en `0005`. Corregido.
- `pnpm db:push` está disponible pero no versiona cambios. Solo para desarrollo.

### Políticas RLS

Definidas en `src/infrastructure/db/schema/rls.ts`. La política `tenantIsolationPolicy` se aplica a las tablas que tienen `tenant_id`:

```sql
tenant_id = current_setting('app.current_tenant_id')::uuid
```

La variable `app.current_tenant_id` se fija al inicio de cada transacción via:

```typescript
await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${this.tenantId}, true)`);
```

El tercer argumento `true` hace que la variable sea local a la transacción — se descarta automáticamente al hacer COMMIT o ROLLBACK.

Además del tenant, `AuthenticatedContext` también fija `app.current_user_id` para las políticas que necesitan saber qué usuario hizo la operación.

### Rol restringido de la aplicación

Históricamente, la aplicación web conectaba a PostgreSQL con el superusuario (`POSTGRES_USER`). Los superusuarios **siempre saltan el RLS**, incluso con `FORCE ROW LEVEL SECURITY` — las políticas de aislamiento por tenant estaban activas en los tests pero no en producción.

Para corregirlo, se introdujo el rol `domio_app` con `NOSUPERUSER` y `NOBYPASSRLS` (fuente: `deploy/app-role.sql`):

```sql
ALTER ROLE domio_app
  WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
  PASSWORD :'app_password';

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO domio_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO domio_app;
```

En `deploy/docker-compose.app.yml:42`, el servicio `web` conecta con `domio_app`:

```yaml
DATABASE_URL: postgresql://domio_app:${APP_DB_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

El worker, que ejecuta migraciones (DDL), sigue conectando con el owner (`POSTGRES_USER`). No expone superficie a internet y las tablas que toca (`email_queue`) no tienen política de tenant.

El Makefile automatiza la aplicación del rol:

```bash
make -f deploy/Makefile app-role-dev   # Crear/actualizar rol en desarrollo
make -f deploy/Makefile app-role-prod  # Crear/actualizar rol en producción
```

Fuente: `deploy/app-role.sql`, `deploy/Makefile:70-75`, `deploy/docker-compose.app.yml:42`.

## API pública v1

### Filosofía

La API pública sigue estos principios:

1. **Versionado por URL**: `/api/v1/` — si hay cambios rompientes, se incrementa la versión.
2. **Autenticación obligatoria**: toda petición requiere API key (vía `X-API-Key` o `Authorization: Bearer`).
3. **Rate limiting por key**: cada API key tiene su propio límite configurable. Cabeceras `X-RateLimit-*` en todas las respuestas.
4. **Documentación OpenAPI auto-generada**: los schemas de respuesta se derivan de schemas Zod, no se escriben a mano. Accesible en `/api/internal/docs`.
5. **Error consistente**: todas las respuestas de error tienen la forma `{ "error": "mensaje" }`. Los errores de validación añaden `{ "details": { "campo": ["error"] } }`.

### Endpoints

#### GET /api/v1/promociones

Lista paginada de promociones publicadas de tipo `portfolio`.

- **Autenticación**: API key
- **Paginación**: cursor-based (parámetros `cursor` y `limit`)
- **Rate limit**: por API key

Parámetros query:

| Nombre | Tipo | Defecto | Descripción |
|--------|------|---------|-------------|
| `cursor` | string | - | Cursor de la página anterior (de `nextCursor` en la respuesta) |
| `limit` | integer | 20 | Items por página (mín: 1, máx: 100) |

Respuesta `200`:

```json
{
  "items": [{ "id": "uuid", "slug": "...", "name": "...", ... }],
  "nextCursor": "eyJpZCI6IjEyMyJ9",
  "total": 42
}
```

Errores: `401` (missing key), `403` (invalid/revoked), `429` (rate limit).

#### POST /api/v1/leads/institutional

Crea un lead institucional con consentimiento RGPD.

- **Autenticación**: API key
- **Rate limit**: por API key

Request body:

```json
{
  "promocionId": "uuid",
  "tipologiaId": "uuid (opcional)",
  "name": "Nombre",
  "email": "email@ejemplo.com",
  "phone": "+34600000000 (opcional)",
  "message": "Mensaje (opcional)",
  "consent": {
    "legalBasis": "RGPD_ARTICLE_6_1_A",
    "textAccepted": "He leído y acepto la política de privacidad"
  }
}
```

Respuesta `201`:

```json
{
  "id": "uuid",
  "status": "NEW"
}
```

Errores: `400` (invalid JSON), `401` (missing key), `403` (invalid/revoked), `422` (validation), `429` (rate limit).

### Autenticación

```
X-API-Key: domio_live_abc123def456
Authorization: Bearer domio_live_abc123def456
```

El flujo (fuente: `src/features/api-public/middleware/api-key-auth.ts`):

1. Extraer key del header.
2. Usar el prefijo (primeros 8 caracteres: `domio_li`) para filtrar candidatos en `api_keys` con búsqueda por índice.
3. Comparar con bcrypt contra cada hash candidato.
4. Si coincide: actualizar `last_used_at` (fire-and-forget) y devolver `ApiKeyContext`.
5. Si no coincide: `403 Invalid or revoked API key`.

### Rate limiting

Implementado con Upstash Redis usando un algoritmo de sliding window counter con 2 sub-ventanas. Cada API key tiene un límite por minuto configurable (por defecto 60).

Sin `RATE_LIMIT_STORE_URL`: fallo al arrancar en producción (`instrumentation.ts:8-15`), `NoopRateLimiter` en local.

## API interna

El backoffice se comunica con el servidor a través de route handlers internos en `app/api/internal/`. No requieren API key (usan sesión JWT) y están protegidos por el middleware Edge.

| Endpoint | Método | Propósito | Archivo |
|----------|--------|-----------|---------|
| `/api/internal/promociones` | GET | Listar promociones del tenant | `app/api/internal/promociones/route.ts` |
| `/api/internal/promociones/[id]` | GET/PUT | CRUD de promoción individual | `app/api/internal/promociones/[id]/route.ts` |
| `/api/internal/promociones/[id]/draft` | PUT | Guardar/recuperar borrador | `app/api/internal/promociones/[id]/draft/route.ts` |
| `/api/internal/promociones/[id]/history` | GET | Histórico de cambios de promoción | `app/api/internal/promociones/[id]/history/route.ts` |
| `/api/internal/content/blocks` | GET/POST | Bloques de contenido CMS | `app/api/internal/content/blocks/route.ts` |
| `/api/internal/content/contact` | GET/PUT | Configuración de contacto | `app/api/internal/content/contact/route.ts` |
| `/api/internal/content/history` | GET | Histórico de cambios de contenido | `app/api/internal/content/history/route.ts` |
| `/api/internal/content/revert` | POST | Revertir contenido a versión anterior | `app/api/internal/content/revert/route.ts` |
| `/api/internal/leads/unread-count` | GET | Contador de leads no leídos | `app/api/internal/leads/unread-count/route.ts` |
| `/api/internal/media/upload` | POST | Subir imagen a R2 | `app/api/internal/media/upload/route.ts` |
| `/api/internal/revalidate` | POST | Revalidar caché ISR | `app/api/internal/revalidate/route.ts` |
| `/api/internal/docs` | GET | Documentación OpenAPI | `app/api/internal/docs/route.ts` |
| `/api/health` | GET | Health check | `app/api/health/route.ts` |
| `/api/debug-error` | GET | Forzar error (debug Sentry) | `app/api/debug-error/route.ts` |

## Frontend

### Páginas públicas

| Ruta | Descripción | Componentes clave |
|------|-------------|-------------------|
| `/` | Home con promociones destacadas | Hero, KPI stats, featured grid |
| `/portafolio` | Catálogo completo con filtros | FilterBar, PromocionCard, pagination |
| `/inmuebles/[slug]` | Detalle de promoción | Galería, mapa (MapLibre), tipologías, formulario lead, JSON-LD |
| `/contacto` | Página de contacto | Formulario con Turnstile |
| `/sobre` | Página "sobre nosotros" | CMS content blocks |
| `/favoritos` | Favoritos del usuario | localStorage-based |
| `/legal/[slug]` | Aviso legal, privacidad, cookies | CMS content blocks |

### Backoffice (panel)

El backoffice se sirve en `/panel` y está protegido por el middleware Edge. Incluye:

- **Dashboard**: KPIs de leads y promociones
- **Catálogo**: CRUD de promociones con editor de bloques y galería
- **Leads**: Listado, detalle, notas, histórico, ARSOP, asignación, exportación CSV
- **Equipo**: Invitar, activar/desactivar, eliminar usuarios
- **Contenidos**: Editor CMS con versionado (páginas públicas)
- **API Keys**: Gestión de claves para API pública

### Componentes compartidos

UI reutilizable en `src/shared/components/`: `button.tsx`, `input.tsx`, `skeleton.tsx`, `toast.tsx`, `footer.tsx`, `nav.tsx`, `TurnstileWidget.tsx`, `error-boundary.tsx`, `media-image.tsx`, `skip-to-content.tsx`.

### SEO

- JSON-LD estructurado para cada página de detalle de promoción
- Sitemap dinámico
- Metadata dinámica por promoción (Open Graph, Twitter Cards)
- Cabeceras `X-Robots-Tag` en backoffice e internal API

## Variables de entorno

### APP_ENV

El proyecto usa `APP_ENV` como variable semántica independiente de `NODE_ENV`. `NODE_ENV` distingue `development` (next dev) de `production` (next build/start), pero no puede diferenciar un servidor de desarrollo desplegado de uno de producción — ambos corren un build de producción. `APP_ENV` llena ese vacío.

| Valor | Entorno | Uso |
|-------|---------|-----|
| `local` | Máquina del desarrollador | Imágenes servidas desde `/public` (placeholders, sin R2). |
| `development` | Servidor de desarrollo | Servicios reales (R2, Resend, etc.). |
| `production` | Producción | Servicios reales + validaciones estrictas. |

Fuente: `src/shared/config/app-env.ts`.

### Tabla completa

| Variable | Oblig. | APP_ENV | Propósito | Qué pasa si falta |
|----------|:------:|---------|-----------|-------------------|
| `DATABASE_URL` | Sí | todos | Conexión PostgreSQL. En producción apunta a `domio_app` (rol sin privilegios, sujeto a RLS). | `db/client.ts` lanza `Error("DATABASE_URL environment variable is not defined")`. |
| `PUBLIC_TENANT_ID` | Sí | todos | UUID del tenant activo para la web pública. | `PublicContext` no puede construirse. |
| `AUTH_SECRET` | Sí | todos | Secreto JWT para next-auth. Generar con `openssl rand -base64 32`. | NextAuth falla al firmar/verificar tokens. |
| `NEXTAUTH_URL` | Sí | todos | URL base para redirects de autenticación. | NextAuth hardcodea `http://localhost:3000` y los redirects (logout, etc.) mandan a localhost aunque estés en producción. |
| `RATE_LIMIT_STORE_URL` | **Sí** | dev/prod | URL REST de Upstash Redis. | **En producción**: la app falla al arrancar (fail-fast en `instrumentation.ts`). **En local**: `createRateLimiter()` devuelve `NoopRateLimiter` (permite todo, sin aviso). |
| `RATE_LIMIT_STORE_TOKEN` | **Sí** | dev/prod | Token de autenticación de Upstash. | Las peticiones HTTP a Upstash fallan (401). |
| `RESEND_API_KEY` | Sí | dev/prod | API key de Resend para envío de emails. | `ResendClientImpl` falla al enviar. Los emails quedan en `email_queue` sin procesar. |
| `R2_ACCOUNT_ID` | Sí | dev/prod | Account ID de Cloudflare R2. | `r2-client.ts` no puede construir el endpoint. |
| `R2_ACCESS_KEY_ID` | Sí | dev/prod | Access Key de R2. | Las operaciones S3 fallan (AuthFailure). |
| `R2_SECRET_ACCESS_KEY` | Sí | dev/prod | Secret Key de R2. | Igual que arriba. |
| `R2_BUCKET` | Sí | dev/prod | Nombre del bucket R2. | Las operaciones S3 fallan (NoSuchBucket / AccessDenied). |
| `R2_PUBLIC_URL` | Sí | dev/prod | URL pública del bucket (CDN). | `getPublicMediaUrl()` devuelve URLs rotas. |
| `NEXT_PUBLIC_SITE_URL` | Sí | todos | URL canónica del sitio (sitemap, OG images, canonical). | En local se usa `http://localhost:3000`. En producción, sitemap y OG apuntan a URL incorrecta. |
| `SENTRY_DSN` | Recomendada | dev/prod | DSN de Sentry (errores de servidor). | Sentry no captura errores server-side. |
| `NEXT_PUBLIC_SENTRY_DSN` | Recomendada | dev/prod | DSN de Sentry (errores de cliente). Se incrusta en build. | Sentry no captura errores client-side. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Recomendada | dev/prod | Site Key de Turnstile (pública). | Los formularios públicos no muestran el widget. |
| `TURNSTILE_SECRET_KEY` | Recomendada | dev/prod | Secret Key de Turnstile. | La verificación server-side se omite (log: `[Domio] TURNSTILE_SECRET_KEY not configured. CAPTCHA verification skipped.`). |
| `WORKER_INTERVAL_MS` | No | - | Intervalo de polling del worker de emails (defecto: 30000ms). | Worker usa 30s. |

## Arranque rápido

Levanta el proyecto en local con PostgreSQL sin servicios externos. Ideal para empezar a desarrollar o explorar el código.

### Variables mínimas

```bash
# .env.local — mínimo para arrancar
DATABASE_URL=postgresql://domio:domio@localhost:5432/domio_dev
PUBLIC_TENANT_ID=00000000-0000-0000-0000-000000000000  # reemplazar con un UUID real
AUTH_SECRET=una-cadena-aleatoria-de-32-caracteres-como-minimo
NEXTAUTH_URL=http://localhost:3000
```

Sin estas cuatro variables la aplicación no arranca o falla inmediatamente (`db/client.ts`, `PublicContext`, NextAuth). Sin el resto, el proyecto sigue funcionando con estas limitaciones:

- **Emails**: se encolan en `email_queue` pero nunca se envían (no hay `RESEND_API_KEY`).
- **Imágenes**: se sirven placeholders desde `/public` en lugar de Cloudflare R2 (`APP_ENV=local` por defecto).
- **Captcha**: la verificación Turnstile se omite (log: `CAPTCHA verification skipped.`).
- **Rate limiting**: `createRateLimiter()` devuelve `NoopRateLimiter` (permite todo). El fail-fast de producción no se activa si `APP_ENV=local`.
- **Sentry**: no se inicializa, errores no capturados.
- **Rate limiting de login**: no hay Upstash Redis, el middleware Edge permite todos los intentos.

### Pasos

```bash
corepack enable
pnpm install
cp .env.example .env.local
# Editar DATABASE_URL, PUBLIC_TENANT_ID, AUTH_SECRET, NEXTAUTH_URL en .env.local

# PostgreSQL con PostGIS
docker run -d \
  --name domio-postgres \
  -e POSTGRES_USER=domio \
  -e POSTGRES_PASSWORD=domio \
  -e POSTGRES_DB=domio_dev \
  -p 5432:5432 \
  postgis/postgis:16-3.4

# Migraciones + datos de prueba
pnpm db:migrate
pnpm db:seed

# Arrancar
pnpm dev  # http://localhost:3000
```

El worker de emails es opcional en local:

```bash
pnpm worker:emails  # Procesa la cola email_queue cada 30s
```

## Instalación y desarrollo local

### Requisitos

- Node.js >= 20
- pnpm 9.x (via corepack: `corepack enable`)
- PostgreSQL 15+ con PostGIS (recomendado: Docker)
- Opcional: cuentas en Cloudflare R2, Resend, Upstash, Sentry

### Primeros pasos

```bash
corepack enable
pnpm install
cp .env.example .env.local
# Editar .env.local con las credenciales de desarrollo
```

### Base de datos local

```bash
docker run -d \
  --name domio-postgres \
  -e POSTGRES_USER=domio \
  -e POSTGRES_PASSWORD=domio \
  -e POSTGRES_DB=domio_dev \
  -p 5432:5432 \
  postgis/postgis:16-3.4

pnpm db:migrate
pnpm db:seed  # (opcional) datos de prueba
```

### Arrancar

```bash
pnpm dev  # http://localhost:3000
```

El worker de emails es opcional en local:

```bash
pnpm worker:emails  # Procesa la cola email_queue cada 30s
```

## Scripts

### Desarrollo

| Script | Cuándo usarlo | Qué hace internamente |
|--------|---------------|-----------------------|
| `pnpm dev` | Durante el desarrollo normal | `next dev --turbopack`. Recarga en caliente. |
| `pnpm build:development` | Antes de desplegar en dev | Build con variables de `.env.development`. |
| `pnpm build:production` | Antes de construir la imagen Docker | Build con variables de `.env.production`. |

### Calidad (se ejecutan automáticamente via Husky)

| Script | Hook | Qué hace |
|--------|------|----------|
| `pnpm lint` | pre-commit | ESLint con flat config (sonarjs + jsx-a11y). |
| `pnpm typecheck` | pre-commit | `tsc --noEmit` con strict mode y `noUncheckedIndexedAccess`. |
| `pnpm test:run` | pre-push | Vitest una sola ejecución. ~1736 tests. |
| `pnpm build` | pre-push | `next build`. Verifica que el proyecto compila. |
| `pnpm quality` | Antes de PR | lint + typecheck + test:run. Triple comprobación. |
| `pnpm verify` | Antes de mergear a main | quality + contract + e2e + build. Cobertura completa. |

### Tests

| Script | Qué hace |
|--------|----------|
| `pnpm test` | Vitest en modo watch (útil para TDD). |
| `pnpm test:run` | Vitest una sola ejecución. |
| `pnpm test:coverage` | Vitest con reporte v8. |
| `pnpm test:e2e` | Playwright tests (requiere build previo). |
| `pnpm test:contract` | Tests de contrato de la API v1. |
| `pnpm test:contract:update` | Actualiza snapshots de contract tests. |

### Base de datos

| Script | Cuándo | Precaución |
|--------|--------|------------|
| `pnpm db:generate` | Tras modificar schema Drizzle | Revisar el SQL generado. |
| `pnpm db:migrate` | Para aplicar migraciones | Nunca en producción sin backup. |
| `pnpm db:seed` | Solo en local/dev | Puebla datos de prueba. |
| `pnpm db:studio` | Para inspeccionar la DB | Abre Drizzle Studio en el navegador. |
| `pnpm db:push` | Solo en desarrollo | No versiona. Equivalente a `migrate` directo. |

### Operaciones

| Script | Qué hace |
|--------|----------|
| `pnpm worker:emails` | Bucle infinito: reclama filas `email_queue` PENDING, llama a Resend, actualiza estado. Poll cada 30s. |
| `pnpm check:services` | Verifica conectividad con servicios externos. |

## Testing

### Estrategia

El proyecto no usa una pirámide de testing abstracta. Los tests existentes se organizan así:

| Tipo | Archivos | Runner | Objetivo |
|------|----------|--------|----------|
| **Unitarios** | `src/**/*.spec.ts` (junto al código) | Vitest | Funciones puras, validación de schemas Zod, componentes aislados con Testing Library, hooks. |
| **Integración** | `tests/integration/` | Vitest | Servicios con dependencias reales (EmailService, MediaService, Drizzle queries). Requieren mock o instancia de DB. |
| **Aislamiento** | `tests/isolation/` | Vitest | Verificación de que el sistema multiinquilino aísla correctamente los datos. Requieren PostgreSQL real con RLS activo. Ver `tests/isolation/db.ts`. |
| **Contrato** | `tests/contract/` | Vitest | La API pública v1 responde exactamente lo que especifica el contrato OpenAPI. Comparan snapshots de respuesta. |
| **E2E** | `tests/e2e/` | Playwright | Flujos completos en navegador real (Chromium, WebKit). Incluyen page objects en `tests/e2e/pages/`. |

### Tests de aislamiento multiinquilino

Son los tests más característicos del proyecto (fuente: `tests/isolation/tenant-isolation.test.ts`):

| Test | Verifica |
|------|----------|
| T022 | Tenant A solo ve sus promociones (no las de B). |
| T023 | Tenant A inserta un lead que Tenant B no puede leer. |
| T024 | Escrituras concurrentes de A y B producen conteos correctos por tenant. |
| T025 | Ningún archivo en `src/infrastructure/tenant/` o `src/infrastructure/db/repositories/` contiene `SET` sin `SET LOCAL` (evita fugas de contexto). |
| T026 | `createLeadService` rechaza un `promocionId` de otro tenant. |

### Ejecutar todos los tests

```bash
pnpm verify  # quality + contract + e2e + build
```

## Despliegue

### Estrategia

El proyecto se despliega en un único VPS con Docker Compose, usando `output: standalone` de Next.js (genera un servidor Node.js autónomo sin dependencias de desarrollo). Dos stacks independientes en el mismo VPS, diferenciados por el nombre de proyecto de Docker Compose (`-p domio-prod`, `-p domio-dev`).

### Componentes

| Componente | Imagen | Propósito |
|------------|--------|-----------|
| `web` | `domio-web` | Servidor Next.js standalone (puerto 3000). Conecta con `domio_app` (rol restringido con RLS). |
| `worker` | `domio-tools` | Worker de emails (misma imagen, comando distinto). Conecta con owner (DDL permitido). |
| `postgres` | `postgis/postgis:16-3.4` | Base de datos con PostGIS. Volumen persistente. |
| `caddy` | `caddy:2` | Reverse proxy con TLS automático (Let's Encrypt). Enruta por dominio. |

Fuente: `deploy/docker-compose.app.yml`, `deploy/docker-compose.proxy.yml`, `deploy/Caddyfile`.

### Makefile de operación

El `deploy/Makefile` centraliza las operaciones del VPS. Comandos principales:

| Comando | Qué hace |
|---------|----------|
| `make -f deploy/Makefile net` | Crear la red compartida `domio-web` (una vez) |
| `make -f deploy/Makefile proxy-up` | Levantar Caddy |
| `make -f deploy/Makefile dev-up` | Levantar/actualizar stack development |
| `make -f deploy/Makefile prod-up` | Levantar/actualizar stack producción |
| `make -f deploy/Makefile dev-migrate` | Ejecutar migraciones en development |
| `make -f deploy/Makefile prod-migrate` | Ejecutar migraciones en producción |
| `make -f deploy/Makefile build-dev` | Construir imágenes web+tools para desarrollo |
| `make -f deploy/Makefile deploy-dev` | Build + levantar sin pull (desarrollo) |
| `make -f deploy/Makefile backup` | `pg_dump` de producción |
| `make -f deploy/Makefile restore-test` | Restaurar último backup en BD temporal |
| `make -f deploy/Makefile app-role-dev` | Crear/actualizar rol RLS `domio_app` en dev |
| `make -f deploy/Makefile app-role-prod` | Crear/actualizar rol RLS `domio_app` en prod |
| `make -f deploy/Makefile check-dev` | Verificar servicios externos en dev |

### Pipeline CD (GitHub Actions)

El workflow `cd.yml` se dispara con push a `develop` (dev) o `main` (prod):

1. **Calidad**: Reusa `ci.yml` (lint + typecheck + tests + build).
2. **Build**: `docker build --target runner` → `domio-web`, `docker build --target tools` → `domio-tools`.
3. **Push**: a GHCR con tag `sha` y `latest`/`develop`.
4. **SSH al VPS**:
   - `pg_dump` de la base de datos (backup pre-migración obligatorio).
   - `docker compose pull` (nuevas imágenes).
   - `docker compose run --rm worker pnpm db:migrate` (migraciones).
   - `docker compose up -d` (recrea web y worker).
   - **Healthcheck**: espera `200` en `/api/health`. Si falla tras N intentos: rollback automático al tag anterior (imagen inmutable por SHA).

Fuente: `.github/workflows/cd.yml`, `Dockerfile`, `deploy/docker-compose.app.yml`, `docs/RUNBOOK-PRODUCCION.md`.

### Imagen Docker

El `Dockerfile` define dos targets:

- **`runner`**: web en producción (standalone). Imagen minimalista: solo `server.js`, `.next/static/`, y `public/`. Corre como usuario `nextjs` no-root.
- **`tools`**: worker de emails + migraciones. Reusa el builder (incluye `tsx`, `drizzle-kit`, src y migraciones).

Build-args requeridos: `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_TENANT_ID`, `R2_PUBLIC_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_RELEASE`.

## Decisiones arquitectónicas

### 1. RLS en lugar de tablas separadas para multiinquilino

**Decisión**: Usar PostgreSQL Row-Level Security con `set_config` en transacción, no schemas separados por tenant ni bases de datos distintas.

**Evidencia**: `src/infrastructure/db/schema/rls.ts`, `src/infrastructure/tenant/TenantContext.ts:31`.

**Ventaja**: Una sola base de datos, migraciones únicas, sin necesidad de ejecutar DDL por tenant. El aislamiento se garantiza a nivel de fila, no de tabla.

**Inconveniente**: La política RLS se aplica a *todas* las queries, incluyendo las del backoffice. Si un desarrollador escribe `db.select().from(users)` sin pasar por un repositorio, la consulta se ejecuta sin contexto de tenant y devuelve 0 filas. El test T025 protege contra esto con un grep que detecta `SET` sin `SET LOCAL`.

### 2. Email asíncrono con cola en DB + worker separado

**Decisión**: No enviar emails directamente desde las server actions. Encolar en `email_queue` y procesar con un worker independiente.

**Evidencia**: `src/infrastructure/email/email.service.ts`, `src/infrastructure/email/worker.ts`, `src/infrastructure/db/schema/email-queue.ts`.

**Ventaja**: El formulario de contacto responde al usuario aunque Resend esté caído o lento. El worker reintenta con backoff exponencial (2^(attempts+1) minutos). Sin bloqueo del hilo principal.

**Inconveniente**: El worker es un proceso adicional que debe desplegarse y monitorizarse. Si el worker se cae, los emails quedan en la cola sin enviar.

### 3. API key con prefijo + hash bcrypt

**Decisión**: Almacenar API keys hasheadas con bcrypt. Los primeros 8 caracteres se guardan como `key_prefix` para búsquedas eficientes.

**Evidencia**: `src/infrastructure/db/schema/api-keys.ts:22-25`, `src/features/api-public/middleware/api-key-auth.ts:105-106`.

**Ventaja**: Si la tabla `api_keys` se filtra, las keys originales no pueden recuperarse (bcrypt one-way). El prefijo permite reducir los candidatos a comparar de O(n) a O(1) en el caso común.

**Inconveniente**: bcrypt es lento por diseño (~50ms por comparación). Con N candidatos, la autenticación puede tardar hasta N×50ms.

### 4. Zod-to-OpenAPI en lugar de Swagger manual

**Decisión**: Generar la especificación OpenAPI a partir de los schemas Zod de request/response.

**Evidencia**: `src/features/api-public/openapi/generate-openapi.ts`.

**Ventaja**: Un cambio en el schema Zod se refleja automáticamente en la documentación. No hay drift entre código y documentación.

**Inconveniente**: Zod v4 usa draft 2020-12 para JSON Schema, que no es 100% compatible con el `SchemaObject` de `zod-to-openapi`. Se requiere un cast.

### 5. APP_ENV + NODE_ENV como variables independientes

**Decisión**: `APP_ENV` (local/development/production) y `NODE_ENV` (development/production) son ortogonales.

**Evidencia**: `src/shared/config/app-env.ts`.

**Ventaja**: Un servidor de desarrollo desplegado corre con `NODE_ENV=production` (build de producción) y `APP_ENV=development` (usa el bucket R2 de desarrollo). Sin `APP_ENV`, no habría forma de distinguirlo del servidor de producción.

### 6. Rol restringido para la aplicación web

**Decisión**: La app web conecta con `domio_app` (NOSUPERUSER + NOBYPASSRLS), no con el owner de la base de datos.

**Evidencia**: `deploy/app-role.sql`, `deploy/docker-compose.app.yml:42`.

**Ventaja**: Las políticas RLS se aplican realmente en producción. Antes de esta decisión, el superusuario saltaba el RLS y el aislamiento multiinquilino era efectivamente nulo en producción.

**Inconveniente**: El worker debe mantener la conexión con el owner para poder ejecutar DDL (migraciones). Esto añade complejidad a la configuración de Docker Compose.

### 7. Login rate limiting en middleware Edge

**Decisión**: El rate limiting de login se aplica en el middleware Edge, no dentro de NextAuth, para rechazar peticiones abusivas antes de que toquen Node.js.

**Evidencia**: `middleware.ts:31-34`, `src/infrastructure/auth/rate-limit-login.ts`.

**Ventaja**: Las peticiones de fuerza bruta se rechazan en el Edge (mínimo coste de CPU). No consumen conexiones de base de datos ni ejecutan bcrypt.

**Inconveniente**: El middleware Edge no puede importar módulos Node.js nativos. La lógica de rate limiting usa Upstash HTTP, que funciona en Edge, pero no puede hacer consultas a PostgreSQL directamente.

### 8. Sentry via `instrumentation.ts` en lugar de `withSentryConfig`

**Decisión**: Inicializar Sentry server-side en `instrumentation.ts` y client-side en `instrumentation-client.ts`, en lugar de envolver `next.config` en `withSentryConfig`.

**Evidencia**: `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`.

**Ventaja**: `instrumentation-client.ts` es cargado nativamente por Next 15.3+ sin necesidad de plugins de webpack. La solución anterior (`sentry.client.config.ts`) nunca funcionó porque `withSentryConfig` no estaba configurado.

**Inconveniente**: `instrumentation.ts` solo se ejecuta en Node.js runtime, no en Edge. Los errores en middleware Edge no son capturados por Sentry.

### 9. Security headers en todos los entornos

**Decisión**: Cabeceras de seguridad (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) se aplican globalmente en todas las respuestas.

**Evidencia**: `next.config.ts:10-19`.

```typescript
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
```

En entornos no productivos se añade `X-Robots-Tag: noindex, nofollow` para evitar indexación accidental.

### 10. Drizzle ORM en lugar de Prisma

**Decisión**: Usar Drizzle ORM con `pg` Pool directo en lugar de Prisma.

**Evidencia**: `src/infrastructure/db/drizzle.config.ts` (defineConfig, dialect `postgresql`), `src/infrastructure/db/client.ts` (Pool de `pg`), `package.json` (`drizzle-orm`, `drizzle-kit`, `pg` como dependencias; ninguna dependencia de Prisma). Drizzle expone el SQL generado de forma explícita (`src/infrastructure/db/migrations/`).

**Ventaja**: Drizzle se integra de forma natural con el pool de `pg`, no abstrae la conexión. El RLS vía `pgPolicy` tiene soporte directo en el schema DSL, alineado con la arquitectura multiinquilino.

**Inconveniente**: Menos ecosistema de herramientas que Prisma. No tiene Prisma Studio, y la generación de tipos requiere ejecutar `drizzle-kit` manualmente.

### 11. Despliegue en VPS con Docker en lugar de Vercel

**Decisión**: Contenerizar con `output: "standalone"` y desplegar en un único VPS con Docker Compose, no en Vercel Serverless.

**Evidencia**: `next.config.ts:23` (`output: "standalone"`), `Dockerfile` (multi-stage, target `runner` con `server.js` standalone), `deploy/docker-compose.app.yml` (stack postgres + web + worker), `deploy/docker-compose.proxy.yml` (Caddy reverse proxy). Dos stacks independientes en el mismo VPS diferenciados por proyecto de Compose (`-p domio-prod`, `-p domio-dev`).

**Ventaja**: El worker de emails y PostgreSQL viven en la misma red Docker. La latencia entre web y base de datos es <1ms (frente a una conexión externa a Neon desde Vercel). Coste fijo mensual predecible, sin límites de execution timeout (los server actions pueden durar >10s). El rol `domio_app` con `NOBYPASSRLS` solo tiene sentido si la app y la DB comparten red Docker.

**Inconveniente**: El desarrollador debe gestionar el VPS (actualizaciones, backups, monitorización). No hay auto-scaling ni deploys por git push como en Vercel.

### 12. Rate limiting con Upstash HTTP en lugar de Redis TCP

**Decisión**: Usar Upstash Redis via cliente HTTP (`@upstash/redis`), no un Redis autogestionado con conexión TCP.

**Evidencia**: `src/infrastructure/rate-limiting/redis-client.ts` (construye `new Redis({ url, token })` con URL REST de Upstash), `package.json` (`@upstash/redis` como dependencia). El middleware Edge (`middleware.ts:31-34`) importa `checkLoginRateLimit` que usa el cliente HTTP de Upstash — funciona en Edge Runtime sin acceso a sockets TCP.

**Ventaja**: El cliente HTTP de Upstash funciona en Edge Runtime (sin `net` ni `tls` nativos). No requiere gestionar un servidor Redis. El fail-fast en `instrumentation.ts:8-15` asegura que producción no arranque sin rate limiting.

**Inconveniente**: Latencia adicional por HTTP frente a Redis TCP (~5-10ms por llamada). No se puede conectar a una instancia Redis estándar (el cliente HTTP solo habla con la API REST de Upstash). Si Upstash está caído, el rate limiting deja de funcionar (en producción la app no arranca).

### 13. next-auth v4 en lugar de Auth.js v5

**Decisión**: Usar next-auth v4 (packages `next-auth` y `next-auth/jwt`) en lugar de Auth.js v5 (`@auth/*`).

**Evidencia**: `package.json` (`"next-auth": "^4.24.11"`). `src/infrastructure/auth/auth.config.ts:160-165` envuelve `NextAuth` en un wrapper que implementa `NextAuthV5Compat` `GET`/`POST` para compatibilidad con la API de App Router de Next 15. El middleware Edge usa `getToken` de `next-auth/jwt` para verificar el JWT desde Edge Runtime.

**Ventaja**: next-auth v4 tiene soporte maduro para `getToken()` en Edge Runtime, necesario para el middleware de protección de rutas sin necesidad de un endpoint de verificación. La compatibilidad con App Router se logra con un wrapper de 5 líneas.

**Inconveniente**: v4 recibe solo parches de seguridad, no nuevas features. Migrar a v5 requerirá cambiar el wrapper y verificar que `getToken()` en Edge Runtime sigue funcionando.

## Development Guide

### Cómo añadir una nueva feature

1. Crear `src/features/<nombre>/` con subdirectorios `components/`, `actions/`, `server/` según la feature lo requiera.
2. Si necesita persistencia:
   - Crear schema en `src/infrastructure/db/schema/<nombre>.ts`.
   - Exportar en `src/infrastructure/db/schema/index.ts`.
   - Crear repositorio extendiendo `TenantAwareRepository`.
   - Ejecutar `pnpm db:generate` y revisar el SQL.
3. Si necesita exponer datos via API:
   - Crear route handler en `app/api/...`.
   - Si es API pública: añadir middleware de API key + rate limiting + documentación OpenAPI.
4. Escribir tests: schemas, repositorio, acciones, componentes.
5. Verificar con `pnpm quality`.

### Cómo añadir una migración

```bash
# 1. Modificar schema en src/infrastructure/db/schema/
# 2. Generar migración
pnpm db:generate
# 3. Revisar el SQL en src/infrastructure/db/migrations/NNNN_descripcion.sql
# 4. Aplicar en local
pnpm db:migrate
# 5. Verificar sync (debe producir 0 cambios)
pnpm db:generate
```

### Cómo añadir un endpoint a la API pública v1

1. Definir schema Zod en `src/features/api-public/schemas/`.
2. Implementar lógica en `src/features/api-public/server/`.
3. Añadir route handler en `app/api/v1/...`.
4. Registrar path y schemas en `generateOpenAPISpec()`.
5. Aplicar rate limiting con `applyRateLimit()`.
6. Escribir tests de contrato en `tests/contract/`.

### Convenciones

- **Naming de archivos**: `kebab-case` para schemas y config, `PascalCase` para componentes React, `camelCase` para funciones.
- **Importaciones**: usar path alias `@/` (mapea a `src/`). No usar imports relativos profundos.
- **Estructura de feature**: `actions/` (server actions), `components/` (React), `server/` (lógica pura), `hooks/` (custom hooks React), `schemas/` (Zod).
- **Repositorios**: toda operación de DB debe pasar por un repositorio que extienda `TenantAwareRepository`. No escribir queries SQL directamente en acciones o componentes.
- **Transacciones**: usar `ctx.withTransaction()` para operaciones multi-tabla que requieren aislamiento + RLS.
- **Tests unitarios**: junto al código (`Componente.spec.tsx`, `accion.spec.ts`).
- **Tests con DB**: en `tests/integration/` o `tests/isolation/`.

## Troubleshooting

### Error: `No SET without LOCAL in transactional tenant paths`

```bash
FAIL  tests/isolation/tenant-isolation.test.ts > T025
```

Has escrito `SET variable = valor` en un repositorio o en `src/infrastructure/tenant/`. Usa `SET LOCAL` (o `set_config(..., true)`) en su lugar para que el cambio sea local a la transacción y no pueda filtrarse entre peticiones.

### Error: `DATABASE_URL environment variable is not defined`

El cliente de base de datos (`src/infrastructure/db/client.ts`) se inicializa perezosamente. Si `DATABASE_URL` no está definida cuando se invoca la primera operación de DB, lanza este error. Verifica que tu `.env.local` tiene la variable.

### Error: `Rate limiting not available (fail-fast)`

En producción (`APP_ENV=production`), si `RATE_LIMIT_STORE_URL` no está definida, la aplicación falla al arrancar en `instrumentation.ts`. Define la variable con la URL REST de Upstash. Si estás en local, usa `APP_ENV=local` (el rate limiter opera en modo no-op).

### Error: `Column already exists` al ejecutar `pnpm db:migrate`

La migración `0007_early_deadpool.sql` tuvo que usar `ADD COLUMN IF NOT EXISTS` porque re-añadía una columna ya creada en `0005`. Si tu base de datos local se creó con migraciones posteriores a `0005`, `0007` fallará. Solución: aplicar el `IF NOT EXISTS` manualmente o recrear la base de datos desde 0.

### Los emails no se envían

1. Verifica que `RESEND_API_KEY` está definida.
2. Verifica que el worker está corriendo: `docker ps | grep worker` o `pnpm worker:emails` si estás en local.
3. Revisa la tabla `email_queue` en la base de datos: los registros `FAILED` tienen el error en `last_error`.
4. Si el worker está en el mismo contenedor web, no funciona. El worker es un proceso independiente.

### Error al subir imágenes

Verifica las credenciales de R2. En local, `APP_ENV=local` permite usar placeholders. Para desarrollo, define `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` y `R2_PUBLIC_URL`.

## FAQ

### ¿Por qué PostgreSQL y no SQLite/MongoDB?

PostgreSQL es necesario por:
- **RLS**: aislamiento multiinquilino a nivel de fila (no disponible en SQLite ni MongoDB).
- **PostGIS**: datos geoespaciales de las promociones (índices GiST, `geometry(Point,4326)`).

### ¿Por qué un worker separado para emails?

La respuesta está en `src/infrastructure/email/email.service.ts` y `src/infrastructure/email/worker.ts`: el envío de email es una operación lenta y propensa a fallos (timeouts de red, límites de API de Resend). Procesarlo de forma asíncrona evita que un fallo de Resend retrase la respuesta al usuario que rellena un formulario.

### ¿Qué hace el middleware.ts? (Está en la raíz)

Sí, existe: `middleware.ts` en la raíz del proyecto. Se ejecuta en el Edge Runtime de Next.js y tiene tres responsabilidades:

1. **Rate limiting de login**: intercepta `POST /api/auth/callback/credentials` y aplica un límite de 5 intentos por IP en 15 minutos contra Upstash Redis. Rechaza con 429 antes de que la petición llegue a NextAuth.
2. **Auth guard**: protege todas las rutas bajo `/panel/*` (excepto login y setup-password) redirigiendo a `/panel/login` si el JWT no es válido.
3. **X-Robots-Tag**: inyecta `noindex, nofollow` en todas las respuestas del backoffice (`/panel/*` y `/api/internal/*`) para evitar indexación por buscadores.

Ver `middleware.ts` para el código completo.

### ¿Por qué `develop` recibe auto-deploy?

La documentación de despliegue (`docs/DESPLIEGUE.md`) establece dos entornos: desarrollo en `develop` → `dev.wedomio.com`, producción en `main` → `wedomio.com`. Ambos stacks corren en el mismo VPS como proyectos de Docker Compose independientes (`domio-dev`, `domio-prod`).
