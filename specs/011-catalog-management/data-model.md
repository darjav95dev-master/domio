# Data Model: Catalog Management (F011)

**Date**: 2026-07-08 | **Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Existing Entities (from F002 schema — no migration needed)

### Promoción (`promociones`)

| Campo              | Tipo        | Nullable | Notas                                    |
|--------------------|-------------|----------|------------------------------------------|
| id                 | uuid        | NO       | PK, defaultRandom()                      |
| tenantId           | uuid        | NO       | FK → tenants.id                          |
| slug               | text        | NO       | Generado al publicar, inmutable          |
| name               | text        | NO       | Nombre comercial                         |
| kind               | enum        | NO       | portfolio / external                     |
| status             | enum        | NO       | DRAFT/PUBLISHED/RESERVED/SOLD/RENTED/WITHDRAWN |
| operation          | enum        | YES      | SALE/RENT/SALE_AND_RENT                  |
| propertyType       | enum        | YES      | piso/ático/casa/chalet/dúplex/estudio/local/oficina/nave/garaje/trastero/terreno |
| constructionStatus | enum        | YES      | ON_PLAN/IN_CONSTRUCTION/READY            |
| island             | text        | YES      | Isla Canaria                             |
| municipality       | text        | YES      | Municipio                                |
| address            | text        | YES      | Dirección exacta                         |
| location           | PostGIS     | NO       | Punto geográfico (SRID 4326)             |
| locationApprox     | PostGIS     | NO       | Centroide del municipio                  |
| mapPrivacyMode     | enum        | NO       | EXACT / AREA                             |
| seoTitle           | text        | YES      | SEO title opcional                       |
| seoDescription     | text        | YES      | SEO description opcional                 |
| assignedAgentId    | uuid        | YES      | FK → users.id                            |
| draftPayload       | jsonb       | YES      | Autoguardado de borrador                 |
| createdAt          | timestamptz | NO       | defaultNow()                             |
| updatedAt          | timestamptz | NO       | defaultNow()                             |

**Índices**: (tenant_id, slug) UNIQUE, (tenant_id, status), (tenant_id, kind, status), (tenant_id, construction_status), GIST en location.

### Tipología (`tipologias`)

| Campo               | Tipo        | Nullable | Notas                                   |
|---------------------|-------------|----------|------------------------------------------|
| id                  | uuid        | NO       | PK                                       |
| tenantId            | uuid        | NO       | FK → tenants.id                          |
| promocionId         | uuid        | NO       | FK → promociones.id (ON DELETE CASCADE)  |
| name                | text        | NO       | Nombre de la tipología                   |
| usefulArea          | integer     | YES      | m² útiles                                |
| builtArea           | integer     | YES      | m² construidos                           |
| floors              | integer     | YES      | Número de plantas                        |
| bedrooms            | integer     | YES      | Dormitorios                              |
| bathrooms           | integer     | YES      | Baños                                    |
| yearBuilt           | integer     | YES      | Año construcción/entrega                 |
| energyCert          | enum        | YES      | A-G / EN_TRAMITE                         |
| referencePriceSale  | integer     | YES      | Precio venta (null = consultar)          |
| referencePriceRent  | integer     | YES      | Precio alquiler (null = consultar)       |
| communityFee        | integer     | YES      | Gastos comunidad                         |
| deposit             | integer     | YES      | Fianza (solo alquiler)                   |
| amenities           | jsonb       | YES      | Array de amenities (set cerrado)         |
| planAssetId         | uuid        | YES      | FK → media_assets.id                     |
| createdAt           | timestamptz | NO       | defaultNow()                             |
| updatedAt           | timestamptz | NO       | defaultNow()                             |

### Unidad (`unidades`)

| Campo        | Tipo        | Nullable | Notas                                   |
|--------------|-------------|----------|------------------------------------------|
| id           | uuid        | NO       | PK                                       |
| tenantId     | uuid        | NO       | FK → tenants.id                          |
| tipologiaId  | uuid        | NO       | FK → tipologias.id (ON DELETE CASCADE)   |
| identifier   | text        | YES      | Identificador (puerta, número, etc.)     |
| status       | enum        | NO       | AVAILABLE/RESERVED/SOLD/RENTED           |
| createdAt    | timestamptz | NO       | defaultNow()                             |
| updatedAt    | timestamptz | NO       | defaultNow()                             |

