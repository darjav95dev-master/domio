# Data Model: Domain Constants & Seed

**Feature**: 009 | **Date**: 2026-07-08

## Overview

Esta feature no modifica el schema de base de datos (responsabilidad de F002). Define modelos de validación (Zod schemas) y datos de seed que se insertan en tablas existentes.

## Entidades de validación (Zod schemas)

### PromocionPayload

Valida payloads de creación/edición de promoción.

| Campo              | Tipo Zod                  | Requerido | Notas                                      |
|--------------------|---------------------------|-----------|---------------------------------------------|
| name               | `z.string().min(1).max(200)` | ✅       | Nombre de la promoción                     |
| kind               | `z.enum(PROMOCION_KINDS)` | ✅        | `portfolio` o `external`                   |
| status             | `z.enum(PROMOTION_STATUSES)` | ✅     | Estado comercial                           |
| operation          | `z.enum(OPERATION_TYPES).nullable()` | ❌ | Venta, alquiler o ambos              |
| propertyType       | `z.enum(PROPERTY_TYPES).nullable()` | ❌ | Tipo de inmueble                      |
| constructionStatus | `z.enum(CONSTRUCTION_STATUSES).nullable()` | ❌ | Estado de obra                     |
| island             | `z.string().nullable()`   | ❌        | Isla (Canarias)                            |
| municipality       | `z.string().nullable()`   | ❌        | Municipio                                  |
| address            | `z.string().nullable()`   | ❌        | Dirección                                  |
| mapPrivacyMode     | `z.enum(MAP_PRIVACY_MODES)` | ✅      | EXACT o AREA                               |
| seoTitle           | `z.string().max(60).nullable()` | ❌   | SEO title (fallback determinista si vacío) |
| seoDescription     | `z.string().max(160).nullable()` | ❌  | SEO description                            |

### TipologiaPayload

Valida payloads de tipología.

| Campo              | Tipo Zod                     | Requerido | Notas                                    |
|--------------------|------------------------------|-----------|------------------------------------------|
| name               | `z.string().min(1)`          | ✅       | Nombre de la tipología                   |
| usefulArea         | `z.number().int().positive().nullable()` | ❌ | Superficie útil en m²              |
| builtArea          | `z.number().int().positive().nullable()` | ❌ | Superficie construida en m²       |
| bedrooms           | `z.number().int().min(0).nullable()` | ❌ | Número de dormitorios                  |
| bathrooms          | `z.number().int().min(0).nullable()` | ❌ | Número de baños                        |
| amenities          | `z.array(z.enum(AMENITIES)).default([])` | ❌ | Lista de amenities                   |
| energyCert         | `z.enum(ENERGY_CERTS).nullable()` | ❌   | Certificación energética               |
| referencePriceSale | `z.number().int().positive().nullable()` | ❌ | Precio de venta de referencia   |
| referencePriceRent | `z.number().int().positive().nullable()` | ❌ | Precio de alquiler de referencia  |

### LeadPayload

Valida payloads de lead (incluye consentimiento RGPD).

| Campo        | Tipo Zod                          | Requerido | Notas                                    |
|--------------|-----------------------------------|-----------|------------------------------------------|
| name         | `z.string().min(1).max(100)`     | ✅       | Nombre del lead                          |
| email        | `z.string().email().max(254)`    | ✅       | Email válido                             |
| phone        | `z.string().nullable()`          | ❌       | Teléfono                                 |
| message      | `z.string().max(2000).nullable()` | ❌      | Mensaje                                  |
| source       | `z.enum(LEAD_SOURCES)`           | ✅       | commercial o institutional               |
| channel      | `z.enum(LEAD_CHANNELS).nullable()` | ❌     | FORM o WHATSAPP                          |
| promocionId  | `z.string().uuid()`              | ✅       | ID de la promoción                       |
| tipologiaId  | `z.string().uuid().nullable()`   | ❌       | ID de la tipología                       |
| consent      | `z.object({ legalBasis: z.string(), textAccepted: z.string() })` | ✅ | Consentimiento RGPD |

### ContentBlockPayload (discriminado por blockType)

Schema discriminado por `blockType` para bloques editoriales.

