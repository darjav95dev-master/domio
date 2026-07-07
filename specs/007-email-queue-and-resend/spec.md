# Feature Specification: email-queue-and-resend

**Feature Branch**: `feature/007-email-queue-and-resend`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Implementar el sistema de cola de emails persistente con cliente Resend, worker de procesamiento con backoff exponencial y templates transaccionales para notificaciones de Domio."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Encolado resiliente de emails (Priority: P1)

Un servicio de negocio (por ejemplo, creación de lead, invitación de usuario, recuperación de contraseña) necesita notificar por email a uno o más destinatarios. En lugar de invocar directamente al proveedor de email, el servicio encola la notificación en la tabla `email_queue` dentro de la misma transacción que persiste el recurso de origen. Si el proveedor de email está caído en ese instante, el recurso de origen se persiste igualmente y la notificación queda pendiente de envío diferido.

**Why this priority**: Es la regla arquitectónica fundamental de esta feature (constitution §11.3, architecture §7.13). Sin encolado resiliente, la caída de Resend bloquea la creación de leads, lo cual viola la regla de producto §6.19 de resiliencia entre subsistemas.

**Independent Test**: Se puede probar invocando el servicio de encolado con un proveedor de email mockeado a lanzar excepción, verificando que la fila se persiste en `email_queue` con estado PENDING y que la transacción no se revierte.

**Acceptance Scenarios**:

1. **Given** un servicio de negocio que necesita enviar un email transaccional, **When** invoca el servicio de encolado con destinatario, template y payload válidos, **Then** se crea una fila en `email_queue` con `status = PENDING`, `attempts = 0`, `next_attempt_at` igual al momento actual, y los datos del template y payload correctamente almacenados.
2. **Given** el servicio de encolado, **When** se invoca dentro de una transacción que también persiste un recurso de origen (lead, usuario, etc.), **Then** ambas operaciones (recurso + fila de cola) se confirman en la misma transacción atómicamente.
3. **Given** un intento de encolado, **When** faltan campos obligatorios (destinatario, template), **Then** el servicio rechaza la operación con error de validación claro y no crea ninguna fila.

---

### User Story 2 - Procesamiento de la cola por el worker (Priority: P1)

El worker de emails procesa la cola `email_queue` recogiendo los registros con `status = PENDING` cuyo `next_attempt_at` es anterior al momento actual. Para cada registro, invoca al proveedor de email (Resend) con el template y payload correspondientes. Si el envío tiene éxito, marca la fila como `status = SENT` con `sent_at` igual al momento actual. Si falla, incrementa `attempts`, registra el error en `last_error`, calcula el siguiente intento con backoff exponencial, y deja la fila como `PENDING`. Tras 5 intentos fallidos, marca la fila como `status = FAILED` sin reintentar más.

**Why this priority**: Es el mecanismo que garantiza que los emails eventualmente se envían despite fallos transitorios del proveedor. Sin worker, la cola se acumula sin procesarse.

**Independent Test**: Se puede probar arrancando el worker con filas PENDING en la cola y un proveedor de email mockeado, verificando transiciones de estado correctas tras éxito y tras fallo.

**Acceptance Scenarios**:

1. **Given** una fila en `email_queue` con `status = PENDING` y `next_attempt_at` en el pasado, **When** el worker la procesa y el envío es exitoso, **Then** la fila queda con `status = SENT`, `sent_at` con timestamp actual, y `attempts` incrementado en 1.
2. **Given** una fila con `status = PENDING` y `attempts = 0`, **When** el worker la procesa y el envío falla, **Then** la fila queda con `attempts = 1`, `last_error` con el mensaje de error, `next_attempt_at` calculado con backoff exponencial (2^1 × 60 = 120 segundos desde ahora), y `status` sigue `PENDING`.
3. **Given** una fila con `attempts = 4` (quinto intento), **When** el worker la procesa y el envío falla, **Then** la fila queda con `status = FAILED`, `attempts = 5`, `last_error` con el mensaje del error definitivo, y no se reintentará más.
4. **Given** varias filas PENDING con distintos `next_attempt_at`, **When** el worker arranca, **Then** procesa primero las que tienen `next_attempt_at` más antiguo y solo procesa las cuyo `next_attempt_at` ya ha llegado.

---

### User Story 3 - Templates transaccionales (Priority: P2)

El sistema dispone de cuatro templates de email transaccional que el servicio de encolado puede referenciar por nombre. Cada template tiene un schema de payload definido que especifica qué variables necesita. Los templates son: notificación de lead nuevo al agente asignado, confirmación de contacto al lead, invitación a nuevo miembro del equipo, y recuperación de contraseña.

