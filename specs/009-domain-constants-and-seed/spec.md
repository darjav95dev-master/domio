# Feature 009 · Domain Constants & Seed

> **Spec status:** Draft
> **Feature number:** 009
> **Size:** S (1–2 días)
> **Dependencies:** F002 (db-schema-and-migrations)
> **Author:** orchestrator + feature-briefer
> **Date:** 2026-07-08

---

## Resumen

Centralizar todos los conjuntos cerrados del dominio inmobiliario de Domio como constantes TypeScript con tipos derivados, definir schemas Zod de dominio que referencian esos sets, y crear un script de seed que pueble la base de datos de desarrollo con datos demo verificables (tenant, usuarios, promociones, tipologías, unidades, bloques editoriales, leads y configuración de contacto). Esta feature establece la fuente única de verdad para enums y constantes que toda feature posterior consume, y provee datos realistas para desarrollo y testing.

---

## Motivación

Tras tener el schema Drizzle completo (F002), la aplicación necesita una fuente única de verdad para todos los conjuntos cerrados del dominio: tipos de inmueble, amenities, estados, roles, modos de privacidad y demás enums que el modelo conceptual del catálogo (product.md §4) declara como listas no extensibles sin revisión. Sin estas constantes centralizadas, cada feature posterior (backoffice, catálogo, API) inventaría sus propios valores literales, violando la regla constitucional §11.1 y generando valores fantasma en producción.

El seed data permite que todas las features posteriores trabajen contra datos demo verificables desde el día uno, sin depender de inserts manuales ni de factories dispersas.

---

## Alcance

### Incluye

1. **Constantes de dominio centralizadas** en `src/shared/constants/`: todos los conjuntos cerrados como arrays `as const` con tipos TypeScript derivados. Las constantes de enums de BD ya existen en `db-enums.ts`; esta feature añade:
   - **Labels de presentación** (mapas valor → etiqueta legible) para `PROPERTY_TYPES`, `AMENITIES`, `CONSTRUCTION_STATUSES`, `OPERATION_TYPES`, `LEAD_STATUSES`, `PROMOTION_STATUSES`, `USER_ROLES`. Consumidos por la UI del backoffice y la API pública.
   - **Constantes de configuración**: límites de paginación por defecto, tamaños de thumbnail, longitudes máximas de campos de texto (nombre promoción, mensaje lead, etc.).
2. **Schemas Zod de dominio** en `src/shared/types/`: validación de payloads para las entidades principales del dominio (promoción, tipología, unidad, lead, content block). Los schemas referencian las constantes como `z.enum()` para que la validación esté alineada con los tipos TypeScript y los enums de BD.
3. **Script de seed** ejecutable con `pnpm db:seed`: inserta datos demo en la base de datos de desarrollo respetando el modelo multi-tenant (todo registro lleva `tenant_id`).
4. **Tests unitarios** para las constantes (inmutabilidad, exhaustividad) y los schemas Zod (validación aceptada/rechazada).

### Fuera de alcance

- Modificar el schema Drizzle (responsabilidad de F002).
- UI de administración para los datos sembrados.
- Factories de tests para features específicas (pertenece a features de testing posteriores).
- Generación de slugs reales (pertenece a F011).
- Revalidación ISR (pertenece a F011).
- Upload real de imágenes a R2 (pertenece a F006/F013).

---

## Requisitos funcionales

### RF-1: Constantes de dominio inmutables

- **Descripción**: Cada conjunto cerrado del dominio se exporta como un array `as const` desde `src/shared/constants/`. El tipo TypeScript derivado (`typeof ARRAY[number]`) es la fuente única de verdad para tipado.
- **Ubicación**: `src/shared/constants/db-enums.ts` (ya existe con los enums de BD). Nuevos archivos: `src/shared/constants/domain-labels.ts` (mapas valor → etiqueta), `src/shared/constants/domain-config.ts` (límites y configuración).
- **Inmutabilidad**: Los arrays se exportan con `as const`, lo que los hace readonly en tiempo de compilación. No se permiten mutaciones en tiempo de ejecución (verificado por test).
- **Exhaustividad**: Los labels cubren todos los valores de cada enum. Si se añade un valor al enum sin añadir su label, un test falla.

### RF-2: Labels de presentación

