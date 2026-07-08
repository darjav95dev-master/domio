# Research: detalle-inmueble-engagement

## Decisiones de diseño

### 1. Server Action para crear lead

**Decisión**: Server Action `createLeadAction` en `src/features/engagement/server/create-lead-action.ts` que valida con Zod, crea lead + consentimiento en transacción, encola emails.

**Rationale**: Server Actions son el patrón idiomático en Next.js App Router para mutaciones desde componentes de cliente. La transacción atómica garantiza consistencia.

**Alternativas consideradas**: API route POST (más overhead, requiere fetch desde cliente), form action nativo (menos control de errores).

### 2. Consentimiento en sesión para WhatsApp

**Decisión**: Tras enviar formulario con consentimiento, guardar flag en sesión (cookie o estado de servidor). El botón WhatsApp verifica este flag para decidir si genera lead.

**Rationale**: Evita pedir consentimiento dos veces. El flag es efímero (sesión). Si el usuario recarga, pierde el flag (aceptable: puede volver a dar consentimiento).

**Alternativas consideradas**: localStorage (no funciona en SSR), cookie httpOnly (complejidad innecesaria para un flag de UX).

### 3. Inmuebles relacionados con PostGIS

**Decisión**: Consulta espacial con `ST_DWithin` sobre `promociones.location` con radio configurable (default: 5km), filtrando por mismo tipo y precio ±20%. Límite 4 resultados.

**Rationale**: PostGIS con índice GIST es eficiente para consultas espaciales. La regla es determinista y simple.

**Alternativas consideradas**: Filtrado por municipio (menos preciso), sin límite (podría mostrar demasiados), ML (overkill para MVP).

### 4. Rate limiting por IP

**Decisión**: Usar el rate limiter de F008 (Upstash Redis/Vercel KV) con límite de 5 envíos por IP por hora en el formulario.

**Rationale**: Previene spam y abuso. 5/hora es generoso para uso legítimo, restrictivo para bots.

### 5. ShareButton con Web Share API + fallback

**Decisión**: Intentar Web Share API nativa, fallback a copiar URL al portapapeles con `navigator.clipboard.writeText`.

**Rationale**: Web Share API es la experiencia nativa en móvil. Fallback asegura compatibilidad en desktop.
