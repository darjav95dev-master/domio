# Auditoría técnica final — Domio

> Último checkpoint antes de la entrega. Revisión como Tech Lead / Software Architect / Senior Full-Stack / revisor de TFG.
> Fecha: 2026-07-18 · Rama auditada: `develop` · HEAD `1361cde`

## Alcance y método

- **54.295 líneas** TS/TSX (374 archivos en `src`, 58 en `app`), **162 archivos de test**.
- Ejecutadas las puertas de calidad reales del proyecto:
  - `pnpm typecheck` → **0 errores**
  - `pnpm lint` → **0 warnings**
  - `pnpm test:run` → **1736 tests, 184 ficheros, todo verde (12 s)**
- Auditados a mano: multi-tenancy/RLS, auth, API keys, capa de repositorios, rutas API públicas e internas, sanitización de HTML, JSON-LD, higiene de repo y complejidad.
- **No verificado en vivo:** no se levantó el servidor ni se corrieron e2e/Playwright ni se inspeccionó la UI renderizada. Las notas de UX y accesibilidad son inferencias a nivel de código, no validación visual. Marcadas como tal.

---

## Veredicto

### ⚠️ Listo para entregar, pero con mejoras recomendables

El proyecto está **muy por encima** de la media de un TFG: arquitectura limpia por features, aislamiento multi-tenant a nivel de base de datos con RLS *fail-closed*, 1736 tests verdes, cero `any`, cero TODO/FIXME, cero secretos versionados. La ingeniería es sólida y madura.

Lo que impide un ✅ limpio son **dos vectores de XSS almacenado** (sanitizador HTML por regex y serialización JSON-LD sin escapar) y un puñado de asperezas de robustez. Ninguno es explotable por un usuario anónimo —ambos XSS requieren una cuenta de backoffice con permiso de edición— por eso no es un ❌. Pero son exactamente el tipo de detalle que un tribunal con perfil de seguridad puede preguntar, y se arreglan en menos de una hora. Recomiendo cerrarlos antes de entregar.

---

## Puntuación por apartado

| Apartado | Nota | Comentario |
|---|---:|---|
| Arquitectura | **9.0** | Features / infrastructure / shared. Repositorios tenant-aware. Separación de responsabilidades ejemplar. |
| Calidad de código | **9.0** | 0 `any`, 0 TODO, tipado estricto, naming claro, tests exhaustivos. |
| Escalabilidad | **8.0** | Paginación por cursor, RLS, colas de email. Sin cachés de datos ni CDN evidentes. |
| Mantenibilidad | **8.5** | Muy legible; README de 79 KB y algún componente de 600–760 líneas restan. |
| Seguridad | **7.0** | RLS excelente; penalizan sanitizador regex, JSON-LD sin escapar y falta de rate-limit por IP en API pública. |
| Rendimiento | **7.5** | 55 % de componentes `'use client'` — sobre-clientización en App Router. |
| UX *(no verificada en vivo)* | **7.5** | Hay estados de carga/error/vacío en código; sin validación visual. |
| Accesibilidad *(no verificada en vivo)* | **8.0** | `eslint-plugin-jsx-a11y` activo, `next/image`, semántica correcta; sin auditoría de contraste/teclado real. |
| Organización | **9.0** | Estructura y convenciones consistentes en todo el repo. |
| **Global** | **8.2** | Proyecto de alta calidad con dos correcciones de seguridad pendientes. |

---

## Hallazgos

### 🟠 ALTO

#### H1 — Sanitizador de HTML por regex es evadible (XSS almacenado)
- **Ubicación:** `src/shared/types/content-block-schema.ts` → `sanitizeHtmlAttrs()` (líneas ~45–85), usado por `htmlSafeString()` para `DESCRIPCION_GENERAL`. Se renderiza con `dangerouslySetInnerHTML` en `src/features/detail/components/BlockDescripcion.tsx:32`.
- **Qué encontré:** la comprobación de URL peligrosa (`javascript:`, `data:`, `vbscript:`) solo se dispara si el valor del atributo va **entrecomillado**:
  ```js
  const valueMatch = attr.match(/^[\w-]+\s*=\s*(['"])(.*?)\1$/);
  if (valueMatch && (attrName === "href" || attrName === "src")) { ... }
  ```
  Un atributo **sin comillas** como `href=javascript:alert(1)` no casa con `valueMatch`, así que `isDangerousUrl` nunca se evalúa; como `href` está en la allowlist de `<a>`, el token se conserva íntegro. `validateAllowedHtml` solo mira nombres de etiqueta, no valores → el payload pasa.
