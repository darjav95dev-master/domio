# Research: Team and API Keys

**Feature**: F016

## R-001: Invitación por email

**Decision**: Al crear usuario, INSERT en email_queue con template 'team-invitation' y token firmado con TTL 48h.

## R-002: Hash de API keys

**Decision**: bcrypt con salt rounds 12. La clave en claro se genera con crypto.randomBytes(32).toString('hex').

## R-003: Soft-delete

**Decision**: UPDATE is_active = false. No se borra el registro. Las FK references siguen válidas.

## R-004: Rate limit por key

**Decision**: Campo rate_limit_per_min en api_keys. El middleware de API (F024) lo consumirá. Esta feature solo gestiona el CRUD del campo.
