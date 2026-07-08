# Quickstart: email-queue-and-resend

**Date**: 2026-07-08 | **Feature**: F007

## Prerequisites

- Base de datos Neon de desarrollo accesible (`DATABASE_URL` en `.env.local`)
- Clave de API de Resend en modo test (`RESEND_API_KEY` en `.env.local`)
- Migraciones de F002 aplicadas (`pnpm db:migrate`)

## Escenario 1: Encolado resiliente

**Objetivo**: Verificar que un email se encola correctamente y que el recurso de origen se persiste aunque Resend esté caído.

1. Ejecutar `pnpm test:run tests/unit/email/email.service.test.ts`
2. Verificar que el test "enqueue persists row even when Resend is down" pasa
3. Verificar que la fila creada tiene `status = PENDING`, `attempts = 0`, `to_email` y `template` correctos

**Resultado esperado**: Todos los tests del servicio de encolado pasan. La fila se persiste independientemente del estado de Resend.

---

## Escenario 2: Worker procesa cola con éxito

**Objetivo**: Verificar que el worker toma una fila PENDING, invoca Resend, y marca como SENT.

1. Insertar manualmente una fila en `email_queue` con `status = PENDING`, template válido y payload válido
2. Ejecutar `pnpm test:run tests/unit/email/worker.test.ts`
3. Verificar que el test "processes pending email successfully" pasa
4. Verificar que la fila queda con `status = SENT`, `sent_at` no null, `attempts = 1`

**Resultado esperado**: El worker procesa la fila y la marca como enviada.

---

## Escenario 3: Backoff exponencial tras fallo

**Objetivo**: Verificar que tras un fallo, el worker incrementa attempts y calcula next_attempt_at correctamente.

1. Ejecutar `pnpm test:run tests/unit/email/worker.test.ts`
2. Verificar que el test "applies exponential backoff after failure" pasa
3. Verificar que para `attempts = 0` → fallo → `next_attempt_at ≈ now() + 120s` (2^1 × 60)
4. Verificar que para `attempts = 3` → fallo → `next_attempt_at ≈ now() + 960s` (2^4 × 60)

**Resultado esperado**: Los intervalos de backoff siguen la fórmula `2^attempts × 60s`.

---

## Escenario 4: Fallo definitivo tras 5 intentos

**Objetivo**: Verificar que tras 5 intentos fallidos, la fila se marca como FAILED.

1. Ejecutar `pnpm test:run tests/unit/email/worker.test.ts`
2. Verificar que el test "marks email as FAILED after 5 attempts" pasa
3. Verificar que la fila queda con `status = FAILED`, `attempts = 5`, `last_error` con el mensaje

**Resultado esperado**: La fila no se reintenta más tras 5 fallos.

---

## Escenario 5: Templates renderizan correctamente

**Objetivo**: Verificar que los 4 templates producen contenido válido con payloads correctos.

1. Ejecutar `pnpm test:run tests/unit/email/templates.test.ts`
2. Verificar que cada template (lead-assigned-agent, lead-confirmation, team-invitation, password-recovery) produce subject, html y text no vacíos
3. Verificar que las variables del payload aparecen sustituidas en el contenido

**Resultado esperado**: Los 4 templates renderizan contenido coherente.

---

## Escenario 6: Worker standalone en desarrollo

**Objetivo**: Verificar que `pnpm worker:emails` arranca y procesa un ciclo.

1. Con la BD de desarrollo corriendo y al menos una fila PENDING en `email_queue`
2. Ejecutar `pnpm worker:emails`
3. Verificar en los logs que el worker arranca, procesa la fila, y reporta el resultado
4. Enviar SIGTERM (Ctrl+C) y verificar que el worker termina limpiamente

**Resultado esperado**: El worker arranca, procesa, y responde a SIGTERM.

---

## Referencias

- [spec.md](./spec.md) — especificación completa
- [data-model.md](./data-model.md) — modelo de datos y transiciones de estado
- [contracts/email-service.md](./contracts/email-service.md) — contrato de la interfaz del servicio
