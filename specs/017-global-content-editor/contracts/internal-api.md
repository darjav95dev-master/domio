# API Contracts: global-content-editor

**Date**: 2026-07-08 | **Feature**: 017-global-content-editor

## Overview

Esta feature expone endpoints internos (bajo `/api/internal/content/`) para la gestión de bloques de contenido global, configuración de contacto, e historial versionado. Todos los endpoints requieren autenticación mediante sesión de Auth.js y verificación de rol (ADMIN u OPERATOR).

**Nota**: Estos son endpoints internos consumidos por el backoffice (Server Components y server actions). No están expuestos en la API pública v1.

---

## Authentication & Authorization

**Método**: Session cookie (Auth.js v5)

**Headers requeridos**:
- `Cookie`: sesión válida de Auth.js

**Roles permitidos**: ADMIN, OPERATOR

**Respuesta de error de autorización**:
```json
{
  "error": "Forbidden",
  "message": "No tienes permiso para acceder a este recurso"
}
```
**Status**: 403

---

## Endpoints

### 1. GET /api/internal/content/blocks

**Propósito**: Listar bloques de contenido de una página específica.

**Query params**:
- `pageKey` (required): string — 'home' | 'sobre' | 'equipo' | 'aviso-legal' | 'privacidad' | 'cookies'

**Response** (200 OK):
```json
{
  "blocks": [
    {
      "id": "uuid",
      "pageKey": "home",
      "blockKey": "hero",
      "payload": {
        "claim": "Arquitectura que inspira",
        "lead": "Comercialización inmobiliaria con enfoque editorial",
        "ctaPrimary": "Ver portafolio",
        "ctaSecondary": "Contactar",
        "backgroundImageId": null
      },
      "updatedAt": "2026-07-08T10:00:00Z",
      "updatedBy": {
        "id": "uuid",
        "name": "Admin User"
      }
    }
  ]
}
```

**Errores**:
- 400: `pageKey` no proporcionado o inválido
- 403: Usuario no tiene rol ADMIN u OPERATOR
- 401: Sesión no válida o expirada

---

### 2. POST /api/internal/content/blocks

**Propósito**: Crear o actualizar un bloque de contenido (upsert).

**Request body**:
```json
{
  "pageKey": "home",
  "blockKey": "hero",
  "payload": {
    "claim": "Nuevo claim",
    "lead": "Nuevo lead",
    "ctaPrimary": "CTA primario",
    "ctaSecondary": "CTA secundario",
    "backgroundImageId": null
  }
}
```

**Validación**:
- `pageKey` debe ser uno de los valores permitidos
- `blockKey` debe ser válido para el `pageKey` dado
- `payload` debe validar contra el schema Zod específico para ese `blockKey`

**Response** (200 OK):
```json
{
  "block": {
    "id": "uuid",
    "pageKey": "home",
    "blockKey": "hero",
    "payload": { ... },
    "updatedAt": "2026-07-08T12:00:00Z",
    "updatedBy": {
      "id": "uuid",
      "name": "Admin User"
    }
  },
  "historyEntry": {
    "id": "uuid",
    "contentType": "block",
    "contentKey": "home:hero",
    "createdAt": "2026-07-08T12:00:00Z"
  }
}
```

**Errores**:
- 400: Payload inválido (detalles de validación Zod en `errors`)
- 403: Usuario no tiene rol ADMIN u OPERATOR
- 401: Sesión no válida o expirada

**Efectos secundarios**:
- Upsert en `content_blocks`
- Insert en `content_history` con `content_type='block'`, `content_key='${pageKey}:${blockKey}'`
- `revalidateTag('content:${pageKey}')`

---

### 3. GET /api/internal/content/contact

**Propósito**: Obtener la configuración de contacto global del tenant.

**Response** (200 OK):
```json
{
  "contact": {
    "phone": "+34 612 345 678",
    "email": "info@domio.test",
    "address": "Calle Ejemplo 123, Madrid",
    "hours": "Lunes a Viernes, 9:00 - 18:00",
    "whatsappNumber": "+34 612 345 678",
    "whatsappPrefilledMessage": "Hola, me gustaría recibir más información",
    "updatedAt": "2026-07-08T10:00:00Z",
    "updatedBy": {
      "id": "uuid",
      "name": "Admin User"
    }
  }
}
```

**Si no existe configuración**:
```json
{
  "contact": null
}
```

**Errores**:
- 403: Usuario no tiene rol ADMIN u OPERATOR
- 401: Sesión no válida o expirada

---

### 4. PUT /api/internal/content/contact

**Propósito**: Crear o actualizar la configuración de contacto global (upsert).

**Request body**:
```json
{
  "phone": "+34 612 345 678",
  "email": "info@domio.test",
  "address": "Calle Ejemplo 123, Madrid",
  "hours": "Lunes a Viernes, 9:00 - 18:00",
  "whatsappNumber": "+34 612 345 678",
  "whatsappPrefilledMessage": "Hola, me gustaría recibir más información"
}
```

