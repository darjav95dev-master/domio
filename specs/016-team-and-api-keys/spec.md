# Feature Specification: Team and API Keys

**Feature Branch**: `feature/016-team-and-api-keys`
**Created**: 2026-07-08
**Status**: Draft

**Input**: User description: "Gestión de equipo (CRUD usuarios, roles, invitación email, soft-delete) y gestión de API keys (crear con hash, revocar, rate limit) — solo ADMIN."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestión de equipo (Priority: P1)

El administrador puede crear, editar, desactivar y listar usuarios del tenant. Al crear un usuario, se envía un email de invitación con enlace de establecimiento de contraseña. La desactivación es soft-delete (is_active = false) que preserva el histórico.

**Acceptance Scenarios**:
1. **Given** ADMIN, **When** crea usuario con email y rol, **Then** se encola email de invitación.
2. **Given** usuario desactivado, **When** se consulta histórico, **Then** sus asignaciones siguen visibles.
3. **Given** ADMIN, **When** lista usuarios, **Then** ve todos con filtros por rol y estado.
4. **Given** no-ADMIN, **When** intenta acceder, **Then** denegado.

### User Story 2 - Gestión de API keys (Priority: P1)

El administrador puede crear, revocar y listar API keys. Al crear, se genera clave aleatoria, se hashea, y se muestra una sola vez. La revocación deshabilita inmediatamente.

**Acceptance Scenarios**:
1. **Given** ADMIN, **When** crea API key, **Then** se muestra clave en claro una vez y se almacena hash.
2. **Given** API key revocada, **When** se usa para autenticar, **Then** rechazada.
3. **Given** ADMIN, **When** lista keys, **Then** ve estado, last_used_at, rate_limit.
4. **Given** no-ADMIN, **When** intenta acceder, **Then** denegado.

### Edge Cases
- ¿ADMIN se desactiva a sí mismo? Permitido pero con warning.
- ¿Email de invitación expira? TTL corto, se puede reenviar.

## Requirements

- **FR-001**: CRUD de usuarios (solo ADMIN) con email + rol.
- **FR-002**: Email de invitación encolado al crear usuario.
- **FR-003**: Soft-delete preserva histórico.
- **FR-004**: Crear API key con hash, mostrar clave una vez.
- **FR-005**: Revocar API key (is_active = false).
- **FR-006**: Rate limit configurable por key.
- **FR-007**: Listado de usuarios con filtros.
- **FR-008**: Listado de API keys con estado.

## Success Criteria

- **SC-001**: Crear usuario encola email — verificable con test.
- **SC-002**: Soft-delete no rompe histórico — verificable con test.
- **SC-003**: API key en claro no recuperable tras creación.
- **SC-004**: Key revocada rechazada inmediatamente.

## Assumptions

- Tablas `users` y `api_keys` existen (F002).
- Email queue funcional (F007).
- Auth.js con JWT y roles (F005).
- Backoffice shell con routing por rol (F010).
