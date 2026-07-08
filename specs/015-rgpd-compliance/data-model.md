# Data Model: RGPD Compliance

**Feature**: F015 — RGPD Compliance
**Date**: 2026-07-08

## Existing Entities

### consent_records (F002)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| lead_id | uuid | FK → leads CASCADE |
| legal_basis | text | |
| text_accepted | text | |
| ip | text | |
| user_agent | text | |
| created_at | timestamptz | |

RLS: solo INSERT + SELECT (inmutable).

### arsop_requests (F002)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| lead_id | uuid | FK → leads (nullable si lead borrado) |
| request_type | text | EXPORT / DELETE |
| executed_by | uuid | FK → users |
| executed_at | timestamptz | |
| result_asset_id | uuid | FK → media_assets (nullable) |

RLS: solo INSERT + SELECT (inmutable).

## New Repositories

### ConsentRepository

| Método | Descripción |
|--------|-------------|
| `create(leadId, legalBasis, textAccepted, ip, userAgent)` | INSERT consent_record |
| `findByLeadId(leadId)` | SELECT por lead |

### ArsopRepository

| Método | Descripción |
|--------|-------------|
| `exportLead(leadId, userId)` | Genera CSV, sube a R2, INSERT arsop_requests |
| `deleteLead(leadId, userId)` | DELETE cascada + INSERT arsop_requests |

## Cascade Delete Order

```
1. DELETE FROM lead_read_marks WHERE lead_id = ?
2. DELETE FROM lead_notes WHERE lead_id = ?
3. DELETE FROM lead_history WHERE lead_id = ?
4. DELETE FROM consent_records WHERE lead_id = ?
5. DELETE FROM leads WHERE id = ?
```

Todo en una transacción con SET LOCAL.
