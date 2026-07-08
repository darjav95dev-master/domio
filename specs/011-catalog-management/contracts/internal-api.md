# Contracts: Catalog Management (F011)

**Date**: 2026-07-08 | **Feature**: [spec.md](../spec.md)

## Internal API Routes (backoffice → server)

### GET /api/internal/promociones

Listado de promociones con filtros. Solo para usuarios autenticados.

**Query params**:
| Param              | Tipo   | Obligatorio | Notas                              |
|--------------------|--------|-------------|------------------------------------|
| status             | string | No          | Filtro por estado                  |
| kind               | string | No          | portfolio / external               |
| island             | string | No          | Filtro por isla                    |
| municipality       | string | No          | Filtro por municipio               |
| assignedAgentId    | string | No          | Filtro por agente                  |
| constructionStatus | string | No          | ON_PLAN / IN_CONSTRUCTION / READY  |
| page               | number | No          | Página (default 1)                 |
| limit              | number | No          | Items por página (default 50, max 100) |

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "string",
      "slug": "string | null",
      "kind": "portfolio | external",
      "status": "DRAFT | PUBLISHED | ...",
      "operation": "SALE | RENT | SALE_AND_RENT | null",
      "propertyType": "piso | ático | ... | null",
      "constructionStatus": "ON_PLAN | IN_CONSTRUCTION | READY | null",
      "island": "string | null",
      "municipality": "string | null",
      "assignedAgentId": "uuid | null",
      "assignedAgentName": "string | null",
      "updatedAt": "ISO datetime"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

**Scope por rol**: AGENT solo ve promociones donde assignedAgentId = session.userId. OPERATOR y ADMIN ven todas las del tenant.

---

### POST /api/internal/promociones

Crear nueva promoción en borrador.

**Request body**: PromocionCreateInput (parcial — solo name, kind; el resto se rellena en edición)

**Response 201**:
```json
{
  "id": "uuid",
  "name": "string",
  "slug": null,
  "status": "DRAFT",
  "kind": "portfolio | external",
  ...
}
```

---

### GET /api/internal/promociones/[id]

Detalle completo de una promoción con sus tipologías y unidades.

**Response 200**:
```json
{
  "id": "uuid",
  "name": "string",
  "slug": "string | null",
  "kind": "portfolio | external",
  "status": "DRAFT | PUBLISHED | ...",
  "operation": "SALE | RENT | SALE_AND_RENT | null",
  "propertyType": "string | null",
  "constructionStatus": "string | null",
  "island": "string | null",
  "municipality": "string | null",
  "address": "string | null",
  "location": { "lng": number, "lat": number } | null,
  "locationApprox": { "lng": number, "lat": number } | null,
  "mapPrivacyMode": "EXACT | AREA",
  "seoTitle": "string | null",
  "seoDescription": "string | null",
  "assignedAgentId": "uuid | null",
  "draftPayload": "object | null",
  "constructionWarning": "string | null",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "tipologias": [
    {
      "id": "uuid",
      "name": "string",
      "usefulArea": "number | null",
      "builtArea": "number | null",
      "floors": "number | null",
      "bedrooms": "number | null",
      "bathrooms": "number | null",
      "yearBuilt": "number | null",
      "energyCert": "string | null",
      "referencePriceSale": "number | null",
      "referencePriceRent": "number | null",
      "communityFee": "number | null",
      "deposit": "number | null",
      "amenities": ["string"],
      "planAssetId": "uuid | null",
      "unidades": [
        {
          "id": "uuid",
          "identifier": "string | null",
          "status": "AVAILABLE | RESERVED | SOLD | RENTED"
        }
      ]
    }
  ]
}
```

---

### PATCH /api/internal/promociones/[id]

Actualizar promoción. Valida con Zod schema completo.

**Request body**: PromocionUpdateInput (campos parciales permitidos)

**Comportamiento especial**:
- Si `status` cambia a `PUBLISHED` y `slug` es vacío → genera slug determinista
- Si `status` cambia a `PUBLISHED` y `slug` ya existe → slug NO cambia
- Si `draftPayload` se aplica (publicar desde borrador) → se copian los campos del draft y draftPayload se pone a null
- Registra cambios en `promocion_history` (comparando old vs new)
- Dispara `revalidateTag('promocion:{slug}')` y `revalidateTag('catalog')` si está publicada

**Response 200**: Promoción actualizada (misma estructura que GET)

