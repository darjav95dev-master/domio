# Research: email-queue-and-resend

**Date**: 2026-07-08 | **Feature**: F007

## R1: SDK Resend — API y patrones de uso

**Decision**: Usar el SDK oficial `resend` (npm package) con su método `emails.send()`.

**Rationale**: El SDK oficial proporciona tipado TypeScript, manejo de retries internos (a nivel de HTTP, no de negocio — nuestro worker gestiona los reintentos de negocio), y es la forma recomendada por Resend para integración con Node.js. La alternativa (llamadas HTTP directas) añade complejidad innecesaria.

**Alternatives considered**:
- `@react-email/render` + `resend` — útil si los templates fueran React Email components. Para MVP con templates HTML simples con sustitución de variables, es overkill. Se puede migrar en el futuro sin cambiar la interfaz del servicio.
- Llamadas HTTP directas a la API REST de Resend — más control pero más código de boilerplate. No justificado para el volumen del MVP.

**Hallazgo clave**: El schema del `email_queue` ya existe (F002) y no lleva `tenant_id` — es tabla de infraestructura. El comentario en el schema (`src/infrastructure/db/schema/email-queue.ts` línea 12) lo documenta explícitamente.

---

## R2: Patrón de cola con SELECT FOR UPDATE SKIP LOCKED

**Decision**: El worker usa `SELECT ... FOR UPDATE SKIP LOCKED` para reclamar filas de la cola sin bloquear otras instancias concurrentes del worker.

**Rationale**: Es el patrón estándar de PostgreSQL para colas de trabajo con múltiples consumidores. `SKIP LOCKED` evita que dos workers procesen la misma fila: si un worker ya bloqueó una fila con `FOR UPDATE`, el otro worker la salta y toma la siguiente. Es compatible con Neon/PgBouncer en transaction pooling porque el bloqueo es a nivel de transacción.

**Alternatives considered**:
- Cola con estado intermedio `PROCESSING` — añade complejidad (hay que gestionar timeouts de filas stuck en PROCESSING). SKIP LOCKED es más simple y robusto.
- Advisory locks de PostgreSQL — funciona pero es menos estándar y más difícil de depurar.
- Librerías de cola (Bull, BullMQ) — requieren Redis, que no está en el stack declarado de Domio.

**Patrón concreto**:
```
BEGIN;
SELECT * FROM email_queue 
WHERE status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= now())
ORDER BY next_attempt_at ASC
LIMIT 10
FOR UPDATE SKIP LOCKED;
-- procesar cada fila
UPDATE email_queue SET status = 'SENT', sent_at = now(), attempts = attempts + 1 WHERE id = $1;
-- o en caso de fallo:
UPDATE email_queue SET attempts = attempts + 1, last_error = $2, next_attempt_at = now() + interval '$3 seconds' WHERE id = $1;
COMMIT;
```

---

## R3: Backoff exponencial — fórmula y límites

**Decision**: `next_attempt_at = now() + (2^attempts × 60 segundos)`. Máximo 5 intentos.

**Rationale**: La fórmula produce intervalos de 2, 4, 8, 16, 32 minutos. Es progresivo sin ser excesivo para emails transaccionales. Tras 5 intentos (~62 minutos desde el primer intento), el email se marca como FAILED permanentemente.

**Alternatives considered**:
- Backoff con jitter — útil para alta concurrencia; para el volumen del MVP no es necesario.
- Máximo de intentos configurable por template — añade complejidad sin beneficio claro en el MVP. Todos los templates tienen la misma criticidad.
- Reintento indefinido con cola muerta — over-engineering para el MVP. Los emails FAILED son visibles en BD para diagnóstico manual.

---

## R4: Templates de email — enfoque de renderizado

**Decision**: Templates como funciones puras que reciben un payload validado por Zod y devuelven un objeto `{ subject: string, html: string, text: string }`. El HTML es un string con sustitución de variables simples (placeholders `{{variable}}`).

**Rationale**: Para el MVP, templates funcionales son suficientes. El diseño visual pulido es una feature posterior. La interfaz `{ subject, html, text }` es compatible con el SDK de Resend y permite migrar a React Email en el futuro sin cambiar la interfaz del servicio.

**Alternatives considered**:
- React Email (`@react-email/components` + `@react-email/render`) — mejor DX para templates complejos, pero añade una dependencia pesada para 4 templates simples. Se puede adoptar cuando el diseño visual de emails sea prioridad.
- MJML — lenguaje de markup para emails responsive. Añade una capa de compilación innecesaria para el MVP.
- Templates almacenados en BD — over-engineering. Los templates son código, no contenido editable por el usuario.

---

## R5: Worker — modalidad standalone vs serverless

**Decision**: Dos entry points que comparten la misma lógica de procesamiento:
1. **Desarrollo**: `scripts/worker-emails.ts` ejecutado con `tsx` vía `pnpm worker:emails`. Bucle con intervalo configurable (default 30s). Responde a SIGTERM para shutdown limpio.
2. **Producción**: `vercel/functions/worker-emails.ts` como handler que Vercel invoca vía cron trigger cada 1 minuto. Procesa todas las filas elegibles y retorna resultado.

**Rationale**: La lógica de procesamiento (reclamar filas, invocar Resend, actualizar estado, calcular backoff) es idéntica en ambas modalidades. Solo cambia el mecanismo de ciclo de vida. Compartir la lógica evita duplicación.

**Alternatives considered**:
- Un único entry point con detección de entorno — más frágil, mezcla responsabilidades.
- Worker como proceso separado (no serverless) — requiere infraestructura adicional (VM, contenedor) que no está en el stack declarado.

---

## R6: Validación de email — estrategia

**Decision**: Validación de formato de email con Zod (`z.string().email()`) en el servicio de encolado, antes de insertar en la cola. El worker no re-valida el formato (confía en que la fila fue validada al encolar).

**Rationale**: Validar una sola vez (al encolar) es suficiente. Si el formato es inválido, Resend rechazará el envío de todas formas, pero es mejor capturar el error antes para no gastar un intento del backoff.

**Alternatives considered**:
- Validar también en el worker — defensa en profundidad, pero añade complejidad sin beneficio real si el encolado ya valida.
- Validación MX del dominio — over-engineering para el MVP.
