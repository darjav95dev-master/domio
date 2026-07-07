# Contract: Email Service Interface

**Date**: 2026-07-08 | **Feature**: F007

## EmailService (servicio de encolado)

El servicio de encolado es la única interfaz que los servicios de negocio (lead creation, user invitation, password recovery) usan para notificar por email. Nunca invocan a Resend directamente.

### Método: `enqueue`

```typescript
interface EnqueueInput {
  toEmail: string;       // email válido del destinatario
  template: EmailTemplateNames;  // nombre del template registrado
  payload: Record<string, unknown>;  // variables del template (validadas contra schema Zod del template)
}

interface EmailService {
  enqueue(input: EnqueueInput): Promise<void>;
}
```

**Comportamiento**:
- Valida `toEmail` con `z.string().email()`
- Valida que `template` existe en el registry de templates
- Valida que `payload` cumple el schema Zod del template
- Inserta una fila en `email_queue` con `status = PENDING`, `attempts = 0`, `next_attempt_at = now()`
- Se diseña para ser invocado dentro de una transacción existente (recibe el transaction handle)
- Si la validación falla, lanza error descriptivo sin insertar fila
- Si la inserción falla, la transacción del recurso de origen se revierte (comportamiento transaccional estándar)

**Errores**:
- `ValidationError`: payload o email inválido
- `TemplateNotFoundError`: template no registrado
- `DatabaseError`: error de BD (se propaga)

---

## ResendClient (cliente del proveedor)

El cliente encapsula la comunicación con la API de Resend. El worker lo usa para enviar emails.

### Método: `send`

```typescript
interface SendInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;  // opcional, default: noreply@domio.com (configurable por env var)
}

interface SendResult {
  id: string;  // ID del email en Resend
}

interface ResendClient {
  send(input: SendInput): Promise<SendResult>;
}
```

**Comportamiento**:
- Invoca `resend.emails.send()` con los parámetros proporcionados
- Si Resend responde con éxito, devuelve el ID del email
- Si Resend responde con error, lanza un `EmailProviderError` con el mensaje de Resend
- El worker captura este error para registrar en `last_error` y aplicar backoff

**Errores**:
- `EmailProviderError`: error de Resend (timeout, rate limit, email inválido, etc.)
- `ConfigurationError`: `RESEND_API_KEY` no configurada

---

## EmailTemplate (contrato de template)

Cada template es una función pura que recibe un payload validado y devuelve el contenido del email.

```typescript
interface EmailTemplateContent {
  subject: string;
  html: string;
  text: string;
}

interface EmailTemplate<TPayload> {
  name: EmailTemplateNames;
  payloadSchema: z.ZodType<TPayload>;
  render(payload: TPayload): EmailTemplateContent;
}
```

### Templates registrados

#### `lead-assigned-agent`

Payload:
```typescript
{
  agentName: string;       // nombre del agente destinatario
  leadName: string;        // nombre del lead
  promotionName: string;   // nombre de la promoción
  backofficeUrl: string;   // URL al lead en el backoffice
}
```

#### `lead-confirmation`

Payload:
```typescript
{
  leadName: string;        // nombre del lead destinatario
  promotionName: string;   // nombre de la promoción
  contactEmail: string;    // email de contacto de Domio
}
```

#### `team-invitation`

Payload:
```typescript
{
  inviteeName: string;     // nombre del invitado
  role: string;            // rol asignado (ADMIN/OPERATOR/AGENT)
  setupPasswordUrl: string; // URL de establecimiento de contraseña
}
```

#### `password-recovery`

Payload:
```typescript
{
  userName: string;        // nombre del usuario
  resetUrl: string;        // URL con token de reset (TTL 30 min)
  expiryMinutes: number;   // minutos hasta caducidad del token
}
```

---

## Worker (contrato de procesamiento)

### Input (desde script standalone o cron trigger)

El worker no recibe parámetros de entrada significativos. Toma su configuración de variables de entorno:
- `DATABASE_URL` — conexión a BD
- `RESEND_API_KEY` — clave de API de Resend

### Output (resultado de ejecución)

```typescript
interface WorkerResult {
  processed: number;   // total de filas procesadas
  sent: number;        // emails enviados con éxito
  failed: number;      // emails que alcanzaron 5 intentos (marcados FAILED)
  retried: number;     // emails que fallaron pero se reintentarán
}
```

### Comportamiento

1. Conecta a BD
2. Reclama hasta 10 filas PENDING con `next_attempt_at <= now()` usando `FOR UPDATE SKIP LOCKED`
3. Para cada fila: renderiza template, invoca Resend, actualiza estado
4. Retorna `WorkerResult`
5. En modo standalone: repite cada 30s (configurable). Responde a SIGTERM.
