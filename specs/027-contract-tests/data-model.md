# Data Model: Contract Tests

**Feature**: 027-contract-tests | **Date**: 2026-07-09

## Overview

Esta feature no introduce nuevas entidades de dominio. Los contract tests operan sobre los schemas zod existentes de la API pública v1 y generan snapshots JSON. El endpoint OpenAPI sirve un spec generado dinámicamente.

## Entidades Operadas por Tests

### Schema Snapshots

- **promocion-response.schema.json**: Snapshot del schema `promocionResponseSchema` (definido en `src/features/api-public/schemas/promocion-response.schema.ts`). Contiene la estructura completa del schema zod serializado a JSON: campos, tipos, optional/required, nested objects.
- **lead-institutional.schema.json**: Snapshot del schema `leadInstitutionalSchema` (definido en `src/features/api-public/schemas/lead-institutional.schema.ts`). Contiene la estructura del schema de request para POST /api/v1/leads/institutional.

### OpenAPI Spec (generado dinámicamente)

- **OpenAPISpec**: Documento JSON que describe los endpoints de la API v1. Se genera en runtime desde los schemas zod usando `@asteasolutions/zod-to-openapi`. Estructura:
  - `openapi`: "3.0.0"
  - `info`: { title: "Domio API", version: "v1" }
  - `paths`: { "/api/v1/promociones": { get: {...} }, "/api/v1/leads/institutional": { post: {...} } }
  - `components.schemas`: schemas de request/response extraídos de zod

### Schemas Zod Existentes (no se modifican)

- **promocionResponseSchema**: Schema de respuesta para GET /api/v1/promociones. Campos: id, slug, nombre, tipo, operacion, isla, municipio, mapPrivacyMode, location (optional), locationApprox, precioMin, precioMax, superficieMin, superficieMax, dormitorios, banios, updatedAt.
- **leadInstitutionalSchema**: Schema de request para POST /api/v1/leads/institutional. Campos: name, email, phone (optional), message (optional), promocionId, tipologiaId (optional), consent (object con legalBasis y textAccepted).

## Relaciones

- Schema Snapshot → Schema Zod: el snapshot es una serialización del schema zod en un momento dado.
- OpenAPI Spec → Schema Zod: el spec OpenAPI se genera desde los schemas zod.
- Contract Tests → Schema Snapshot: los tests comparan el schema actual contra el snapshot.
- Contract Tests → Endpoint Real: los consumer mirror tests hacen requests reales a los endpoints.

## Validaciones

- Test de no-divergencia: `JSON.stringify(currentSchema) === JSON.stringify(snapshot)` (deep equality).
- OpenAPI validation: el spec generado debe pasar validación contra el meta-schema OpenAPI 3.0.
- Consumer mirror: el body de la respuesta debe validar contra el schema zod correspondiente.