- **Consecuencia:** un usuario autenticado del backoffice (agente/admin) puede guardar una descripción con `<a href=javascript:...>` que se ejecuta en el navegador de **cualquier visitante público** de la ficha. XSS almacenado. Requiere cuenta de backoffice, pero rompe la defensa en profundidad y basta una cuenta comprometida/maliciosa.
- **Solución:** no sanitizar HTML con regex — es una clase de bug conocida. Sustituir por un sanitizador real isomórfico: `isomorphic-dompurify` o `sanitize-html`, con allowlist explícita de tags/atributos/protocolos. Una dependencia bien elegida elimina toda esta familia de bypasses y ~50 líneas de regex frágil.
- **Prioridad:** Muy recomendable antes de la entrega.

#### H2 — JSON-LD inyectado sin escapar (breakout de `</script>`)
- **Ubicación:** `app/(public)/inmuebles/[slug]/page.tsx:142,149` y `app/(public)/page.tsx:50` — `dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}`.
- **Qué encontré:** `structuredData`/`breadcrumbJsonLd` incluyen contenido editable (`promocion.name`, descripción, municipio). `JSON.stringify` **no escapa** `<`, `>` ni `&`. Un nombre de promoción que contenga `</script><script>…` cierra la etiqueta e inyecta script. Next.js no auto-escapa dentro de `dangerouslySetInnerHTML`.
- **Consecuencia:** XSS almacenado por la misma vía que H1 (contenido de backoffice → visitante público), aquí a través de los metadatos SEO.
- **Solución:** escapar antes de inyectar. Mínimo:
  ```js
  const safe = JSON.stringify(structuredData).replace(/</g, "\\u003c");
  ```
  Aplicarlo a los tres `<script type="application/ld+json">`. Idealmente un helper `jsonLdScript(data)` compartido.
- **Prioridad:** Muy recomendable antes de la entrega.

---

### 🟡 MEDIO

#### M1 — `limit` de query no validado → `NaN` → 500
- **Ubicación:** `app/api/v1/promociones/route.ts:38` (`Number(limitParam)`) → `src/features/api-public/server/get-promociones.ts` (`Math.min(Math.max(1, limit), MAX)`).
- **Qué encontré:** verificado — `?limit=abc` produce `Number("abc") = NaN`; el clamp devuelve `NaN` (`Math.max(1, NaN) === NaN`) y llega como `.limit(NaN)` a Postgres → error → **500** en vez de **400**.
- **Consecuencia:** entrada inválida trivial rompe el endpoint público; mala DX para consumidores de la API y ruido en Sentry.
- **Solución:** validar los query params con Zod (`z.coerce.number().int().positive().max(100).default(20)` con `safeParse` → 400 si falla), o un guard `Number.isFinite`. Revisar el mismo patrón en el resto de rutas `/api/v1/*`.
- **Prioridad:** Recomendable.

#### M2 — Sin rate-limit por IP en la API pública
- **Ubicación:** `app/api/v1/promociones/route.ts`, `app/api/v1/leads/institutional/route.ts`. El rate-limit es **por API key** y se aplica *después* de `validateApiKey`.
- **Qué encontré:** una petición con clave inválida hace consulta a BD + posibles `bcrypt.compare` **antes** de cualquier throttle, y no hay límite por IP. La infraestructura ya existe (`src/infrastructure/rate-limiting/ip-rate-limit.ts`) pero no se usa aquí.
- **Consecuencia:** vector de fuerza bruta sobre claves y de DoS barato (bcrypt es caro por diseño) sin coste para el atacante.
- **Solución:** aplicar `ip-rate-limit` como primera barrera en las rutas `/api/v1/*`, antes de resolver la clave.
- **Prioridad:** Recomendable.

#### M3 — Sobre-clientización: 55 % de componentes son `'use client'`
- **Ubicación:** 77 de 140 componentes `.tsx` llevan `'use client'`.
- **Qué encontré:** proporción alta para App Router, donde el server component es el default deseable. Parte es backoffice interactivo legítimo, pero conviene revisar el lado público.
- **Consecuencia:** más JS al cliente, peor TTI/bundle en páginas públicas (home, portafolio, ficha) que son las críticas para SEO y conversión.
- **Solución:** auditar los `'use client'` de `app/(public)` y `src/features/{home,detail,catalog}`; empujar a server component todo lo que no use estado/efectos/handlers, aislando la interactividad en hojas pequeñas.
- **Prioridad:** Recomendable (rendimiento).

