# Implementation Plan: api-publica-v1

**Branch**: `feature/024-api-publica-v1` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

## Summary

API pública versionada bajo `/api/v1/` con dos endpoints: GET /api/v1/promociones (cursor pagination, filtro obligatorio portfolio+PUBLISHED, serialización respetando map_privacy_mode) y POST /api/v1/leads/institutional (consentimiento RGPD obligatorio, email queue). Autenticación por API key en header X-API-Key, rate limiting por key.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: Next.js 15 (App Router), Zod

**Storage**: PostgreSQL (promociones, leads, consent_records, email_queue, api_keys)

**Testing**: Vitest (unit), contract tests en tests/contract/v1/

**Target Platform**: Web (Vercel hosting) — API routes

**Performance Goals**: Response time <200ms p95

**Constraints**: ApiKeyContext en middleware, filtro a nivel de repositorio, serialización que respeta privacidad, rate limiting por key, consentimiento obligatorio, emails por cola

## Constitution Check

**Scope Rule (§2)**: ✓
- API routes → `app/api/v1/`
- Lógica de API → `src/features/api-public/`
- Schemas Zod → `src/features/api-public/schemas/`
- Contract tests → `tests/contract/v1/`

**Servicios externos por cola (§11.3)**: ✓
- Emails encolados en email_queue, nunca enviados directamente

**Validación Zod (§4)**: ✓
- Schemas Zod para request/response

**Rate limiting (§1)**: ✓
- Por API key con degradación graceful

**Tests de contrato (§3)**: ✓
- Schemas versionados en tests/contract/v1/
- Test de no-divergencia bloqueante

## Project Structure

```text
app/
└── api/
    └── v1/
        ├── promociones/
        │   └── route.ts (GET)
        └── leads/
            └── institutional/
                └── route.ts (POST)

src/
└── features/
    └── api-public/
        ├── middleware/
        │   └── api-key-auth.ts
        ├── schemas/
        │   ├── promocion-response.schema.ts
        │   └── lead-institutional.schema.ts
        ├── server/
        │   ├── get-promociones.ts
        │   └── create-institutional-lead.ts
        └── serializers/
            └── promocion-serializer.ts

tests/
└── contract/
    └── v1/
        ├── promocion-response.contract.spec.ts
        └── lead-institutional.contract.spec.ts
```

## Complexity Tracking

> **No violations detected.**
