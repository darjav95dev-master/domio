# Implementation Plan: email-queue-and-resend

**Branch**: `feature/007-email-queue-and-resend` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-email-queue-and-resend/spec.md`

## Summary

Implementar la infraestructura de email transaccional resiliente para Domio: un servicio de encolado que persiste notificaciones en la tabla `email_queue` (ya existente, creada por F002) dentro de la transacción del recurso de origen, un cliente Resend como proveedor de envío, un worker que procesa la cola con backoff exponencial (máx 5 intentos), y cuatro templates transaccionales. La regla fundamental es que ningún servicio de negocio invoca a Resend directamente — siempre encola.

## Technical Context

**Language/Version**: TypeScript strict (modo `strict: true`), Node.js ≥ 20

**Primary Dependencies**: Next.js 15 (App Router), Drizzle ORM, `resend` (SDK oficial), `zod` (validación de payloads de templates), `pg` (driver PostgreSQL ya instalado)

**Storage**: PostgreSQL 16 en Neon (tabla `email_queue` ya creada por F002, sin `tenant_id` por ser tabla de infraestructura)

**Testing**: Vitest (unit/integration), Playwright (E2E — no aplica a esta feature directamente)

**Target Platform**: Vercel (serverless con cron trigger para worker en producción); script standalone para desarrollo local

**Project Type**: Web service (Next.js App Router) con worker de background

**Performance Goals**: Worker procesa toda la cola PENDING elegible en < 10s para volúmenes MVP (< 100 emails/cola). Latencia de encolado < 50ms (es un INSERT en transacción existente).

**Constraints**: Backoff exponencial con fórmula `2^attempts × 60s`. Máximo 5 intentos. Sin doble envío (bloqueo a nivel de BD). El encolado nunca bloquea la transacción del recurso de origen.

**Scale/Scope**: MVP single-tenant. Volumen esperado: decenas de emails por día. Cuatro templates transaccionales.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio constitución | Estado | Justificación |
|------------------------|--------|---------------|
| §1 Stack Next.js/TS | ✅ PASS | Toda la implementación usa TypeScript strict en el proyecto Next.js existente |
| §2 Scope Rule | ✅ PASS | `src/infrastructure/email/` es infraestructura (servicio externo Resend). Templates en `src/infrastructure/email/templates/`. Constantes de nombres de template en `src/shared/constants/` |
| §3 TDD obligatorio | ✅ PASS | Tests unitarios para servicio de encolado, templates y worker. Tests de integración con BD para el procesamiento de cola |
| §4 ESLint + SonarJS | ✅ PASS | Sin código nuevo fuera de las reglas existentes |
| §5 Seguridad | ✅ PASS | `RESEND_API_KEY` en variable de entorno (ya declarada en `.env.example`). Nunca hardcodeada |
| §6 Accesibilidad | ✅ N/A | Esta feature no tiene superficie UI |
| §7 Observabilidad | ✅ PASS | Errores del worker registrados en `last_error` de la fila. Futura integración con Sentry (F008) |
| §8 Commits convencionales | ✅ PASS | Se usará `feat(007):` para commits |
| §11.1 Enums cerrados | ✅ PASS | Estados PENDING/SENT/FAILED ya definidos en `EMAIL_STATUSES` constante |
| §11.2 Dependencias explícitas | ✅ PASS | F001 y F002 declaradas como dependencias |
| §11.3 Servicios externos por cola | ✅ PASS | Este es el principio central de la feature. El servicio de encolado ES la materialización de este principio |

**Gate result**: ✅ PASS — sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/007-email-queue-and-resend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (email-service interface contract)
│   └── email-service.md
└── tasks.md             # Phase 2 output (by /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── shared/
│   └── constants/
│       └── email-templates.ts          ← nombres de templates + schemas Zod de payload
├── infrastructure/
│   └── email/
│       ├── email.service.ts            ← servicio de encolado (enqueue method)
│       ├── resend.client.ts            ← cliente Resend (send method)
│       ├── email.repository.ts         ← acceso a BD para email_queue
│       ├── worker.ts                   ← lógica de procesamiento de cola
│       ├── templates/
│       │   ├── index.ts                ← registry de templates
│       │   ├── lead-assigned-agent.ts
│       │   ├── lead-confirmation.ts
│       │   ├── team-invitation.ts
│       │   └── password-recovery.ts
│       └── types.ts                    ← tipos compartidos del módulo
scripts/
│   └── worker-emails.ts                ← entry point para `pnpm worker:emails`
vercel/
│   └── functions/
│       └── worker-emails.ts            ← handler serverless para cron trigger
tests/
├── unit/
│   └── email/
│       ├── email.service.test.ts
│       ├── resend.client.test.ts
│       ├── worker.test.ts
│       └── templates.test.ts
└── integration/
    └── email/
        └── email-queue.integration.test.ts
```

**Structure Decision**: El módulo email vive en `src/infrastructure/email/` porque Resend es un servicio externo (constitution §2 Scope Rule). Los schemas de validación de payloads y los nombres de templates viven en `src/shared/constants/email-templates.ts` porque son consumidos tanto por el servicio de encolado como por los futuros puntos de encolado (F005, F014, F016). El worker tiene dos entry points (script standalone y handler serverless) que comparten la misma lógica de procesamiento.

## Complexity Tracking

Sin violaciones de constitución — no aplica.