**Why this priority**: Los templates son necesarios para que los emails tengan contenido útil, pero la feature funciona estructuralmente sin ellos (podrían añadirse incrementalmente). Son el segundo entregable en valor.

**Independent Test**: Se puede probar renderizando cada template con un payload válido y verificando que produce contenido coherente (asunto, cuerpo con variables sustituidas). También se puede verificar que un payload incompleto produce error de validación.

**Acceptance Scenarios**:

1. **Given** el template "lead-assigned-agent", **When** se renderiza con un payload que contiene nombre del agente, nombre del lead, nombre de la promoción y enlace al backoffice, **Then** produce un email con asunto claro, cuerpo que identifica al lead y la promoción, y un enlace clicable al backoffice.
2. **Given** el template "lead-confirmation", **When** se renderiza con un payload que contiene nombre del lead y nombre de la promoción, **Then** produce un email de confirmación al lead indicando que su solicitud fue recibida.
3. **Given** el template "team-invitation", **When** se renderiza con un payload que contiene nombre del invitado, rol asignado y enlace de establecimiento de contraseña, **Then** produce un email de invitación con el enlace funcional.
4. **Given** el template "password-recovery", **When** se renderiza con un payload que contiene nombre del usuario, token firmado y enlace de reset, **Then** produce un email con el enlace de recuperación y aviso de caducidad (30 minutos).
5. **Given** cualquier template, **When** se intenta renderizar con un payload que no cumple el schema, **Then** el servicio rechaza la operación con error de validación que identifica los campos faltantes.

---

### User Story 4 - Modalidad operativa del worker (Priority: P2)

El worker puede ejecutarse en dos modalidades: como script standalone en desarrollo (invocable con `pnpm worker:emails`) que procesa la cola en bucle con un intervalo configurable, y como función serverless en producción con un cron trigger que lo invoca cada minuto. En ambas modalidades, el comportamiento de procesamiento es idéntico; solo cambia el mecanismo de arranque y ciclo de vida.

**Why this priority**: La modalidad operativa es necesaria para el despliegue, pero no afecta la lógica de negocio del procesamiento. Es infraestructura de ejecución.

**Independent Test**: Se puede verificar que el script de desarrollo arranca, procesa al menos un ciclo de cola, y termina limpiamente ante SIGTERM. La modalidad serverless se verifica por inspección del handler y su compatibilidad con el cron de Vercel.

**Acceptance Scenarios**:

1. **Given** el entorno de desarrollo, **When** se ejecuta `pnpm worker:emails`, **Then** el worker arranca, procesa las filas PENDING elegibles, y queda en bucle esperando el siguiente ciclo según el intervalo configurado.
2. **Given** el worker en desarrollo, **When** recibe una señal SIGTERM, **Then** termina el ciclo actual (si está procesando una fila) y sale limpiamente sin dejar filas en estado inconsistente.
3. **Given** el handler serverless, **When** es invocado por el cron trigger, **Then** procesa todas las filas PENDING elegibles en una sola ejecución y devuelve un resultado con el conteo de emails procesados, exitosos y fallidos.

---

### Edge Cases

