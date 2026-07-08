# Data Model: global-content-editor

**Date**: 2026-07-08 | **Feature**: 017-global-content-editor

## Overview

Esta feature utiliza tres tablas existentes en el schema de base de datos: `content_blocks`, `contact_config`, y `content_history`. No se crean nuevas tablas; la feature implementa la lógica de negocio (repositorios, servicios, validación) sobre estas tablas.

## Entities

### 1. ContentBlock (tabla: `content_blocks`)

**Propósito**: Almacena bloques de contenido editorial para páginas globales del tenant.

**Campos**:
- `id` (uuid, PK, defaultRandom)
- `tenant_id` (uuid, FK → tenants.id, NOT NULL) — aislamiento multi-tenant
- `page_key` (text, NOT NULL) — identificador de página: 'home' | 'sobre' | 'equipo' | 'aviso-legal' | 'privacidad' | 'cookies'
- `block_key` (text, NOT NULL) — identificador de bloque dentro de la página: 'hero' | 'como-trabajamos' | 'sobre' | 'portafolio-destacado' | 'confianza' | 'cta-final' | 'faq' | 'cuerpo' | 'miembros' | 'contenido'
- `payload` (jsonb, default {}) — contenido estructurado validado con Zod según block_key
- `updated_by` (uuid, FK → users.id, ON DELETE SET NULL) — usuario que modificó por última vez
- `updated_at` (timestamp with timezone, NOT NULL, defaultNow)

**Índices**:
- `content_blocks_tenant_page_block_idx` (tenant_id, page_key, block_key) — consulta rápida por tenant + página + bloque
- RLS policy: `tenantIsolationPolicy("content_blocks")` — filtrado por `app.current_tenant_id`

**Constraints**:
- UNIQUE (tenant_id, page_key, block_key) — un solo bloque por combinación página+bloque por tenant
- payload debe validar contra schema Zod específico según block_key

**Relaciones**:
- Muchos ContentBlocks pertenecen a un Tenant (FK tenant_id)
- Muchos ContentBlocks son actualizados por un User (FK updated_by, nullable)
- Un ContentBlock tiene muchas entradas en ContentHistory (por content_type='block' + content_key=page_key:block_key)

**Validación Zod por block_key**:

```typescript
// home/hero
const heroBlockSchema = z.object({
  claim: z.string().min(1).max(200),
  lead: z.string().min(1).max(500),
  ctaPrimary: z.string().min(1).max(100),
  ctaSecondary: z.string().min(1).max(100),
  backgroundImageId: z.string().uuid().nullable(),
});

// home/como-trabajamos
const comoTrabajamosBlockSchema = z.object({
  items: z.array(z.object({
    titulo: z.string().min(1).max(100),
    descripcion: z.string().min(1).max(300),
    icono: z.string().min(1).max(50),
  })).min(1).max(8),
});

// home/sobre
const sobreHomeBlockSchema = z.object({
  texto: z.string().min(1).max(1000),
  imagenId: z.string().uuid().nullable(),
});

// home/portafolio-destacado
const portafolioDestacadoBlockSchema = z.object({
  titulo: z.string().min(1).max(100),
  descripcion: z.string().min(1).max(300),
});

// home/confianza
const confianzaBlockSchema = z.object({
  metricas: z.array(z.object({
    valor: z.string().min(1).max(50),
    etiqueta: z.string().min(1).max(100),
  })).min(1).max(8),
  testimonios: z.array(z.object({
    texto: z.string().min(1).max(500),
    autor: z.string().min(1).max(100),
  })).min(0).max(6),
});

// home/cta-final
const ctaFinalBlockSchema = z.object({
  titulo: z.string().min(1).max(150),
  texto: z.string().min(1).max(400),
  botonTexto: z.string().min(1).max(50),
});

// home/faq
const faqBlockSchema = z.object({
  items: z.array(z.object({
    pregunta: z.string().min(1).max(200),
    respuesta: z.string().min(1).max(1000),
  })).min(1).max(12),
});

// sobre/hero
const sobreHeroBlockSchema = z.object({
  titulo: z.string().min(1).max(100),
  lead: z.string().min(1).max(300),
});

// sobre/cuerpo
const sobreCuerpoBlockSchema = z.object({
  parrafos: z.array(z.string().min(1).max(1000)).min(1).max(20),
});

// equipo/hero
const equipoHeroBlockSchema = z.object({
  titulo: z.string().min(1).max(100),
  lead: z.string().min(1).max(300),
});

// equipo/miembros
const equipoMiembrosBlockSchema = z.object({
  items: z.array(z.object({
    nombre: z.string().min(1).max(100),
    rol: z.string().min(1).max(100),
    bio: z.string().min(1).max(500),
    avatarId: z.string().uuid().nullable(),
  })).min(0).max(20),
});

// aviso-legal/contenido, privacidad/contenido, cookies/contenido
const legalContentBlockSchema = z.object({
  titulo: z.string().min(1).max(100),
  secciones: z.array(z.object({
    titulo: z.string().min(1).max(100),
    contenido: z.string().min(1).max(5000),
  })).min(1).max(20),
});
```

---

### 2. ContactConfig (tabla: `contact_config`)

**Propósito**: Almacena la configuración de contacto global del tenant (una fila por tenant).

**Campos**:
- `tenant_id` (uuid, PK, FK → tenants.id) — también es la PK, garantiza una fila por tenant
- `phone` (text, nullable)
- `email` (text, nullable)
- `address` (text, nullable)
- `hours` (text, nullable)
- `whatsapp_number` (text, nullable)
- `whatsapp_prefilled_message` (text, nullable)
- `updated_by` (uuid, FK → users.id, ON DELETE SET NULL)
- `updated_at` (timestamp with timezone, NOT NULL, defaultNow)

