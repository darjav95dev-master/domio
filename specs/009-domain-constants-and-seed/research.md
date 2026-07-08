# Research: Domain Constants & Seed

**Feature**: 009 | **Date**: 2026-07-08

## Research Tasks

### R-1: Estado actual de las constantes en el codebase

**Pregunta**: ¿Qué constantes de dominio ya existen y qué falta?

**Hallazgos**:
- `src/shared/constants/db-enums.ts` ya contiene todos los enums de BD como arrays `as const`: `USER_ROLES`, `PROMOCION_KINDS`, `PROMOTION_STATUSES`, `OPERATION_TYPES`, `PROPERTY_TYPES`, `CONSTRUCTION_STATUSES`, `MAP_PRIVACY_MODES`, `UNIT_STATUSES`, `LEAD_STATUSES`, `LEAD_SOURCES`, `LEAD_CHANNELS`, `MEDIA_ASSET_KINDS`, `MEDIA_ASSET_OWNER_TYPES`, `CONTENT_BLOCK_TYPES`, `ENERGY_CERTS`, `ARSOP_REQUEST_TYPES`, `EMAIL_STATUSES`, `AMENITIES`.
- `src/infrastructure/db/schema/enums.ts` ya importa estos arrays y los usa para crear `pgEnum` de Drizzle.
- **Faltan**: labels de presentación (mapas valor → etiqueta), constantes de configuración (límites, tamaños), schemas Zod de dominio, y el script de seed.

**Decisión**: No duplicar los enums existentes. Añadir labels y config en archivos nuevos que importan de `db-enums.ts`.

### R-2: Formato de labels de presentación

**Pregunta**: ¿Cómo estructurar los mapas de labels?

**Alternativas evaluadas**:
1. **Objeto `Record<EnumValue, string>` por cada enum**: Simple, tipado, exhaustivo. Si falta un valor, TypeScript error en tiempo de compilación.
2. **Array de objetos `{ value, label }`**: Más verboso, útil para selects pero menos directo para acceso por key.
3. **Función `getLabel(enum, value)`**: Centralizada pero añade indirección innecesaria.

**Decisión**: Opción 1 — `Record<EnumValue, string>` exportado como `PROPERTY_TYPE_LABELS`, `CONSTRUCTION_STATUS_LABELS`, etc. Si se necesita para selects (array de `{ value, label }`), se deriva con `Object.entries()`.

**Rationale**: Tipado fuerte, acceso O(1), exhaustividad verificable en compile time.

### R-3: Estrategia de seed idempotente

**Pregunta**: ¿Cómo hacer el seed idempotente sin duplicar datos?

**Alternativas evaluadas**:
1. **Borrar todo y re-insertar**: Simple pero destructivo. Problemático si hay datos de desarrollo valiosos.
2. **INSERT ... ON CONFLICT DO NOTHING**: Elegante, usa constraints únicos (slug, email). No duplica.
3. **Verificar existencia antes de insertar (SELECT + conditional INSERT)**: Más verboso pero explícito.
4. **TRUNCATE + INSERT en transacción**: Limpio pero pierde datos de desarrollo.

**Decisión**: Opción 2 — `ON CONFLICT DO NOTHING` usando los constraints únicos existentes (`tenants.slug`, `users.tenantId+email`, `promociones.tenantId+slug`). Para tablas sin constraint único relevante (leads, unidades), usar un marker en el campo `name` o `identifier` para detectar datos del seed.

**Rationale**: Aprovecha la integridad referencial existente. No es destructivo. Simple de implementar con Drizzle.

### R-4: Hash de contraseñas en el seed

**Pregunta**: ¿Cómo hashear las contraseñas de los usuarios demo?

**Hallazgos**:
- El proyecto usa Auth.js v5 con credentials provider (F005). La verificación usa bcrypt.
- `bcrypt` no está en `package.json` como dependencia directa, pero Auth.js v5 lo incluye como dependencia transitiva.
- Alternativa: usar `bcryptjs` (pure JS, sin dependencias nativas) para evitar problemas de compilación en el script de seed.

**Decisión**: Usar `bcryptjs` (añadir como devDependency) para el seed. Es compatible con los hashes de bcrypt y no requiere compilación nativa.

**Rationale**: El script de seed se ejecuta con `tsx` fuera del contexto de Next.js. `bcryptjs` es drop-in compatible y evita problemas de node-gyp.

### R-5: Coordenadas demo para promociones

**Pregunta**: ¿Qué coordenadas usar para las promociones demo?

**Decisión**: Usar coordenadas reales de puntos de interés en municipios de Tenerife:
- Santa Cruz de Tenerife: `[28.4682, -16.2546]`
- San Cristóbal de La Laguna: `[28.4872, -16.3155]`
- Adeje: `[28.1246, -16.7240]`
- Arona: `[28.0986, -16.7162]`

Para `location_approx` (modo AREA): desplazar ligeramente las coordenadas reales (~0.005 grados) para que no coincidan con la ubicación exacta.

**Rationale**: Coordenadas realistas que caen dentro de los municipios declarados. El desplazamiento para `location_approx` simula el comportamiento del modo de privacidad AREA.

### R-6: Estructura de payloads de bloques editoriales en el seed

**Pregunta**: ¿Qué estructura JSON deben tener los payloads de los bloques editoriales demo?

**Hallazgos**: La tabla `promocion_content_blocks` tiene `payload JSONB`. La feature F012 definirá los schemas Zod específicos por `block_type`. Para el seed, necesitamos payloads que sean razonables pero que no dependan de schemas que aún no existen.

**Decisión**: Usar payloads simples y coherentes:
- `DESCRIPCION_GENERAL`: `{ text: "Párrafo de descripción..." }`
- `MEMORIA_CALIDADES`: `{ items: [{ title: "Calidad 1", description: "Descripción", icon: "icon-name" }] }`
- `ZONAS_COMUNES`: `{ items: [{ name: "Piscina", description: "..." }] }` (solo portfolio)
- `UBICACION_SERVICIOS`: `{ items: [{ service: "Colegio", distance: "500m" }] }`
- `PLAZOS_GARANTIAS`: `{ delivery: "Q4 2026", license: "Licencia municipal", guarantee: "10 años estructura" }` (solo portfolio)

**Rationale**: Payloads realistas que F012 podrá validar contra sus schemas. Si los schemas cambian, el seed se ajusta en F012.