**Errors**:
- 400: Validación Zod falla
- 403: AGENT intenta editar promoción no asignada
- 404: Promoción no existe o no pertenece al tenant

---

### PATCH /api/internal/promociones/[id]/draft

Autoguardado de borrador. Actualiza solo `draft_payload`.

**Request body**: PromocionDraftInput (snapshot del formulario)

**Comportamiento**:
- Solo actualiza `draftPayload`. NO modifica otros campos de la promoción.
- NO genera slug. NO dispara revalidación. NO registra en histórico.

**Response 200**:
```json
{
  "draftPayload": { ... },
  "updatedAt": "ISO datetime"
}
```

---

### DELETE /api/internal/promociones/[id]

Eliminar promoción (y cascada: tipologías, unidades, bloques de contenido).

**Comportamiento**:
- Solo ADMIN y OPERATOR pueden eliminar.
- Registra en histórico antes de borrar (último registro).
- Si estaba publicada, dispara revalidateTag.

**Response 204**: No content

---

### GET /api/internal/promociones/[id]/history

Histórico de cambios de la promoción.

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "field": "string",
      "oldValue": "string | null",
      "newValue": "string | null",
      "authorId": "uuid",
      "authorName": "string",
      "createdAt": "ISO datetime"
    }
  ]
}
```

Ordenado por createdAt DESC.

---

## Zod Schemas (referencia — se implementan en `src/shared/schemas/`)

### PromocionCreateSchema
```typescript
z.object({
  name: z.string().min(3).max(200),
  kind: z.enum(["portfolio", "external"]),
})
```

### PromocionUpdateSchema
```typescript
z.object({
  name: z.string().min(3).max(200).optional(),
  kind: z.enum(["portfolio", "external"]).optional(),
  status: z.enum(["DRAFT","PUBLISHED","RESERVED","SOLD","RENTED","WITHDRAWN"]).optional(),
  operation: z.enum(["SALE","RENT","SALE_AND_RENT"]).nullable().optional(),
  propertyType: z.enum(PROPERTY_TYPES).nullable().optional(),
  constructionStatus: z.enum(["ON_PLAN","IN_CONSTRUCTION","READY"]).nullable().optional(),
  island: z.string().max(100).nullable().optional(),
  municipality: z.string().max(100).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  location: z.object({ lng: z.number(), lat: z.number() }).nullable().optional(),
  locationApprox: z.object({ lng: z.number(), lat: z.number() }).nullable().optional(),
  mapPrivacyMode: z.enum(["EXACT","AREA"]).optional(),
  seoTitle: z.string().max(70).nullable().optional(),
  seoDescription: z.string().max(160).nullable().optional(),
  assignedAgentId: z.string().uuid().nullable().optional(),
})
.refine(
  (data) => data.status !== "PUBLISHED" || (data.name && data.operation && data.propertyType && data.location && data.mapPrivacyMode),
  { message: "Publicar requiere nombre, operación, tipo, ubicación y modo de privacidad", path: ["status"] }
)
```

### TipologiaSchema
```typescript
z.object({
  id: z.string().uuid().optional(), // presente si ya existe, ausente si es nueva
  name: z.string().min(2).max(150),
  usefulArea: z.number().int().positive().nullable().optional(),
  builtArea: z.number().int().positive().nullable().optional(),
  floors: z.number().int().positive().nullable().optional(),
  bedrooms: z.number().int().min(0).max(10).nullable().optional(),
  bathrooms: z.number().int().min(0).max(10).nullable().optional(),
  yearBuilt: z.number().int().min(1800).max(2100).nullable().optional(),
  energyCert: z.enum(["A","B","C","D","E","F","G","EN_TRAMITE"]).nullable().optional(),
  referencePriceSale: z.number().int().positive().nullable().optional(),
  referencePriceRent: z.number().int().positive().nullable().optional(),
  communityFee: z.number().int().positive().nullable().optional(),
  deposit: z.number().int().positive().nullable().optional(),
  amenities: z.array(z.enum(AMENITIES)).optional(),
  planAssetId: z.string().uuid().nullable().optional(),
})
```

### UnidadSchema
```typescript
z.object({
  id: z.string().uuid().optional(),
  identifier: z.string().max(50).nullable().optional(),
  status: z.enum(["AVAILABLE","RESERVED","SOLD","RENTED"]).optional(),
})
```