- **Descripción**: Cada enum de dominio tiene un mapa asociado `Record<EnumValue, string>` que proporciona la etiqueta legible para UI.
- **Ejemplos**:
  - `PROPERTY_TYPE_LABELS`: `{ piso: "Piso", ático: "Ático", casa: "Casa", ... }`
  - `CONSTRUCTION_STATUS_LABELS`: `{ ON_PLAN: "Sobre plano", IN_CONSTRUCTION: "En construcción", READY: "Entrega inmediata" }`
  - `OPERATION_TYPE_LABELS`: `{ SALE: "Venta", RENT: "Alquiler", SALE_AND_RENT: "Venta y alquiler" }`
  - `LEAD_STATUS_LABELS`: `{ NEW: "Nuevo", CONTACTED: "Contactado", IN_NEGOTIATION: "En negociación", WON: "Ganado", LOST: "Perdido" }`
  - `PROMOTION_STATUS_LABELS`: `{ DRAFT: "Borrador", PUBLISHED: "Publicado", RESERVED: "Reservado", SOLD: "Vendido", RENTED: "Alquilado", WITHDRAWN: "Retirado" }`
  - `USER_ROLE_LABELS`: `{ ADMIN: "Administrador", OPERATOR: "Operador", AGENT: "Agente" }`
  - `AMENITY_LABELS`: `{ ascensor: "Ascensor", terraza: "Terraza", ... }`
- **Idioma**: Las etiquetas están en español (idioma del mercado objetivo de Domio).

### RF-3: Constantes de configuración de dominio

- **Descripción**: Límites y valores por defecto centralizados en `src/shared/constants/domain-config.ts`.
- **Contenido**:
  - `DEFAULT_PAGE_SIZE = 20` (paginación por defecto en listados)
  - `MAX_PAGE_SIZE = 100` (límite máximo de items por página)
  - `PROMOCION_NAME_MAX_LENGTH = 200`
  - `LEAD_MESSAGE_MAX_LENGTH = 2000`
  - `LEAD_NAME_MAX_LENGTH = 100`
  - `LEAD_EMAIL_MAX_LENGTH = 254`
  - `SEO_TITLE_MAX_LENGTH = 60`
  - `SEO_DESCRIPTION_MAX_LENGTH = 160`
  - `THUMBNAIL_WIDTH = 400`
  - `THUMBNAIL_HEIGHT = 300`

### RF-4: Schemas Zod de dominio

- **Descripción**: Schemas de validación en `src/shared/types/` que referencian las constantes como `z.enum()`.
- **Schemas requeridos**:
  - `promocion-schema.ts`: validación de payloads de creación/edición de promoción (name, kind, status, operation, propertyType, constructionStatus, island, municipality, address, mapPrivacyMode, seoTitle, seoDescription).
  - `tipologia-schema.ts`: validación de payloads de tipología (name, usefulArea, builtArea, bedrooms, bathrooms, amenities, energyCert, referencePriceSale, referencePriceRent).
  - `lead-schema.ts`: validación de payloads de lead (name, email, phone, message, source, channel, promocionId, tipologiaId, consentimiento).
  - `content-block-schema.ts`: validación de payloads de bloques editoriales por `block_type` (schema discriminado por tipo de bloque).
- **Regla**: Los enums en los schemas Zod usan `z.enum()` referenciando el array `as const` de las constantes, no strings literales duplicados.

### RF-5: Script de seed

- **Descripción**: Script ejecutable con `pnpm db:seed` que inserta datos demo en la base de datos de desarrollo.
- **Datos a insertar**:
  1. **1 tenant por defecto**: slug `domio`, name `Domio Inmobiliaria`.
  2. **1 admin**: email `admin@domio.dev`, role `ADMIN`, password hasheada (bcrypt).
  3. **2 agentes**: emails `agente1@domio.dev`, `agente2@domio.dev`, role `AGENT`.
  4. **2 operadores**: emails `operador1@domio.dev`, `operador2@domio.dev`, role `OPERATOR`.
  5. **8 promociones demo**:
     - 4 `kind='portfolio'` con `construction_status` variados (1 ON_PLAN, 1 IN_CONSTRUCTION, 2 READY), `status='PUBLISHED'`, en municipios de Tenerife (Santa Cruz, La Laguna, Adeje, Arona).
     - 4 `kind='external'` con `construction_status='READY'`, `status='PUBLISHED'`, en municipios variados.
     - Cada promoción con: ubicación (isla, municipio, dirección, coordenadas), modo de privacidad (mix EXACT/AREA), agente asignado (rotativo), bloques editoriales (al menos DESCRIPCION_GENERAL y MEMORIA_CALIDADES).
  6. **Tipologías**: 2-3 tipologías por promoción con dormitorios, baños, superficies y precios realistas.
  7. **Unidades**: 2-4 unidades por tipología con estados variados (AVAILABLE, RESERVED, SOLD).
  8. **Media assets placeholder**: registros en `media_assets` con `r2_key` placeholder (no hay upload real a R2), `alt_text` obligatorio, `kind` apropiado (IMAGE_GALLERY, PLAN). Al menos 1 portada por promoción.
  9. **5 leads demo**: con estados variados (NEW, CONTACTED, IN_NEGOTIATION, WON, LOST), sources mixtos (commercial, institutional), asignados a agentes diferentes.
  10. **Configuración de contacto**: teléfono, email, dirección, horario, WhatsApp number y mensaje predefinido.