**Índices**:
- PK en tenant_id (implícito)
- RLS policy: `tenantIsolationPolicy("contact_config")`

**Constraints**:
- Una sola fila por tenant (PK en tenant_id)
- Campos nullable para permitir configuración parcial

**Relaciones**:
- Un ContactConfig pertenece a un Tenant (FK tenant_id)
- Un ContactConfig es actualizado por un User (FK updated_by, nullable)
- Un ContactConfig tiene muchas entradas en ContentHistory (por content_type='contact' + content_key='global')

**Validación Zod**:

```typescript
const contactConfigSchema = z.object({
  phone: z.string().min(1).max(50).nullable(),
  email: z.string().email().max(255).nullable(),
  address: z.string().min(1).max(500).nullable(),
  hours: z.string().min(1).max(200).nullable(),
  whatsappNumber: z.string().min(1).max(50).nullable(),
  whatsappPrefilledMessage: z.string().min(1).max(500).nullable(),
});
```

---

### 3. ContentHistory (tabla: `content_history`)

**Propósito**: Almacena el historial versionado de cambios en bloques de contenido y configuración de contacto. Tabla inmutable (RLS impide UPDATE/DELETE).

**Campos**:
- `id` (uuid, PK, defaultRandom)
- `tenant_id` (uuid, FK → tenants.id, NOT NULL)
- `content_type` (text, NOT NULL) — 'block' | 'contact'
- `content_key` (text, NOT NULL) — Para bloques: `${page_key}:${block_key}`. Para contacto: 'global'
- `payload_snapshot` (jsonb, default {}) — snapshot completo del payload en ese momento
- `updated_by` (uuid, FK → users.id, ON DELETE SET NULL) — usuario que realizó el cambio
- `created_at` (timestamp with timezone, NOT NULL, defaultNow)

**Índices**:
- `content_history_tenant_type_key_idx` (tenant_id, content_type, content_key) — consulta rápida de historial por tenant + tipo + clave
- RLS policy: `tenantIsolationPolicy("content_history")`

**Constraints**:
- Inmutable: políticas RLS impiden UPDATE y DELETE incluso desde el rol de aplicación
- Cada cambio (edición o revert) genera una nueva entrada

**Relaciones**:
- Muchas entradas de ContentHistory pertenecen a un Tenant (FK tenant_id)
- Muchas entradas de ContentHistory son creadas por un User (FK updated_by, nullable)
- Una entrada de ContentHistory referencia un ContentBlock o ContactConfig (por content_type + content_key)

---

## State Transitions

No hay máquina de estados explícita en esta feature. Los bloques de contenido y la configuración de contacto se crean, actualizan y revierten sin restricciones de estado. El historial es inmutable y solo permite INSERT.

**Flujos de datos**:

1. **Crear/Actualizar bloque**:
   - Usuario envía formulario → Server action valida con Zod → Upsert en `content_blocks` → Insert en `content_history` → `revalidateTag('content:${page_key}')` → Toast de confirmación

2. **Crear/Actualizar configuración de contacto**:
   - Usuario envía formulario → Server action valida con Zod → Upsert en `contact_config` → Insert en `content_history` → `revalidateTag('contact:global')` + `revalidateTag('layout:public')` → Toast de confirmación

3. **Revertir a versión histórica**:
   - Usuario selecciona versión → Server action lee `content_history` → Actualiza `content_blocks` o `contact_config` con el snapshot → Insert en `content_history` (nueva entrada) → `revalidateTag` correspondiente → Toast de confirmación

---

## Validation Rules

**ContentBlock**:
- `page_key` debe ser uno de: 'home' | 'sobre' | 'equipo' | 'aviso-legal' | 'privacidad' | 'cookies'
- `block_key` debe ser válido para el `page_key` dado (mapeo definido en research.md)
- `payload` debe validar contra el schema Zod específico para ese `block_key`
- `tenant_id` debe coincidir con el tenant del contexto de sesión

**ContactConfig**:
- `email` debe ser válido si está presente (z.string().email())
- `tenant_id` debe coincidir con el tenant del contexto de sesión
- Campos nullable permiten configuración parcial

**ContentHistory**:
- `content_type` debe ser 'block' o 'contact'
- `content_key` debe tener formato `${page_key}:${block_key}` para bloques, o 'global' para contacto
- `payload_snapshot` es un snapshot completo; no se valida contra Zod (es histórico)

---

## Query Patterns

**Consultas típicas**:

1. **Listar bloques de una página**:
   ```sql
   SELECT * FROM content_blocks WHERE tenant_id = $1 AND page_key = $2
   ```

2. **Obtener un bloque específico**:
   ```sql
   SELECT * FROM content_blocks WHERE tenant_id = $1 AND page_key = $2 AND block_key = $3
   ```

3. **Obtener configuración de contacto**:
   ```sql
   SELECT * FROM contact_config WHERE tenant_id = $1
   ```

4. **Listar historial de un bloque**:
   ```sql
   SELECT * FROM content_history WHERE tenant_id = $1 AND content_type = 'block' AND content_key = $2 ORDER BY created_at DESC
   ```

5. **Listar historial de configuración de contacto**:
   ```sql
   SELECT * FROM content_history WHERE tenant_id = $1 AND content_type = 'contact' AND content_key = 'global' ORDER BY created_at DESC
   ```

6. **Obtener una versión histórica específica**:
   ```sql
   SELECT * FROM content_history WHERE tenant_id = $1 AND id = $2
   ```

Todas las consultas usan `SET LOCAL app.tenant_id` en transacción y se benefician de RLS.
