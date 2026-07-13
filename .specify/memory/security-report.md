# Security Report — Domio

> Generado por: security-auditor
> Fecha: 2026-07-13
> Basado en: OWASP Top 10 2025
> Informe anterior: security-report-2026-07-10.md

---

## 1. Executive Summary

**Nivel de riesgo global:** Medio

**Estado general:** La aplicación presenta una postura de seguridad razonablemente madura en autenticación, multi-tenancy (RLS + contextos) y protección de formularios públicos principales. Sin embargo, se han identificado vulnerabilidades de severidad alta relacionadas con un server action público sin protecciones anti-spam, ausencia total de headers de seguridad HTTP, spoofing de IP en el rate limiting, y un endpoint de revalidación de caché que acepta tags arbitrarios. No se hallaron secrets hardcodeados ni vulnerabilidades críticas de inyección.

**Hallazgos por severidad:**
| Severidad | Cantidad |
|-----------|----------|
| Crítica | 0 |
| Alta | 4 |
| Media | 4 |
| Baja | 3 |
| Informativa | 2 |

**Superficie de ataque identificada:**
- 2 endpoints API públicos v1 (autenticados por API key)
- 12 endpoints API internos (autenticados por sesión)
- 3 server actions públicos (formularios de contacto y leads)
- 1 endpoint de upload de medios (autenticado)
- 1 endpoint de health público
- 1 endpoint de revalidación de caché (autenticado)
- Cloudflare Turnstile en formularios públicos (principal)
- Cloudflare R2 para almacenamiento de medios
- Resend para envío de emails transaccionales
- Sentry para observabilidad
- Upstash Redis para rate limiting

---

## 2. Hallazgos Críticos

_No se identificaron hallazgos de severidad crítica._

---

## 3. Hallazgos Altos

### [HIGH-01] Server action `createLeadAction` sin CAPTCHA ni rate limiting

**Categoría OWASP 2025:** A06:2025 — Insecure Design
**Severidad:** Alta
**Explotabilidad:** Fácil
**Archivos afectados:** `src/features/leads/actions/leads.actions.ts:229-305`

**Descripción:** El server action `createLeadAction` (exportado desde `leads.actions.ts`) es un endpoint público para crear leads desde formularios que NO incluye verificación Turnstile CAPTCHA ni rate limiting. Existe un segundo `createLeadAction` en `src/features/engagement/server/create-lead-action.ts` que sí tiene ambas protecciones, pero esta versión alternativa carece de ellas completamente.

**Escenario de ataque:**
1. Un atacante identifica el server action `createLeadAction` (es exportado y potencialmente invocable desde el cliente).
2. Ejecuta un script que envía miles de requests de creación de leads con datos falsos.
3. Sin CAPTCHA ni rate limit, cada request crea un lead + consent record + encola 2 emails (confirmación al lead + notificación al agente).
4. Impacto: agotamiento de la cola de emails, spam en las bandejas de entrada de agentes, saturación de la base de datos, y degradación del servicio.

**Evidencia en código:**
```ts
// src/features/leads/actions/leads.actions.ts:229
export async function createLeadAction(formData: FormData) {
  // 1. Parse and validate input — SIN Turnstile
  // 2. Get IP and user-agent — SIN rate limiting
  // 3. Create lead + consent record — directo a BD + email queue
  const ctx = new PublicContext();
  const result = await ctx.withTransaction(async (tx) => {
    // ... inserta lead + consent + encola emails
  });
}
```

**Remediación:**
Eliminar este server action duplicado si no se usa, o añadirle las mismas protecciones que tiene la versión en `engagement/server/create-lead-action.ts`:
```ts
// 1. Verificar Turnstile
const turnstileResult = await verifyTurnstileToken(formData.get("turnstileToken"));
if (!turnstileResult.success) return { success: false, error: "..." };

// 2. Rate limiting
const headersList = await headers();
const ip = extractIpFromHeaders(headersList);
const rateResult = await checkIpRateLimit(ip, "contact");
if (!rateResult.allowed) return { success: false, error: "..." };
```

**Coste fix:** Muy Bajo (1h)

---

### [HIGH-02] Ausencia total de headers de seguridad HTTP

**Categoría OWASP 2025:** A02:2025 — Security Misconfiguration
**Severidad:** Alta
**Explotabilidad:** Fácil
**Archivos afectados:** `next.config.ts`, `middleware.ts`