- **Idempotencia**: El script verifica si los datos ya existen antes de insertar (por slug/email). Si el tenant `domio` ya existe, no duplica.
- **Conexión**: Usa `DATABASE_URL` del `.env` (la misma que `db:migrate`).

### RF-6: Tests de constantes y schemas

- **Descripción**: Suite de tests unitarios que verifica:
  - Las constantes son inmutables (Object.isFrozen o readonly en TypeScript).
  - Los labels cubren todos los valores de cada enum (exhaustividad).
  - Los schemas Zod aceptan payloads válidos y rechazan inválidos con mensajes de error descriptivos.
  - El script de seed es importable sin efectos secundarios (la lógica de seed es testeable unitariamente).

---

## Criterios de aceptación

| ID   | Criterio                                                                                                                              | Verificación                                                    |
|------|---------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| CA-1 | Todas las constantes de dominio están en `src/shared/constants/` como arrays `as const` con tipos derivados.                          | Test unitario verifica inmutabilidad y tipado.                  |
| CA-2 | Los labels cubren todos los valores de cada enum sin omisiones.                                                                       | Test unitario de exhaustividad (Object.keys(labels).length === enum.length). |
| CA-3 | Los schemas Zod usan `z.enum()` referenciando las constantes, no strings literales duplicados.                                        | Revisión de código + test que verifica que un valor inválido del enum es rechazado. |
| CA-4 | `pnpm db:seed` ejecuta sin errores contra la BD de desarrollo y los datos son consultables.                                           | Ejecución manual del script + verificación con query directa.   |
| CA-5 | El seed inserta al menos 8 promociones (4 portfolio + 4 external), 5 leads, 1 tenant, 6 usuarios, y configuración de contacto.        | Query de verificación tras seed.                                |
| CA-6 | Todo registro de dominio en el seed lleva `tenant_id` del tenant por defecto.                                                         | Query verifica que no hay registros con `tenant_id` NULL o de otro tenant. |
| CA-7 | El seed es idempotente: ejecutarlo dos veces no duplica datos.                                                                        | Ejecutar seed dos veces + verificar conteo de registros.        |
| CA-8 | Los schemas Zod aceptan un payload válido de ejemplo para cada entidad (promoción, tipología, lead, content block).                   | Test unitario con payload válido.                               |
| CA-9 | Los schemas Zod rechazan un payload inválido de ejemplo para cada entidad con al menos un error de validación.                        | Test unitario con payload inválido.                             |
| CA-10 | `pnpm typecheck` pasa sin errores tras añadir las constantes, labels y schemas.                                                      | Ejecución de `pnpm typecheck`.                                  |

---

## Entidades de datos

| Entidad              | Descripción                                                                                       |
|----------------------|---------------------------------------------------------------------------------------------------|
| DomainLabel          | Mapa `Record<EnumValue, string>` que asocia cada valor de enum con su etiqueta legible en español. |
| DomainConfig         | Objeto con constantes de configuración: límites de paginación, longitudes máximas, tamaños de thumbnail. |
| PromocionPayload     | Schema Zod para validación de payloads de creación/edición de promoción.                          |
| TipologiaPayload     | Schema Zod para validación de payloads de tipología.                                              |
| LeadPayload          | Schema Zod para validación de payloads de lead (incluye consentimiento RGPD).                     |
| ContentBlockPayload  | Schema Zod discriminado por `block_type` para validación de bloques editoriales.                  |

---

## Escenarios de usuario

### Escenario 1: Desarrollador consulta las constantes de dominio

Un desarrollador que implementa el filtro del catálogo público (F020) necesita los valores válidos para `property_type`. Importa `PROPERTY_TYPES` desde `src/shared/constants/db-enums` y obtiene el array completo. Para mostrar etiquetas en la UI, importa `PROPERTY_TYPE_LABELS` desde `src/shared/constants/domain-labels` y renderiza la etiqueta correspondiente.