| blockType             | Payload shape                                                                 |
|-----------------------|-------------------------------------------------------------------------------|
| `DESCRIPCION_GENERAL` | `{ text: string }`                                                            |
| `MEMORIA_CALIDADES`   | `{ items: Array<{ title: string, description: string, icon?: string }> }`    |
| `ZONAS_COMUNES`       | `{ items: Array<{ name: string, description: string }> }`                    |
| `UBICACION_SERVICIOS` | `{ items: Array<{ service: string, distance: string }> }`                    |
| `PLAZOS_GARANTIAS`    | `{ delivery?: string, license?: string, guarantee?: string, audit?: string }` |

## Datos de seed

### Tenant

| Campo   | Valor              |
|---------|--------------------|
| slug    | `domio`            |
| name    | `Domio Inmobiliaria` |
| config  | `{}`               |

### Usuarios (todos con tenant_id del tenant domio)

| Email               | Role     | Name              | Password     |
|---------------------|----------|--------------------|--------------|
| admin@domio.dev     | ADMIN    | Admin Domio        | Domio2026!   |
| agente1@domio.dev   | AGENT    | Ana García         | Domio2026!   |
| agente2@domio.dev   | AGENT    | Carlos Pérez       | Domio2026!   |
| operador1@domio.dev | OPERATOR | Laura Rodríguez    | Domio2026!   |
| operador2@domio.dev | OPERATOR | Miguel Fernández   | Domio2026!   |

### Promociones (8 total, todas PUBLISHED)

| # | Nombre                        | Kind      | Construction | Municipality    | Privacy | Agent     |
|---|-------------------------------|-----------|-------------|-----------------|---------|-----------|
| 1 | Residencial Las Américas      | portfolio | ON_PLAN     | Adeje           | AREA    | agente1   |
| 2 | Apartamentos Costa Adeje      | portfolio | IN_CONSTRUCTION | Adeje       | EXACT   | agente2   |
| 3 | Villas La Laguna              | portfolio | READY       | La Laguna       | EXACT   | agente1   |
| 4 | Pisos Santa Cruz Centro       | portfolio | READY       | Santa Cruz      | AREA    | agente2   |
| 5 | Ático Santa Cruz Mar          | external  | READY       | Santa Cruz      | EXACT   | agente1   |
| 6 | Casa Arona Sur                | external  | READY       | Arona           | AREA    | agente2   |
| 7 | Local Comercial La Laguna     | external  | READY       | La Laguna       | EXACT   | agente1   |
| 8 | Oficina Santa Cruz Business   | external  | READY       | Santa Cruz      | AREA    | agente2   |

Cada promoción tiene:
- 2-3 tipologías con dormitorios, baños, superficies y precios realistas
- 2-4 unidades por tipología con estados variados
- Bloques editoriales: al menos DESCRIPCION_GENERAL y MEMORIA_CALIDADES; ZONAS_COMUNES y PLAZOS_GARANTIAS solo para portfolio
- 1-2 media assets placeholder (IMAGE_GALLERY) con alt_text y 1 portada

### Leads (5 total)

| # | Name            | Email              | Status          | Source       | Agent     | Promoción                    |
|---|-----------------|--------------------|-----------------|--------------|-----------|------------------------------|
| 1 | Juan López      | juan@example.com   | NEW             | commercial   | agente1   | Residencial Las Américas     |
| 2 | María Torres    | maria@example.com  | CONTACTED       | commercial   | agente2   | Villas La Laguna             |
| 3 | Pedro Sánchez   | pedro@example.com  | IN_NEGOTIATION  | institutional| agente1   | Pisos Santa Cruz Centro      |
| 4 | Laura Martín    | laura@example.com  | WON             | commercial   | agente2   | Apartamentos Costa Adeje     |
| 5 | Roberto Díaz    | roberto@example.com| LOST            | commercial   | agente1   | Casa Arona Sur               |

### Configuración de contacto

| Campo                  | Valor                                    |
|------------------------|------------------------------------------|
| phone                  | `+34 922 123 456`                        |
| email                  | `info@domio.dev`                         |
| address                | `Calle Castillo 42, 38002 Santa Cruz de Tenerife` |
| hours                  | `Lun-Vie 9:00-18:00`                     |
| whatsappNumber         | `+34 622 987 654`                        |
| whatsappPrefilledMessage | `Hola, me gustaría recibir información sobre sus propiedades.` |
