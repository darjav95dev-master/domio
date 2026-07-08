# Research: global-content-editor

**Date**: 2026-07-08 | **Feature**: 017-global-content-editor

## Research Tasks

### 1. Schema Zod por block_key — ¿Qué schemas existen ya?

**Context**: La feature requiere validar payloads JSONB con schemas Zod específicos por tipo de bloque. Necesitamos saber si ya existen schemas definidos en F012 (editorial-blocks-editor) que puedan reutilizarse o adaptarse.

**Investigación**:
- F012 implementó bloques editoriales para promociones individuales (promocion_content_blocks) con 5 block_types: DESCRIPCION_GENERAL, MEMORIA_CALIDADES, ZONAS_COMUNES, UBICACION_SERVICIOS, PLAZOS_GARANTIAS.
- Los contenidos globales (content_blocks) son diferentes: son bloques de páginas globales (home, sobre, equipo, legales), no de promociones.
- No hay schemas Zod predefinidos para content_blocks en features anteriores.

**Decisión**: Crear schemas Zod específicos para content_blocks en `src/features/contenidos/server/schemas/content-block.schema.ts`. Los schemas serán diferentes a los de F012 porque los bloques globales tienen estructuras distintas (hero, textos editoriales, miembros de equipo, textos legales).

**Alternativas consideradas**:
- Reutilizar schemas de F012 → Rechazada porque los bloques globales tienen propósitos y estructuras diferentes.
- Usar un schema genérico `Record<string, unknown>` → Rechazada porque viola la regla de validación estricta con Zod.

---

### 2. Revalidación ISR — ¿Qué tags usar?

**Context**: Tras guardar cambios en bloques de contenido o configuración de contacto, debemos disparar revalidación ISR de las páginas públicas afectadas.

**Investigación**:
- Next.js App Router permite `revalidateTag(tag)` para invalidar caché ISR.
- Las páginas públicas que consumen contenido global son: home (`/`), sobre (`/sobre`), contacto (`/contacto`), y páginas legales (aviso-legal, privacidad, cookies — si existen como rutas públicas).
- El footer consume `contact_config` y aparece en todas las páginas públicas.

**Decisión**: Usar tags específicos por página:
- `revalidateTag('content:home')` tras editar bloques de home
- `revalidateTag('content:about')` tras editar bloques de sobre
- `revalidateTag('content:team')` tras editar bloques de equipo
- `revalidateTag('content:legal')` tras editar bloques de legales (aviso-legal, privacidad, cookies)
- `revalidateTag('contact:global')` tras editar configuración de contacto
- `revalidateTag('layout:public')` tras editar configuración de contacto (para invalidar el footer en todas las páginas)

**Alternativas consideradas**:
- `revalidatePath('/')` → Rechazada porque es menos granular y puede invalidar más de lo necesario.
- Un solo tag `content:global` para todo → Rechazada porque invalidaría todas las páginas incluso si solo cambió una.

---

### 3. Estructura de payloads JSONB — ¿Qué campos tiene cada block_key?

**Context**: Necesitamos definir la estructura de los payloads JSONB para cada tipo de bloque global. Esto determina los formularios de edición y los schemas Zod.

**Investigación**:
- El roadmap menciona bloques para: home (hero claim, destacados), sobre (cuerpo editorial), equipo (miembros), legales (textos de aviso-legal, privacidad, cookies).
- F019 (home-publica) consumirá estos bloques y espera estructuras específicas (hero con claim + destacados, cómo-trabajamos grid, sobre con texto + imagen, etc.).
- No hay definición exhaustiva de block_keys en features anteriores.

**Decisión**: Definir un conjunto inicial de block_keys por página, extensible en el futuro:

**home**:
- `hero`: `{ claim: string, lead: string, ctaPrimary: string, ctaSecondary: string, backgroundImageId: string | null }`
- `como-trabajamos`: `{ items: Array<{ titulo: string, descripcion: string, icono: string }> }`
- `sobre`: `{ texto: string, imagenId: string | null }`
- `portafolio-destacado`: `{ titulo: string, descripcion: string }` (las propiedades vienen del catálogo)
- `confianza`: `{ metricas: Array<{ valor: string, etiqueta: string }>, testimonios: Array<{ texto: string, autor: string }> }`
- `cta-final`: `{ titulo: string, texto: string, botonTexto: string }`
- `faq`: `{ items: Array<{ pregunta: string, respuesta: string }> }`