**Validación**:
- `email` debe ser válido si está presente
- Campos nullable permiten configuración parcial

**Response** (200 OK):
```json
{
  "contact": {
    "phone": "+34 612 345 678",
    "email": "info@domio.test",
    "address": "Calle Ejemplo 123, Madrid",
    "hours": "Lunes a Viernes, 9:00 - 18:00",
    "whatsappNumber": "+34 612 345 678",
    "whatsappPrefilledMessage": "Hola, me gustaría recibir más información",
    "updatedAt": "2026-07-08T12:00:00Z",
    "updatedBy": {
      "id": "uuid",
      "name": "Admin User"
    }
  },
  "historyEntry": {
    "id": "uuid",
    "contentType": "contact",
    "contentKey": "global",
    "createdAt": "2026-07-08T12:00:00Z"
  }
}
```

**Errores**:
- 400: Payload inválido (detalles de validación Zod en `errors`)
- 403: Usuario no tiene rol ADMIN u OPERATOR
- 401: Sesión no válida o expirada

**Efectos secundarios**:
- Upsert en `contact_config`
- Insert en `content_history` con `content_type='contact'`, `content_key='global'`
- `revalidateTag('contact:global')` + `revalidateTag('layout:public')`

---

### 5. GET /api/internal/content/history

**Propósito**: Listar el historial de versiones de un contenido (bloque o configuración de contacto).

**Query params**:
- `contentType` (required): string — 'block' | 'contact'
- `contentKey` (required): string — Para bloques: `${pageKey}:${blockKey}`. Para contacto: 'global'
- `limit` (optional): number — máximo de entradas a devolver (default: 50)

**Response** (200 OK):
```json
{
  "history": [
    {
      "id": "uuid",
      "contentType": "block",
      "contentKey": "home:hero",
      "payloadSnapshot": {
        "claim": "Versión anterior",
        "lead": "Lead anterior",
        "ctaPrimary": "CTA anterior",
        "ctaSecondary": "CTA secundario anterior",
        "backgroundImageId": null
      },
      "createdAt": "2026-07-08T10:00:00Z",
      "updatedBy": {
        "id": "uuid",
        "name": "Admin User"
      }
    }
  ]
}
```

**Ordenamiento**: Por `created_at` DESC (más reciente primero)

**Errores**:
- 400: `contentType` o `contentKey` no proporcionados o inválidos
- 403: Usuario no tiene rol ADMIN u OPERATOR
- 401: Sesión no válida o expirada

---

### 6. POST /api/internal/content/revert

**Propósito**: Revertir un contenido (bloque o configuración de contacto) a una versión histórica específica.

**Request body**:
```json
{
  "historyId": "uuid"
}
```

**Validación**:
- `historyId` debe existir en `content_history` y pertenecer al tenant del contexto de sesión

**Response** (200 OK):
```json
{
  "reverted": true,
  "newHistoryEntry": {
    "id": "uuid",
    "contentType": "block",
    "contentKey": "home:hero",
    "createdAt": "2026-07-08T13:00:00Z"
  }
}
```

**Errores**:
- 404: `historyId` no encontrado o no pertenece al tenant
- 403: Usuario no tiene rol ADMIN u OPERATOR
- 401: Sesión no válida o expirada

**Efectos secundarios**:
- Lee la versión histórica de `content_history`
- Si `content_type === 'block'`: actualiza `content_blocks` con el `payload_snapshot`
- Si `content_type === 'contact'`: actualiza `contact_config` con el `payload_snapshot`
- Insert en `content_history` (nueva entrada con el payload revertido)
- `revalidateTag` correspondiente

---

## Error Response Format

Todos los errores siguen el formato:
```json
{
  "error": "ErrorCode",
  "message": "Descripción legible del error",
  "details": { ... }  // Opcional, para errores de validación
}
```

**Ejemplo de error de validación Zod**:
```json
{
  "error": "ValidationError",
  "message": "El payload no es válido",
  "details": {
    "fieldErrors": {
      "claim": ["El claim es obligatorio"],
      "lead": ["El lead debe tener al menos 10 caracteres"]
    }
  }
}
```

---

## Rate Limiting

Estos endpoints internos no están sujetos a rate limiting específico (solo el rate limiting global de la aplicación aplica). La autenticación por sesión y la verificación de rol son la principal línea de defensa.

---

## Idempotency

- **GET**: Idempotente por definición
- **POST /blocks**: No es idempotente; cada llamada crea una nueva entrada en el historial
- **PUT /contact**: No es idempotente; cada llamada crea una nueva entrada en el historial
- **POST /revert**: No es idempotente; cada llamada crea una nueva entrada en el historial

---

## Versioning

Estos endpoints son internos y no están versionados en la URL (no hay `/v1/` en la ruta). Si se introducen cambios breaking en el futuro, se seguirá el patrón de la API pública v1 (`/api/v1/...`).
