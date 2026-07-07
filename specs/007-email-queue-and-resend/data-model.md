# Data Model: email-queue-and-resend

**Date**: 2026-07-08 | **Feature**: F007

## Existing Entities (from F002)

### EmailQueue (tabla `email_queue`)

Ya existente en el schema Drizzle (`src/infrastructure/db/schema/email-queue.ts`).

| Campo         | Tipo       | Nullable | Default   | Descripción |
|---------------|------------|----------|-----------|-------------|
| `id`          | uuid       | NO       | gen_random_uuid() | Identificador único de la fila |
| `to_email`    | text       | NO       | —         | Dirección de email del destinatario |
| `template`    | text       | NO       | —         | Nombre del template a renderizar |
| `payload`     | jsonb      | YES      | `{}`      | Variables para el template |
| `status`      | email_status | NO     | 'PENDING' | Estado: PENDING / SENT / FAILED |
| `attempts`    | integer    | NO       | 0         | Número de intentos de envío |
| `next_attempt_at` | timestamptz | YES | —        | Próximo momento de intento (null = inmediato) |
| `last_error`  | text       | YES      | —         | Mensaje del último error |
| `created_at`  | timestamptz | NO      | now()     | Momento de creación |
| `sent_at`     | timestamptz | YES     | —         | Momento de envío exitoso |

**Índice**: `(status, next_attempt_at)` — sirve al worker para encontrar filas elegibles.

**Nota de diseño**: Esta tabla NO lleva `tenant_id` ni RLS. Es tabla de infraestructura operativa (como un log de sistema). Ver comentario en `email-queue.ts` línea 12 y architecture.md §6.5.

## New Entities (F007 — código, no BD)

### EmailTemplate (interfaz de código)

No es una tabla. Es una interfaz TypeScript que define el contrato de un template.

```typescript
interface EmailTemplate<TPayload extends z.ZodType> {
  name: string;                    // identificador único (ej: "lead-assigned-agent")
  payloadSchema: TPayload;         // schema Zod para validar el payload
  render: (payload: z.infer<TPayload>) => {
    subject: string;
    html: string;
    text: string;
  };
}
```

### EmailService (interfaz de código)

Servicio de encolado. No es una tabla.

```typescript
interface EmailService {
  enqueue(input: {
    toEmail: string;
    template: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
  // Se invoca dentro de una transacción existente del recurso de origen
}
```

### ResendClient (interfaz de código)

Cliente del proveedor de email. No es una tabla.

```typescript
interface ResendClient {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ id: string }>;
}
```

## State Transitions

```
                    enqueue()
    ┌──────────────────────────────┐
    │                              ▼
┌─────────┐    worker éxito    ┌──────┐
│ PENDING │ ──────────────────► │ SENT │
└─────────┘                     └──────┘
    │  ▲
    │  │  worker fallo (attempts < 5)
    │  └── next_attempt_at recalculado
    │
    │  worker fallo (attempts = 5)
    ▼
┌────────┐
│ FAILED │
└────────┘
```

**Transiciones válidas**:
- `PENDING → SENT` (worker: envío exitoso)
- `PENDING → PENDING` (worker: envío fallido, attempts < 5, backoff)
- `PENDING → FAILED` (worker: envío fallido, attempts = 5)

**Transiciones inválidas** (el sistema nunca las produce):
- `SENT → *` (terminal)
- `FAILED → *` (terminal)

## Validation Rules

### Al encolar (EmailService.enqueue)
- `toEmail`: string no vacío, formato email válido (Zod `z.string().email()`)
- `template`: string no vacío, debe corresponder a un template registrado
- `payload`: debe validar contra el schema Zod del template indicado

### Al procesar (Worker)
- Solo filas con `status = 'PENDING'` y `next_attempt_at <= now()` (o null)
- Tras fallo: `attempts += 1`, `last_error = mensaje`, `next_attempt_at = now() + 2^attempts × 60s`
- Si `attempts >= 5` tras incremento: `status = 'FAILED'`
- Tras éxito: `status = 'SENT'`, `sent_at = now()`, `attempts += 1`

## Constants (src/shared/constants/email-templates.ts)

```typescript
export const EMAIL_TEMPLATE_NAMES = {
  LEAD_ASSIGNED_AGENT: "lead-assigned-agent",
  LEAD_CONFIRMATION: "lead-confirmation",
  TEAM_INVITATION: "team-invitation",
  PASSWORD_RECOVERY: "password-recovery",
} as const;

export type EmailTemplateNames = typeof EMAIL_TEMPLATE_NAMES[keyof typeof EMAIL_TEMPLATE_NAMES];
```

Cada template tiene su schema Zod de payload asociado en el mismo archivo.