**Descripción:** La aplicación no configura ningún header de seguridad HTTP. No hay `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, ni `Permissions-Policy` en ninguna respuesta. Esto expone la aplicación a clickjacking, MIME-sniffing, y otros ataques que los headers de seguridad mitigan.

**Escenario de ataque:**
1. **Clickjacking**: Un atacante incrusta la página de login del panel en un iframe de un sitio malicioso. Sin `X-Frame-Options: DENY`, el usuario puede ser engañado para hacer clic en elementos invisibles superpuestos.
2. **MIME sniffing**: Sin `X-Content-Type-Options: nosniff`, un navegador puede interpretar un archivo subido como ejecutable si el MIME type es manipulado.
3. **Downgrade HTTPS**: Sin `Strict-Transport-Security`, un usuario en una red WiFi pública puede ser víctima de un ataque MITM que degrade la conexión a HTTP.

**Evidencia en código:**
```ts
// next.config.ts — sin headers configurados
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: { /* ... */ },
  // NO hay configuración de headers de seguridad
};

// middleware.ts — solo añade X-Robots-Tag para /panel y /api/internal
// NO hay headers de seguridad globales
```

**Remediación:**
Añadir headers de seguridad en `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};
```
Para CSP, evaluar el uso de nonces en server components o un CSP estricto basado en allowlists.

**Coste fix:** Bajo (2-4h)

---

### [HIGH-03] IP Spoofing en rate limiting — header `x-forwarded-for` no verificado

**Categoría OWASP 2025:** A01:2025 — Broken Access Control
**Severidad:** Alta
**Explotabilidad:** Moderada
**Archivos afectados:** `src/shared/utils/extract-ip.ts:11-24`, `src/infrastructure/rate-limiting/ip-rate-limit.ts`

**Descripción:** La función `extractIpFromHeaders` extrae la IP del cliente directamente del header `x-forwarded-for` sin verificar si la request proviene de un proxy confiable. Un atacante puede enviar un header `x-forwarded-for: 1.2.3.4` arbitrario para bypasear el rate limiting, ya que cada request con una IP diferente consume un bucket separado.

**Escenario de ataque:**
1. Un atacante quiere bypasear el rate limit de login (5 intentos / 15 min).
2. Envía requests POST a `/api/auth/callback/credentials` con el header `X-Forwarded-For: <random-ip>` diferente en cada request.
3. Cada IP "falsa" tiene su propio bucket de rate limit, permitiendo fuerza bruta ilimitada contra las credenciales de un usuario.
4. Lo mismo aplica para los formularios de contacto y lead.

**Evidencia en código:**
```ts
// src/shared/utils/extract-ip.ts
export function extractIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0];
    return firstIp ? firstIp.trim() : forwarded.trim();
  }
  // ...
}
```

**Remediación:**
En entornos detrás de proxy inverso (Vercel, Cloudflare), configurar el número de proxies confiables y usar el IP real del socket:
```ts
// En Vercel, el IP real está en x-forwarded-for pero la posición correcta
// depende del número de proxies. Con Next.js en Vercel:
export function extractIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map(ip => ip.trim());
    // En Vercel, el último IP es el del cliente (el primero es el proxy)
    // Ajustar según la infraestructura real
    return ips[ips.length - 1] ?? "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}
