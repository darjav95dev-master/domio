# Data Model: backoffice-shell

**Feature**: 010-backoffice-shell
**Date**: 2026-07-08

## Entidades

### NavItem (configuración de navegación)

Representa un item del sidebar del backoffice.

| Campo        | Tipo                  | Descripción                                        |
|--------------|-----------------------|----------------------------------------------------|
| `label`      | `string`              | Etiqueta visible (ej. "Dashboard", "Catálogo")     |
| `href`       | `string`              | Ruta de navegación (ej. "/panel", "/panel/catalogo") |
| `icon`       | `PhosphorIcon`        | Icono de Phosphor (ej. `HouseIcon`, `FolderIcon`)  |
| `allowedRoles` | `UserRole[]`        | Roles que pueden ver este item                     |
| `badgeKey`   | `"unread-leads" \| null` | Clave para badge dinámico (solo Leads tiene)    |

**Relaciones**: No es una entidad de BD. Es una constante de configuración en `src/features/backoffice/constants/nav-items.ts`.

**Validación**: `allowedRoles` debe ser un subconjunto no vacío de `USER_ROLES`. `href` debe empezar con `/panel`.

### UnreadCountResponse

Respuesta del endpoint `GET /api/internal/leads/unread-count`.

| Campo   | Tipo     | Descripción                                     |
|---------|----------|-------------------------------------------------|
| `count` | `number` | Número de leads no leídos para el usuario actual |

**Relaciones**: Consulta la tabla `lead_read_marks` para calcular el conteo.

### DashboardData

Datos agregados para el dashboard.

| Campo                | Tipo               | Descripción                                    |
|----------------------|--------------------|------------------------------------------------|
| `unreadLeadsCount`   | `number`           | Leads no leídos del usuario                    |
| `recentPromociones`  | `RecentPromocion[]`| Últimas 5 promociones editadas por el usuario  |
| `user`               | `{ name, role }`   | Datos del usuario autenticado                  |

### RecentPromocion

Resumen de promoción para el dashboard.

| Campo        | Tipo     | Descripción                                   |
|--------------|----------|-----------------------------------------------|
| `id`         | `string` | UUID de la promoción                          |
| `name`       | `string` | Nombre de la promoción                        |
| `status`     | `string` | Estado actual (DRAFT, PUBLISHED, etc.)        |
| `updatedAt`  | `string` | Fecha de última modificación (ISO 8601)       |

**Relaciones**: Consulta la tabla `promociones` filtrando por `assigned_agent_id = user_id` u `updated_by = user_id`.

## Consultas

### Unread count

```sql
SELECT COUNT(*)
FROM leads l
LEFT JOIN lead_read_marks lrm 
  ON lrm.lead_id = l.id AND lrm.user_id = :userId
WHERE l.tenant_id = :tenantId
  AND l.assigned_agent_id = :userId
  AND lrm.read_at IS NULL
  AND l.status IN ('NEW', 'CONTACTED', 'IN_NEGOTIATION')
```

### Recent promociones

```sql
SELECT id, name, status, updated_at
FROM promociones
WHERE tenant_id = :tenantId
  AND updated_by = :userId
ORDER BY updated_at DESC
LIMIT 5
```

## State Transitions

No aplica — esta feature no introduce nuevas entidades con estados. Solo consume entidades existentes (`leads`, `lead_read_marks`, `promociones`, `users`).