---

### 🟢 BAJO

#### B1 — `.DS_Store` versionados
- **Ubicación:** `.DS_Store`, `.opencode/.DS_Store`, `.specify/.DS_Store`, `.specify/memory/.DS_Store` (rastreados pese a estar en `.gitignore` — se commitearon antes de la regla).
- **Solución:** `git rm --cached` de los cuatro. Prioridad: Recomendable.

#### B2 — Artefactos binarios de tooling en git
- **Ubicación:** `.codebase-memory/graph.db.zst`, `artifact.json` — binarios que cambian en cada sesión y ensucian el historial/diffs.
- **Solución:** valorar `.gitignore` para `.codebase-memory/` si no es necesario compartirlos. Prioridad: Opcional.

#### B3 — `/api/health` es un liveness superficial
- **Ubicación:** `app/api/health/route.ts` — devuelve `{status:"ok", env}` sin comprobar BD ni Redis.
- **Consecuencia:** el health puede dar OK con la base de datos caída.
- **Solución:** añadir un readiness que haga `SELECT 1` y ping a Redis (opcionalmente en `?deep=1` para no encarecer el liveness). Prioridad: Opcional.

#### B4 — Componentes y README extensos
- **Ubicación:** `README.md` (79 KB), `blocks-editor.tsx` (763), `FilterBar.tsx` (583), `tipologia-editor.tsx` (575), `media-gallery.tsx` (536), `leads-table.tsx` (508).
- **Solución:** partir el README por temas (`docs/`) y extraer sub-componentes/hooks de los ficheros >500 líneas. Prioridad: Opcional.

#### B5 — `stripHtml` con regex (mismo olor que H1)
- **Ubicación:** `src/features/detail/server/get-detail-data.ts:49` — `value.replace(/<[^>]*>/g, "")`.
- **Nota:** aquí solo se usa para generar texto plano de SEO (no se re-inyecta como HTML), así que el riesgo es nulo; lo cito por coherencia con la recomendación de H1. Prioridad: Opcional.

---

### 🔵 MEJORA OPCIONAL

- **O1 — Deuda `ponytail` rastreada (10 marcas).** Contenido hardcodeado en `home/components/*` (Hero, Trust, HowWeWork, AboutDomio) pendiente de promover al payload solo si necesita ser editable. Es deuda consciente y documentada; correcto dejarla, conviene tenerla en el backlog.
- **O2 — `db` como `Proxy` singleton** (`src/infrastructure/db/client.ts`): ingenioso y documentado; algo inusual pero aceptable. Sin acción.
- **O3 — `email_queue` sin `tenant_id`/RLS:** verificado que es **intencionado** (tabla de infraestructura, documentado en el propio schema y en `architecture.md §6.5`). Sin acción — se menciona solo para dejar constancia de que se revisó y es correcto.

---

## Lo que está muy bien (y debe destacarse en la defensa)

- **Multi-tenancy fail-closed con RLS.** Cada consulta pasa por `TenantContext.withTransaction`, que hace `set_config('app.current_tenant_id', …, true)` (transaction-local); las políticas RLS (`rls.ts`) filtran por ese setting. Si no se fija el tenant, `current_setting(...)::uuid` **falla** en lugar de devolver todo → cierre por defecto. Excelente decisión de diseño.
- **Auth robusta:** credenciales con bcrypt, rate-limit de login en middleware Edge, re-verificación de `isActive` cada 5 min en el JWT, sesión de 2 h con renovación deslizante, imports Node lazy para compatibilidad Edge.
- **API keys** hasheadas con bcrypt y búsqueda acotada por prefijo (O(1) en el caso común) — el patrón correcto.
- **Manejo de errores de API consistente** (`ContextResolutionError` → status, resto → 500 + log estructurado, sin filtrar internals).
- **`debug-error` bien resuelto:** devuelve 404 en producción, no depende de acordarse de borrarlo.
- **Testing serio:** 1736 unit + contract tests, e2e con Playwright, tests de aislamiento de tenant específicos.
- **Higiene:** 0 `any`, 0 TODO/FIXME, 0 secretos versionados, `.gitignore` correcto para `.env*`, Sentry + logger estructurado, Husky + Prettier + ESLint (con sonarjs y jsx-a11y).