### Histórico (`promocion_history`)

| Campo        | Tipo        | Nullable | Notas                                   |
|--------------|-------------|----------|------------------------------------------|
| id           | uuid        | NO       | PK                                       |
| tenantId     | uuid        | NO       | FK → tenants.id                          |
| promocionId  | uuid        | NO       | FK → promociones.id                      |
| field        | text        | NO       | Nombre del campo modificado              |
| oldValue     | text        | YES      | Valor anterior (serializado)             |
| newValue     | text        | YES      | Valor nuevo (serializado)                |
| authorId     | uuid        | NO       | FK → users.id                            |
| createdAt    | timestamptz | NO       | defaultNow()                             |

**Inmutabilidad**: RLS sin UPDATE ni DELETE. Solo INSERT y SELECT.

## State Transitions

### Promoción Status

```
DRAFT → PUBLISHED (genera slug)
PUBLISHED → RESERVED
PUBLISHED → SOLD
PUBLISHED → RENTED
PUBLISHED → WITHDRAWN
PUBLISHED → DRAFT (despublicar)
RESERVED → PUBLISHED
RESERVED → SOLD
RESERVED → RENTED
RESERVED → WITHDRAWN
SOLD → (terminal, solo reactivación manual a PUBLISHED)
RENTED → (terminal, solo reactivación manual a PUBLISHED)
WITHDRAWN → DRAFT (reactivación)
```

### Unidad Status

```
AVAILABLE → RESERVED
AVAILABLE → SOLD
AVAILABLE → RENTED
RESERVED → AVAILABLE
RESERVED → SOLD
RESERVED → RENTED
SOLD → (terminal)
RENTED → (terminal)
```

## Relationships

```
Tenant 1──N Promoción
Promoción 1──N Tipología
Tipología 1──N Unidad
Promoción 1──N PromocionHistory
Promoción N──1 User (assignedAgent)
```

## Validation Rules (Zod)

### Promoción
- `name`: string, min 3, max 200
- `kind`: enum (portfolio/external)
- `status`: enum (DRAFT/PUBLISHED/RESERVED/SOLD/RENTED/WITHDRAWN)
- `operation`: enum nullable (SALE/RENT/SALE_AND_RENT)
- `propertyType`: enum nullable (PROPERTY_TYPES)
- `constructionStatus`: enum nullable (ON_PLAN/IN_CONSTRUCTION/READY)
- `island`: string nullable, max 100
- `municipality`: string nullable, max 100
- `address`: string nullable, max 300
- `location`: [number, number] (lng, lat) WGS84
- `locationApprox`: [number, number] (lng, lat) WGS84
- `mapPrivacyMode`: enum (EXACT/AREA)
- `seoTitle`: string nullable, max 70
- `seoDescription`: string nullable, max 160
- `assignedAgentId`: uuid nullable

**Reglas condicionales**:
- Si status = PUBLISHED → name, operation, propertyType, location, mapPrivacyMode son obligatorios
- Si kind = portfolio → constructionStatus recomendado (no bloqueante)
- Slug: solo se genera si status cambia a PUBLISHED y slug actual es vacío

### Tipología
- `name`: string, min 2, max 150
- `usefulArea`: integer nullable, positive
- `builtArea`: integer nullable, positive
- `floors`: integer nullable, positive
- `bedrooms`: integer nullable, 0-10
- `bathrooms`: integer nullable, 0-10
- `yearBuilt`: integer nullable, 1800-2100
- `energyCert`: enum nullable
- `referencePriceSale`: integer nullable, positive
- `referencePriceRent`: integer nullable, positive
- `communityFee`: integer nullable, positive
- `deposit`: integer nullable, positive
- `amenities`: array of enum (AMENITIES set cerrado)
- `planAssetId`: uuid nullable

### Unidad
- `identifier`: string nullable, max 50
- `status`: enum (AVAILABLE/RESERVED/SOLD/RENTED), default AVAILABLE
