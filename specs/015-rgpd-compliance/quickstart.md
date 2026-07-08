# Quickstart Validation: RGPD Compliance

**Feature**: F015 — RGPD Compliance

## Prerequisites
- BD con migraciones, seed ejecutado, pnpm dev

## Scenarios

### 1. Crear lead sin consentimiento → 422
### 2. Crear lead con consentimiento → 201 + consent_record
### 3. Admin exporta lead → CSV en R2 + arsop_request EXPORT
### 4. Admin borra lead → cascada + arsop_request DELETE
### 5. No-ADMIN intenta export/borrado → denegado
### 6. UPDATE consent_records → falla
### 7. DELETE arsop_requests → falla

## Tests
```bash
pnpm vitest run tests/integration/consent-operations.test.ts
pnpm vitest run tests/integration/arsop-operations.test.ts
pnpm vitest run tests/unit/consent-validation.test.ts
```
