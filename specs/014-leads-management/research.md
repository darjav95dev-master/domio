# Research: Leads Management

**Feature**: F014 — Leads Management
**Date**: 2026-07-08

## R-001: LeadRepository — métodos necesarios

**Decision**: Crear `LeadRepository` extendiendo `TenantAwareRepository` con métodos: `findAll(filters, pagination)`, `findById(id)`, `updateStatus(id, newStatus, userId)`, `addNote(id, text, userId)`, `markAsRead(id, userId)`, `getUnreadCount(userId)`, `reassign(id, newAgentId)`, `exportCsv(filters, userId, role)`.

**Rationale**: Patrón repository ya establecido en F004/F011. Context-aware con SET LOCAL.

## R-002: Máquina de estados — validación

**Decision**: Validar transiciones en el repositorio (servidor) con un mapa de transiciones permitidas. Rechazar transiciones inválidas con error descriptivo.

**Rationale**: La verdad la tiene el servidor. El cliente puede mostrar solo las transiciones válidas como UX, pero la validación real es en el servicio.

**Transiciones permitidas**: NEW→CONTACTED, CONTACTED→IN_NEGOTIATION, IN_NEGOTIATION→WON, IN_NEGOTIATION→LOST.

## R-003: Reasignación con reset de marcas

**Decision**: En el mismo método `reassign`, dentro de la transacción: 1) actualizar `assigned_agent_id`, 2) borrar `lead_read_marks` del lead.

**Rationale**: Atomicidad — si falla el borrado de marcas, falla toda la reasignación. Regla §7.9 architecture.md.

## R-004: Exportación CSV

**Decision**: Server action que genera CSV en memoria y lo devuelve como Blob con header `Content-Disposition: attachment`. El repositorio filtra por scope (agente: solo sus leads; admin: todo el tenant).

**Rationale**: Simple, sin dependencias externas. Para volúmenes grandes se podría optimizar con streams, pero el MVP no lo necesita.