```
Alternativamente, usar el `request.ip` que Next.js provee en route handlers cuando está detrás de un proxy confiable.

**Coste fix:** Bajo (2h)

---

### [HIGH-04] Endpoint de revalidación de caché acepta tags arbitrarios

**Categoría OWASP 2025:** A06:2025 — Insecure Design
**Severidad:** Alta
**Explotabilidad:** Moderada (requiere sesión autenticada)
**Archivos afectados:** `app/api/internal/revalidate/route.ts:21-51`

**Descripción:** El endpoint POST `/api/internal/revalidate` acepta un array `tags` definido por el cliente y llama a `revalidateTag()` para cada uno. Aunque requiere autenticación, cualquier usuario autenticado (incluyendo roles AGENT) puede invalidar cualquier tag del sistema, causando un cache stampede donde todas las páginas se regeneran simultáneamente.

**Escenario de ataque:**
1. Un usuario con rol AGENT (el menos privilegiado) envía POST a `/api/internal/revalidate` con `tags: ["catalog", "layout:public", "contact:global"]`.
2. Todos los caches de la página pública se invalidan.
3. Los siguientes cientos de requests concurrentes regeneran todas las páginas SSR simultáneamente.
4. Impacto: degradación severa del rendimiento, posible timeout de la base de datos por carga repentina.

**Evidencia en código:**
```ts
// app/api/internal/revalidate/route.ts
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const body = (await request.json().catch(() => null)) as { tags?: string[] } | null;
  const tags = body?.tags ?? ["catalog", "contact:global", "layout:public"];

  for (const tag of tags) {
    revalidateTag(tag); // Acepta CUALQUIER string como tag
  }
}
```

**Remediación:**
Restringir los tags válidos a un allowlist explícito y limitar el acceso a ADMIN/OPERATOR:
```ts
const ALLOWED_REVALIDATE_TAGS = new Set([
  "catalog", "contact:global", "layout:public",
]);

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  // Solo ADMIN y OPERATOR pueden revalidar
  if (auth.ctx.role !== "ADMIN" && auth.ctx.role !== "OPERATOR") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const requestedTags = body?.tags ?? ["catalog", "contact:global", "layout:public"];
  const tags = requestedTags.filter((t: string) => ALLOWED_REVALIDATE_TAGS.has(t));

  for (const tag of tags) {
    revalidateTag(tag);
  }
}
```

**Coste fix:** Muy Bajo (1h)

---

## 4. Hallazgos Medios

### [MED-01] JWT sin invalidación server-side tras desactivación de usuario

**Categoría OWASP 2025:** A07:2025 — Authentication Failures
**Severidad:** Media
**Explotabilidad:** Moderada
**Archivos afectados:** `src/infrastructure/auth/auth.config.ts:107-111`, `src/infrastructure/auth/session.ts`

**Descripción:** La aplicación usa JWT con estrategia `jwt` de NextAuth. Los tokens tienen una vida de 2 horas con renovación deslizante cada hora. Sin embargo, no existe mecanismo para invalidar tokens específicos antes de su expiración natural. Si un ADMIN desactiva un usuario (`isActive = false`), el token JWT del usuario sigue siendo válido hasta que expire (hasta 2 horas), durante las cuales puede seguir accediendo al panel.

**Remediación:** Implementar una lista de tokens revocados en Redis con TTL igual al tiempo de vida restante del token, o reducir el `maxAge` del JWT y verificar `isActive` en cada request (no solo en el login). Alternativamente, usar `updateAge: 0` para forzar verificación en cada request.

**Coste fix:** Medio (4-6h)

---

### [MED-02] Sanitización HTML allowlist permite atributos `style` en todos los tags

**Categoría OWASP 2025:** A05:2025 — Injection
**Severidad:** Media
**Explotabilidad:** Difícil (requiere rol OPERATOR/ADMIN)
**Archivos afectados:** `src/shared/types/content-block-schema.ts:45-81`

**Descripción:** La función `sanitizeHtmlAttrs` permite los atributos `style` y `class` en TODOS los tags HTML (línea 75: `return attrName === "style" || attrName === "class"`). Aunque los tags están restringidos a un allowlist y se bloquean event handlers y URLs peligrosas, un operador con permisos de edición de contenido podría inyectar CSS malicioso via el atributo `style`. Esto incluye `background-image: url(...)` para tracking pixels, `@import` para exfiltración, o técnicas CSS de exfiltración de datos.

**Evidencia en código:**
```ts
// src/shared/types/content-block-schema.ts:74-75
// Tags without explicit allowlist: only keep style and class attributes
return attrName === "style" || attrName === "class";
```

**Remediación:** Eliminar `style` del allowlist general, o implementar un parser CSS que filtre propiedades peligrosas. La opción más segura es eliminar `style` completamente y usar solo clases CSS predefinidas.

**Coste fix:** Bajo (2h)

---

### [MED-03] Ausencia de logs de seguridad estructurados

**Categoría OWASP 2025:** A09:2025 — Security Logging & Alerting Failures
**Severidad:** Media
**Explotabilidad:** N/A (no explotable, pero impide la detección de ataques)
**Archivos afectados:** Global

**Descripción:** No hay evidencia de logs estructurados para eventos de seguridad críticos: login exitoso/fallido, logout, cambio de password, desactivación de usuario, creación/revocación de API keys, acceso a datos sensibles, operaciones de administración. Los logs existentes usan `logger.error` y `logger.warn` para errores técnicos, pero no para eventos de seguridad.

**Remediación:** Implementar un audit logger que registre eventos de seguridad con: timestamp, userId, tenantId, eventType, resource, outcome, ip, userAgent. Enviar a un sistema de agregación (Sentry ya está configurado, pero los eventos de seguridad deberían tratarse como breadcrumbs con contexto enriquecido).

**Coste fix:** Alto (8-16h)

---

### [MED-04] Dependencias con vulnerabilidades conocidas (CVE)

**Categoría OWASP 2025:** A03:2025 — Software Supply Chain Failures
**Severidad:** Media
**Explotabilidad:** Difícil (dependencias de desarrollo en su mayoría)
**Archivos afectados:** `package.json`, `pnpm-lock.yaml`

**Descripción:** `pnpm audit` identifica las siguientes vulnerabilidades:

| Paquete | Versión | CVE/Advisory | Severidad | Ruta |
|---------|---------|--------------|-----------|------|
| minimatch | 10.1.2 | CVE-2026-26996, CVE-2026-27903, CVE-2026-27904 | High | eslint-plugin-sonarjs > minimatch (dev) |
| esbuild | 0.18.20 | GHSA-67mh-4wv8-2f99 | Moderate | drizzle-kit > @esbuild-kit/* > esbuild (dev) |
| postcss | (various) | (review) | — | next > postcss |
| uuid | (various) | (review) | — | next-auth > uuid |

Las vulnerabilidades de minimatch son ReDoS (Denial of Service) en patrones glob controlados por el usuario. Al ser dependencias de desarrollo (eslint-plugin-sonarjs, drizzle-kit), el riesgo en producción es bajo pero no nulo si los patrones glob se construyen con input de usuario en CI/CD.

**Remediación:**
```bash
pnpm update minimatch --recursive
pnpm update eslint-plugin-sonarjs
```

**Coste fix:** Bajo (30min)

---

## 5. Hallazgos Bajos

### [LOW-01] Endpoint `/api/health` expone variable de entorno `APP_ENV`

**Archivos:** `app/api/health/route.ts`
**Descripción:** El endpoint público de health retorna `{ status: "ok", env: APP_ENV }`, revelando si la instancia es local, development o production. Información útil para un atacante que busca identificar el entorno.
**Remediación:** Retornar solo `{ status: "ok" }` o proteger detrás de un header secreto.
**Coste fix:** Muy Bajo (5min)

---

### [LOW-02] Error messages en revalidate exponen detalles internos

**Archivos:** `app/api/internal/revalidate/route.ts:46-49`
**Descripción:** El catch del endpoint revalidate retorna `String(error)` que puede incluir stack traces o mensajes de error internos.
```ts
return NextResponse.json(
  { revalidated: false, error: String(error) },
  { status: 500 },
);
```
**Remediación:** Retornar un mensaje genérico y loguear el error completo internamente.
**Coste fix:** Muy Bajo (5min)

---

### [LOW-03] Consent cookie con `sameSite: "lax"` en lugar de `"strict"`

**Archivos:** `src/features/engagement/server/consent-actions.ts:13-19`
**Descripción:** La cookie de consentimiento usa `sameSite: "lax"`. Aunque es aceptable, `sameSite: "strict"` sería más seguro para una cookie que no necesita ser enviada en navigations cross-origin.
**Remediación:** Cambiar a `sameSite: "strict"` si el flujo de UX lo permite.
**Coste fix:** Muy Bajo (5min)

---

## 6. Checklist OWASP Top 10 2025

| # | Categoría | Estado | Hallazgos |
|---|-----------|--------|-----------|
| A01:2025 | Broken Access Control | ⚠️ | HIGH-03 (IP spoofing en rate limiting). Multi-tenancy bien implementado con RLS + contextos. |
| A02:2025 | Security Misconfiguration | ❌ | HIGH-02 (sin headers de seguridad), LOW-01 (health expone env), LOW-02 (error messages). |
| A03:2025 | Software Supply Chain Failures | ⚠️ | MED-04 (minimatch ReDoS, esbuild CORS). Dependencias de dev principalmente. |
| A04:2025 | Cryptographic Failures | ✅ | Passwords con bcrypt, API keys con bcrypt + hash, secrets en env vars, cookies con flags adecuadas. |
| A05:2025 | Injection | ⚠️ | MED-02 (sanitización HTML permite `style`). SQL injection mitigado por Drizzle ORM parametrizado. |
| A06:2025 | Insecure Design | ❌ | HIGH-01 (server action sin CAPTCHA/rate limit), HIGH-04 (revalidate tags arbitrarios). |
| A07:2025 | Authentication Failures | ⚠️ | MED-01 (JWT sin invalidación). Login con bcrypt + rate limiting + Turnstile. Session con expiración. |
| A08:2025 | Data Integrity Failures | ✅ | API keys verificadas con bcrypt, webhooks no expuestos, validación Zod en todas las entradas. |
| A09:2025 | Security Logging & Alerting Failures | ⚠️ | MED-03 (sin logs de seguridad estructurados). Sentry configurado con sanitización de secrets. |
| A10:2025 | Mishandling of Exceptional Conditions | ✅ | Fail-close en auth (getServerSession retorna null en error), Turnstile fail-close en producción, rate limiting degrade gracefully. |

---

## 7. Superficie de Ataque

### Endpoints públicos (sin autenticación)
| Ruta | Método | Validación | Rate Limiting |
|------|--------|------------|---------------|
| `/api/health` | GET | Ninguna | Ninguno |
| `/api/v1/promociones` | GET | API Key (bcrypt) | Por API key (configurable) |
| `/api/v1/leads/institutional` | POST | API Key (bcrypt) + Zod | Por API key (configurable) |

### Endpoints autenticados (sesión)
| Ruta | Método | Auth | Control de acceso |
|------|--------|------|-------------------|
| `/api/internal/promociones` | GET, POST | requireAuth | Por tenant (RLS) |
| `/api/internal/promociones/[id]` | GET, PATCH, DELETE | requireAuth | AGENT: solo asignadas. ADMIN/OPERATOR: todas. |
| `/api/internal/promociones/[id]/draft` | PATCH, DELETE | requireAuth | AGENT: solo asignadas. |
| `/api/internal/promociones/[id]/history` | GET | requireAuth | AGENT: solo asignadas. |
| `/api/internal/media/upload` | POST | requireAuth | Por tenant (RLS) |
| `/api/internal/content/blocks` | GET, POST | requireAuth + ADMIN/OPERATOR | Por tenant |
| `/api/internal/content/contact` | GET, PUT | requireAuth + ADMIN/OPERATOR | Por tenant |
| `/api/internal/content/history` | GET | requireAuth + ADMIN/OPERATOR | Por tenant |
| `/api/internal/content/revert` | POST | requireAuth + ADMIN/OPERATOR | Por tenant |
| `/api/internal/leads/unread-count` | GET | requireAuth | Por tenant (RLS) |
| `/api/internal/revalidate` | POST | requireAuth | ⚠️ Sin restricción de rol ni tags |
| `/api/internal/docs` | GET | requireAuth | Ninguno (genera OpenAPI) |

### Server actions públicos (sin autenticación)
| Action | Protecciones |
|--------|-------------|
| `submitContactForm` (contact) | Turnstile ✅ + Rate limit IP ✅ + Zod ✅ |
| `createLeadAction` (engagement) | Turnstile ✅ + Rate limit IP ✅ + Zod ✅ |
| `createLeadAction` (leads.actions) | ⚠️ Sin Turnstile ❌ + Sin rate limit ❌ + Zod ✅ |

### Server actions autenticados
| Action | Auth | Control de acceso |
|--------|------|-------------------|
| `saveContentBlock` | getServerSession | ADMIN + OPERATOR |
| `getUsersAction`, `createUserAction`, `updateUserAction`, `deactivateUserAction` | requireAdmin | Solo ADMIN |
| `getApiKeysAction`, `createApiKeyAction`, `revokeApiKeyAction` | requireAdmin | Solo ADMIN |
| `exportLeadAction`, `deleteLeadAction` | getServerSession | Solo ADMIN |
| `getLeadsAction`, `getLeadDetailAction`, `addNoteAction`, `markAsReadAction`, `updateLeadStatusAction` | getServerSession | Por tenant (RLS) |
| `reassignLeadAction` | getServerSession | Solo ADMIN |
| `exportLeadsCsvAction` | getServerSession | Por tenant (RLS) |

### Datos sensibles gestionados
| Tipo | Almacenamiento | Transmisión |
|------|---------------|-------------|
| Passwords | bcrypt hash en `users.password_hash` | Solo en login (POST body) |
| PII (nombre, email, teléfono) | PostgreSQL con RLS por tenant | HTTPS (forzado por plataforma) |
| API keys | bcrypt hash en `api_keys.key_hash` | Header (X-API-Key / Bearer) |
| Session tokens | JWT cookie (httpOnly, secure en prod) | Cookie con SameSite |
| Consent records | PostgreSQL con RLS | Solo lectura interna |
| IP addresses | Texto plano en `consent_records.ip` | Solo escritura (no se expone) |
| RGPD data | `consent_records` (inmutable por diseño) | Solo lectura admin |

---

## 8. Dependencias con Vulnerabilidades

| Paquete | Versión | CVE / Advisory | Severidad | Fix disponible |
|---------|---------|----------------|-----------|----------------|
| minimatch | 10.1.2 | CVE-2026-26996 (ReDoS) | High | >= 10.2.1 |
| minimatch | 10.1.2 | CVE-2026-27903 (ReDoS) | High (CVSS 7.5) | >= 10.2.3 |
| minimatch | 10.1.2 | CVE-2026-27904 | High | >= 10.2.3 |
| esbuild | 0.18.20 | GHSA-67mh-4wv8-2f99 (CORS en dev) | Moderate (CVSS 5.3) | >= 0.25.0 |
| postcss | (various) | Review pending | — | Update recommended |
| uuid | (various) | Review pending | — | Update recommended |

**Nota:** Todas las vulnerabilidades de minimatch son en dependencias de desarrollo (eslint-plugin-sonarjs). El riesgo en producción es bajo pero debe remediarse para proteger el pipeline de CI/CD.

---

## 9. Plan de Remediación

### Inmediato (antes del próximo release)
- [ ] [HIGH-01] Eliminar o proteger `createLeadAction` en `leads.actions.ts` — 1h
- [ ] [HIGH-04] Restringir tags y rol en `/api/internal/revalidate` — 1h
- [ ] [HIGH-02] Añadir headers de seguridad HTTP en `next.config.ts` — 2h

### Corto plazo (próximas 2 semanas)
- [ ] [HIGH-03] Corregir IP extraction para prevenir spoofing — 2h
- [ ] [MED-01] Implementar invalidación de JWT tras desactivación de usuario — 4h
- [ ] [MED-02] Eliminar atributo `style` del allowlist HTML — 2h
- [ ] [MED-04] Actualizar dependencias con CVEs — 30min

### Medio plazo (próximo mes)
- [ ] [MED-03] Implementar audit logging para eventos de seguridad — 8-16h
- [ ] [LOW-01] Ocultar `APP_ENV` del health endpoint — 5min
- [ ] [LOW-02] Sanitizar error messages en revalidate — 5min

### Monitorizar / Aceptar
- [LOW-03] Consent cookie `sameSite: lax` — aceptable, mejorar si UX lo permite
- Dependencias `postcss` y `uuid` — monitorizar advisories futuros

---

## 10. Configuraciones de Seguridad Recomendadas

### Headers de seguridad (next.config.ts)
```ts
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    },
  ];
},
```

### Content-Security-Policy (evaluar)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.domio.com https://images.unsplash.com; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com https://*.sentry.io; frame-ancestors 'none';
```

### Cookies de sesión (ya configuradas correctamente)
- `httpOnly: true` ✅
- `secure: true` en producción ✅
- `sameSite: "lax"` ✅
- `maxAge: 7200` (2 horas) ✅

### Rate limiting (ya implementado)
- Login: 5 intentos / 15 min + lockout 15 min ✅
- Contacto: 3 envíos / 10 min + lockout 15 min ✅
- API keys: configurable por key (default 60/min) ✅

### Multi-tenancy (bien implementado)
- RLS en todas las tablas de dominio ✅
- `SET LOCAL` (transaction-scoped) para `app.current_tenant_id` ✅
- Contextos tipados: `PublicContext`, `AuthenticatedContext`, `ApiKeyContext` ✅
- Políticas de aislamiento por tenant en todas las tablas ✅