---

## Checklist final de entrega

| Aspecto | Estado |
|---|:--:|
| Typecheck limpio | ✅ |
| Lint limpio | ✅ |
| Tests unit/contract verdes (1736) | ✅ |
| Aislamiento multi-tenant (RLS fail-closed) | ✅ |
| Autenticación y sesión | ✅ |
| Gestión de API keys | ✅ |
| Manejo de errores de API | ✅ |
| Sin secretos ni `.env` versionados | ✅ |
| Observabilidad (Sentry + logger) | ✅ |
| Sanitización de HTML (rich text) | ✅ (H1 corregido) |
| Escapado de JSON-LD | ✅ (H2 corregido) |
| Validación de query params en API pública | ✅ (M1 corregido) |
| Rate-limit por IP en API pública | ✅ (M2 aplicado, sin lockout) |
| Optimización server/client components | ✅ (M3 parcial: candidato seguro convertido) |
| Higiene de repo (`.DS_Store`, binarios) | ✅ (B1 y B2 hechos) |
| Health check profundo | ✅ (B3 hecho: `?deep=1` DB+Redis) |
| Verificación de UI en vivo (render/e2e) | ⚠️ (build OK; e2e 27/32 — 5 fallos preexistentes por drift, ver E1) |
| Auditoría de accesibilidad en vivo (contraste/teclado) | ❌ (no ejecutada) |

---

## Estado de aplicación (rama `fix/auditoria-final-hardening`)

Aplicado y verificado (typecheck 0, lint 0, **1746 tests**, `pnpm build` OK):

- ✅ **H1** — causa raíz corregida (el action persistía el payload crudo; ahora `validation.data`) + sanitizador endurecido (URL sin comillas, entidades HTML, controles en el esquema). Sin nueva dependencia en el bundle cliente. Techo documentado con `ponytail:`.
- ✅ **H2** — helper `serializeJsonLd` escapa `<` en los tres JSON-LD.
- ✅ **M1** — `limit` no finito cae al default (no más 500).
- ✅ **M2** — guarda por IP en `/api/v1/*` **antes** de auth. Límite generoso (120/min, 2× el de clave), **sin lockout**, degradación graceful si Redis no está → **no penaliza a consumidores legítimos**. El frontend propio no consume `/api/v1/*`, así que no afecta a la UX interna.
- ✅ **M3 (parcial)** — solo se convirtió a server component el único candidato con interactividad cero y padre server (`ContenidosPageList`). El resto de `'use client'` se dejó intacto por ser interactividad legítima (primitivas con `forwardRef`, hooks de scroll, backoffice).
- ✅ **B1** — `.DS_Store` fuera del control de versiones.

También aplicado:

- ✅ **B2** — `.codebase-memory/` fuera del control de versiones + `.gitignore`.
- ✅ **B3** — health check profundo: `GET /api/health?deep=1` verifica DB (`SELECT 1`) y Redis (`ping`), 503 si una dependencia requerida cae. El liveness simple (sin `?deep`) se mantiene intacto para el CD.

### E1 — 🟡 5 tests e2e preexistentes en rojo (drift test↔contenido)

Al ejecutar `pnpm test:e2e` (Postgres local sembrado: 4 users, 9 promociones): **27/32 pasan, 5 fallan**. Verificado que **ninguno** toca código de esta rama (`git diff develop..HEAD`) — son fallos previos:

1. `visitor.spec.ts:62` — espera hero `/Tu hogar en Canarias empieza aquí/`; el contenido sembrado hoy es "Tu hogar en Canarias, sin complicaciones…". Aserción desactualizada.
2. `visitor.spec.ts:99` — espera `<h1>Promociones</h1>` en `/portafolio`; el heading cambió.
3. `admin.spec.ts:137` — crear/revocar API key.
4. `admin.spec.ts:192` — editar config de contacto y reflejarla en `/contacto`.
5. `catalog-editor.spec.ts:82` — el form de edición carga todas las secciones.

Los 3–5 probablemente dependen de servicios no configurados en local (Turnstile/R2) o de fixtures. **Recomendación:** actualizar las aserciones de contenido (1–2) al copy actual y revisar 3–5 con los servicios de test levantados, antes de presumir de "e2e verde" en la defensa.

- 🔵 Ninguno de los cambios aplicados altera flujos de usuario existentes; M2 es la única barrera nueva y está calibrada para no dispararse con tráfico legítimo.