- ¿Qué ocurre si dos instancias del worker procesan la misma fila simultáneamente? El worker debe usar un mecanismo de bloqueo (SELECT FOR UPDATE SKIP LOCKED o similar) para evitar doble envío.
- ¿Qué ocurre si el payload de un registro en cola referencia un template que ya no existe? El worker marca la fila como FAILED con error descriptivo sin reintentar.
- ¿Qué ocurre si la tabla `email_queue` contiene registros con `status = PENDING` cuyo `next_attempt_at` es muy antiguo (días)? El worker los procesa normalmente; el backoff ya los habrá llevado a FAILED tras 5 intentos.
- ¿Qué ocurre si Resend devuelve un error de rate limiting (429)? El worker trata el 429 como un fallo transitorio: incrementa `attempts` y programa el siguiente intento con backoff, sin marcar como FAILED inmediatamente.
- ¿Qué ocurre si el email destinatario es inválido (formato incorrecto)? El servicio de encolado rechaza la operación en la validación inicial; si aun así llega a la cola, el worker marca como FAILED tras el primer intento con error de validación del proveedor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proporcionar un servicio de encolado de emails que persista notificaciones en la tabla `email_queue` dentro de una transacción de base de datos.
- **FR-002**: El servicio de encolado DEBE aceptar como entrada el destinatario (email válido), el nombre del template y el payload de variables.
- **FR-003**: El servicio de encolado DEBE validar que el payload cumple el schema del template antes de encolar.
- **FR-004**: El servicio de encolado DEBE ser invocable dentro de una transacción existente sin forzar commit prematuro.
- **FR-005**: El sistema DEBE proporcionar un worker que procese la cola `email_queue` recogiendo registros PENDING cuyo `next_attempt_at` sea anterior al momento actual.
- **FR-006**: El worker DEBE aplicar backoff exponencial tras cada fallo: `next_attempt_at = now() + (2^attempts × 60 segundos)`.
- **FR-007**: El worker DEBE marcar una fila como `status = FAILED` tras 5 intentos fallidos sin reintentar más.
- **FR-008**: El worker DEBE invocar al proveedor de email (Resend) para cada fila procesada, usando el template y payload almacenados.
- **FR-009**: El worker DEBE evitar el doble procesamiento de una misma fila mediante bloqueo a nivel de base de datos.
- **FR-010**: El sistema DEBE proporcionar cuatro templates transaccionales: lead-assigned-agent, lead-confirmation, team-invitation, password-recovery.
- **FR-011**: Cada template DEBE definir un schema de payload que especifica las variables requeridas.
- **FR-012**: El worker DEBE ser ejecutable como script standalone (`pnpm worker:emails`) en desarrollo.
- **FR-013**: El worker DEBE ser invocable como función serverless con cron trigger en producción.
- **FR-014**: El sistema DEBE validar la clave de API de Resend al arranque del worker; si no está configurada, el worker DEBE fallar con error claro.
- **FR-015**: El servicio de encolado DEBE permitir que el registro de origen (lead, usuario, etc.) se persista exitosamente incluso si el proveedor de email está indisponible en el momento del encolado.

### Key Entities

- **EmailQueueItem**: Representa una notificación de email pendiente de envío. Atributos: destinatario, template, payload (variables), estado (PENDING/SENT/FAILED), número de intentos, próximo intento, último error, timestamps de creación y envío.
- **EmailTemplate**: Representa un template de email transaccional. Atributos: nombre identificador, asunto, cuerpo, schema de payload requerido.
- **EmailService**: Servicio de infraestructura que encapsula la comunicación con el proveedor de email (Resend). No tiene estado propio; recibe template + payload y devuelve éxito/fallo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los emails encolados con proveedor de email disponible se envían en el primer intento del worker (menos de 60 segundos de latencia desde el encolado).
- **SC-002**: La persistencia del recurso de origen (lead, usuario) no se ve afectada por la indisponibilidad del proveedor de email — verificable con test que simula proveedor caído.
- **SC-003**: Tras 5 intentos fallidos consecutivos, el sistema deja de reintentar y marca el email como FALLIDO de forma definitiva, sin consumo infinito de recursos.
- **SC-004**: El backoff exponencial respeta la fórmula declarada: los intervalos entre intentos son 2, 4, 8, 16 minutos (× 60 segundos), verificable con test.
- **SC-005**: No se produce doble envío de un mismo email bajo concurrencia de workers — verificable con test que simula dos workers procesando la misma cola.
- **SC-006**: Los cuatro templates producen contenido legible y coherente cuando se renderizan con payloads válidos.
- **SC-007**: El worker de desarrollo arranca con `pnpm worker:emails`, procesa al menos un ciclo, y responde a SIGTERM en menos de 5 segundos.

## Assumptions

- La tabla `email_queue` ya existe en el schema de base de datos (creada por F002) con las columnas necesarias: `id`, `tenant_id`, `to_email`, `template`, `payload` (JSONB), `status`, `attempts`, `next_attempt_at`, `last_error`, `created_at`, `sent_at`.
- La variable de entorno `RESEND_API_KEY` ya está declarada en `.env.example` (configurada por F001).
- El paquete `resend` (SDK oficial de Resend) es la dependencia externa para la comunicación con el proveedor de email.
- Los templates de email son funcionales (contenido HTML básico con variables sustituidas); el diseño visual pulido de los templates queda fuera del alcance de esta feature.
- El mecanismo de bloqueo contra doble procesamiento se implementa con `SELECT ... FOR UPDATE SKIP LOCKED` de PostgreSQL, que es compatible con Neon/PgBouncer en transaction pooling.
- En producción, el cron trigger de Vercel ejecuta el worker cada 1 minuto; durante el desarrollo, el script standalone usa un intervalo de 30 segundos por defecto (configurable).
- Los puntos concretos de la aplicación que encolan emails (creación de lead en F014, invitación de usuario en F016, recuperación de contraseña en F005) no se implementan en esta feature — esta feature proporciona la infraestructura de encolado y envío que aquellos consumirán.
