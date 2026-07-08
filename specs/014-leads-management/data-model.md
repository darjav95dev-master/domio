# Data Model: Leads Management

**Feature**: F014 — Leads Management
**Date**: 2026-07-08

## Existing Entities (no changes to schema)

### leads (ya existe desde F002)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| name | text | |
| email | text | |
| phone | text | |
| message | text | |
| status | lead_status | NEW/CONTACTED/IN_NEGOTIATION/WON/LOST |
| source | lead_source | commercial/institutional |
| channel | lead_channel | FORM/WHATSAPP |
| promocion_id | uuid | FK → promociones (nullable) |
| assigned_agent_id | uuid | FK → users (nullable) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### lead_notes (ya existe desde F002)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| lead_id | uuid | FK → leads CASCADE |
| author_id | uuid | FK → users |
| text | text | |
| created_at | timestamptz | |

### lead_history (ya existe desde F002)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK |
| tenant_id | uuid | FK → tenants |
| lead_id | uuid | FK → leads CASCADE |
| previous_status | lead_status | |
| new_status | lead_status | |
| author_id | uuid | FK → users |
| created_at | timestamptz | |

RLS: solo INSERT y SELECT (inmutable).

### lead_read_marks (ya existe desde F002)

| Campo | Tipo | Notas |
|-------|------|-------|
| lead_id | uuid | FK → leads CASCADE |
| user_id | uuid | FK → users |
| read_at | timestamptz | |

PK compuesta: (lead_id, user_id).

## LeadRepository Methods (new)

| Método | Descripción |
|--------|-------------|
| `findAll(filters, pagination)` | Listado con filtros y paginación |
| `findById(id)` | Detalle de lead |
| `updateStatus(id, newStatus, userId)` | Cambiar estado + registrar en histórico |
| `addNote(id, text, userId)` | Añadir nota interna |
| `markAsRead(id, userId)` | Insertar/actualizar lead_read_marks |
| `getUnreadCount(userId)` | Contar leads no leídos para el usuario |
| `reassign(id, newAgentId)` | Reasignar + borrar marcas de leído |
| `exportCsv(filters, userId, role)` | Exportar con scope por rol |

## State Transitions

```
NEW → CONTACTED → IN_NEGOTIATION → WON
                                  → LOST
```

Transiciones válidas como mapa:
```
NEW: [CONTACTED]
CONTACTED: [IN_NEGOTIATION]
IN_NEGOTIATION: [WON, LOST]
WON: []
LOST: []
```
