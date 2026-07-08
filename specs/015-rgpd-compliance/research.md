# Research: RGPD Compliance

**Feature**: F015 — RGPD Compliance
**Date**: 2026-07-08

## R-001: Consentimiento en la creación de lead

**Decision**: El consentimiento se valida y registra en la misma transacción que crea el lead. Si falta consentimiento → rollback → 422.

**Rationale**: Arquitectura §7.4 exige validación en la misma transacción.

## R-002: Generación CSV para exportación

**Decision**: Generar CSV en memoria usando string template (sin librería externa). Columnas: lead data, notes, history, consents. Subir a R2 vía MediaService.

**Rationale**: Simple, sin dependencias. Para el volumen de datos de un lead, memoria es suficiente.

## R-003: Borrado en cascada

**Decision**: Transacción única con DELETE en orden: lead_read_marks → lead_notes → lead_history → consent_records → leads. Antes de borrar, INSERT en arsop_requests.

**Rationale**: Atomicidad. Si algo falla, todo rollback. El registro ARSOP va antes del borrado para garantizar trazabilidad.

## R-004: Integración con flujos existentes

**Decision**: 
- Formulario público: añadir checkbox consentimiento + validación Zod
- API pública: validar consentimiento en POST /api/v1/leads/institutional
- Backoffice: botones Export/Delete en detalle de lead (solo ADMIN)

**Rationale**: Reutilizar flujos existentes de F014.