**sobre**:
- `hero`: `{ titulo: string, lead: string }`
- `cuerpo`: `{ parrafos: string[] }`

**equipo**:
- `hero`: `{ titulo: string, lead: string }`
- `miembros`: `{ items: Array<{ nombre: string, rol: string, bio: string, avatarId: string | null }> }`

**aviso-legal**, **privacidad**, **cookies**:
- `contenido`: `{ titulo: string, secciones: Array<{ titulo: string, contenido: string }> }`

**Alternativas consideradas**:
- Usar un solo block_key `contenido` con estructura genérica → Rechazada porque pierde la semántica específica de cada bloque y dificulta la validación.
- Definir más block_keys de los necesarios → Rechazada porque viola YAGNI; podemos extender en el futuro si F019/F023 lo requieren.

---

### 4. Historial versionado — ¿Cómo implementar el revert?

**Context**: El revert debe crear una nueva entrada en `content_history` con el payload de la versión seleccionada, y actualizar `content_blocks` o `contact_config` con ese payload.

**Investigación**:
- `content_history` es inmutable (RLS impide UPDATE/DELETE).
- Cada entrada en `content_history` tiene `content_type` ('block' o 'contact'), `content_key` (page_key+block_key para bloques, 'global' para contacto), y `payload_snapshot`.
- El revert no modifica entradas históricas; crea una nueva entrada y actualiza el contenido actual.

**Decisión**: El flujo de revert es:
1. Usuario selecciona una versión histórica (id de `content_history`).
2. Server action `revertContent(versionId)`:
   a. Lee la versión histórica de `content_history` (validando `tenant_id`).
   b. Si `content_type === 'block'`:
      - Actualiza `content_blocks` con el `payload_snapshot` de la versión.
      - Crea nueva entrada en `content_history` con `content_type='block'`, `content_key=page_key:block_key`, `payload_snapshot=payload_actualizado`.
   c. Si `content_type === 'contact'`:
      - Actualiza `contact_config` con el `payload_snapshot` de la versión.
      - Crea nueva entrada en `content_history` con `content_type='contact'`, `content_key='global'`, `payload_snapshot=payload_actualizado`.
   d. Dispara `revalidateTag` correspondiente.
3. Toast de confirmación.

**Alternativas consideradas**:
- Modificar directamente la entrada histórica → Imposible por RLS.
- No crear nueva entrada en el historial tras revert → Rechazada porque perderíamos trazabilidad del revert.

---

### 5. Control de acceso — ¿Cómo verificar rol ADMIN u OPERATOR?

**Context**: Solo ADMIN y OPERATOR pueden acceder a `/panel/contenidos`. AGENT debe ser redirigido.

**Investigación**:
- F010 (backoffice-shell) ya implementó el sidebar condicional por rol.
- F016 (team-and-api-keys) implementó verificación de rol en server actions y API routes.
- El patrón es: `getServerSession()` → verificar `session.user.role` → denegar si no es ADMIN u OPERATOR.

**Decisión**: Seguir el patrón establecido en F016:
- En Server Components (`page.tsx`): `getServerSession()` + verificación de rol + `redirect('/panel')` si no tiene permiso.
- En server actions: `getServerSession()` + verificación de rol + `throw new Error('Acceso denegado')` si no tiene permiso.
- En API routes: `getServerSession()` + verificación de rol + `return NextResponse.json({ error: 'Forbidden' }, { status: 403 })` si no tiene permiso.

**Alternativas consideradas**:
- Middleware global para `/panel/contenidos/*` → Rechazada porque el middleware ya existe y es más complejo añadir reglas específicas; preferir verificación en cada componente/acción.

---

## Summary of Decisions

| Tema | Decisión | Rationale |
|------|----------|-----------|
| Schemas Zod | Crear schemas específicos en `src/features/contenidos/server/schemas/` | Bloques globales son diferentes a bloques de promociones (F012) |
| Tags ISR | Tags granulares por página + tag global para contacto | Revalidación precisa sin invalidar más de lo necesario |
| Payloads JSONB | Conjunto inicial de block_keys por página, extensible | Balance entre especificidad y YAGNI |
| Revert | Crear nueva entrada en historial + actualizar contenido actual | Preserva trazabilidad y respeta inmutabilidad de content_history |
| Control de acceso | Verificación de rol en Server Components, server actions y API routes | Patrón establecido en F016, consistente con el resto del sistema |