### Escenario 2: Backoffice valida un payload de promoción

El formulario de edición de promoción en el backoffice (F011) valida el payload en cliente antes de enviarlo al servidor. Importa `promocionSchema` desde `src/shared/types/promocion-schema` y ejecuta `promocionSchema.safeParse(formData)`. Si el usuario selecciona un `propertyType` que no está en las constantes, la validación falla con un mensaje claro.

### Escenario 3: Script de seed puebla la BD de desarrollo

Un desarrollador clona el repositorio y ejecuta `pnpm db:migrate` seguido de `pnpm db:seed`. La base de datos queda poblada con un tenant, 6 usuarios, 8 promociones con tipologías, unidades, bloques editoriales y media assets placeholder, 5 leads y configuración de contacto. Puede empezar a desarrollar inmediatamente con datos realistas.

### Escenario 4: Seed idempotente en CI

El pipeline de CI ejecuta `pnpm db:seed` antes de los tests de integración. Si el seed ya se ejecutó en una corrida anterior (BD persistente en desarrollo), no duplica los datos. Los tests encuentran exactamente los datos esperados.

### Escenario 5: Schema Zod rechaza lead sin consentimiento

Un payload de lead llega al endpoint POST sin el campo de consentimiento RGPD. El schema `leadSchema` lo rechaza con un error de validación específico (`consentimiento requerido`). El endpoint devuelve 422 con el detalle del campo faltante.

---

## Suposiciones

- Las contraseñas de los usuarios demo se hashean con bcrypt en el propio script de seed (no se almacenan en claro). La contraseña por defecto es `Domio2026!` para todos los usuarios demo.
- Las coordenadas de las promociones demo son puntos reales en los municipios de Tenerife (no coordenadas inventadas que caigan en el océano).
- Los `r2_key` de los media assets placeholder son strings ficticios (`placeholder/image-1.jpg`) que no corresponden a objetos reales en R2. El componente `MediaImage` (F003) debe manejar el caso de imagen no encontrada gracefully.
- El script de seed se ejecuta contra la BD apuntada por `DATABASE_URL` (la misma que usa `db:migrate`). En desarrollo local, es la BD de Neon del desarrollador.
- Los bloques editoriales del seed tienen payloads JSON simples (texto plano para DESCRIPCION_GENERAL, lista de ítems para MEMORIA_CALIDADES) que cumplen el schema Zod de content blocks.

---

## Dependencias

| Feature | Relación                                                                 |
|---------|--------------------------------------------------------------------------|
| F002    | Schema Drizzle completo con todas las tablas, enums, índices y RLS. El seed inserta en estas tablas. Las constantes referencian los mismos valores que los enums de BD. |

---

## Restricciones técnicas

1. **Scope Rule** (constitution.md §2): Las constantes van en `src/shared/constants/` (usadas por múltiples features). Los schemas Zod van en `src/shared/types/`. El script de seed va en `scripts/`.
2. **Constantes centralizadas** (constitution.md §11.1): Los conjuntos cerrados viven en `shared/constants/` como fuente única. Añadir un valor requiere migración explícita.
3. **Multi-tenant DNA** (architecture.md §2.1): Todo registro de dominio en el seed lleva `tenant_id` NOT NULL. No hay excepciones.
4. **Zod enum desde constantes** (architecture.md §7.7): Los schemas Zod referencian los arrays `as const` con `z.enum()`, no duplican los valores como strings literales.
5. **Sin magic numbers** (constitution.md §2): Los límites de paginación, longitudes máximas y tamaños de thumbnail son constantes nombradas, no números sueltos en el código.
6. **Idioma de las etiquetas**: Las labels de presentación están en español, coherente con el mercado objetivo de Domio (product.md §3).

---

## Impacto técnico

- **Nuevos archivos**: `src/shared/constants/domain-labels.ts`, `src/shared/constants/domain-config.ts`, `src/shared/types/promocion-schema.ts`, `src/shared/types/tipologia-schema.ts`, `src/shared/types/lead-schema.ts`, `src/shared/types/content-block-schema.ts`, `scripts/seed.ts`.
- **Tests nuevos**: `tests/unit/constants.test.ts`, `tests/unit/schemas.test.ts`.
- **Scripts**: `pnpm db:seed` añadido a `package.json`.
- **Dependencias npm**: `bcrypt` (para hashear contraseñas en el seed) — ya disponible como dependencia de Auth.js v5. `tsx` para ejecutar el script (ya en devDependencies).
- **Sin cambios al schema Drizzle**: esta feature no modifica tablas, columnas ni índices.
