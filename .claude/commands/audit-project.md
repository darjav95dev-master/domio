---
description: Run a full quality audit on the project. Invokes refactor-suggester and quality-reviewer over the entire codebase to produce a snapshot of accumulated technical debt and constitutional compliance.
---

# /audit-project

Ejecuta una auditoría completa del proyecto. A diferencia de
`quality-reviewer`, que actúa sobre una feature concreta, esta
auditoría inspecciona **todo el codebase**.

## Cuándo usarlo

- Cada 5-10 features mergeadas.
- Antes de hitos importantes (release, milestone del TFM, entrega al
  cliente).
- Cuando sospechas que se ha acumulado deuda técnica.
- Antes de cerrar un capítulo y empezar otro grande.

## Lo que hace

1. Invoca `refactor-suggester` sobre el proyecto entero.
   Genera/actualiza `.specify/memory/refactor-backlog.md`.

2. Invoca `quality-reviewer` en modo "audit completo": en lugar de
   revisar un diff, revisa todo el código actual contra la
   constitución y `architecture.md`.

3. Verifica que los tests pasan globalmente (`pnpm verify`).

4. Verifica la cobertura global y crítica.

5. Si el proyecto tiene contrato HTTP con otro repo, invoca
   `contract-guardian` para verificar sincronización.

6. Produce un **reporte ejecutivo** que combina los outputs anteriores
   en `.specify/memory/audit-report-<fecha>.md`.

## Tu output al humano

```
═══════════════════════════════════════════════════
  AUDIT REPORT · [fecha]
═══════════════════════════════════════════════════

ESTADO GENERAL: [SALUDABLE | ATENCIÓN | CRÍTICO]

Tests:
  ✓ Suite global: PASS
  ✓ Aislamiento: PASS
  ✓ Contrato: PASS

Cobertura:
  - Global: 83% (umbral 80%) ✓
  - features/leads/server: 76% (umbral 90%) ✗

Compliance con constitution.md:
  - 0 violaciones críticas
  - 2 violaciones mayores
  - 5 violaciones menores

Compliance con architecture.md:
  - 0 violaciones críticas
  - 1 violación mayor (Scope Rule cruzada en features/leads → features/team)

Refactor backlog:
  - 1 crítico
  - 3 importantes
  - 7 oportunistas

Acciones prioritarias propuestas:
  1. [Crítico] Resolver Scope Rule en features/leads
  2. [Crítico] Subir cobertura de features/leads/server a 90%
  3. [Importante] Refactorizar duplicación entre features/promociones
     y features/inmuebles (extraer a shared/property)

Archivos generados:
  - .specify/memory/audit-report-2026-04-12.md
  - .specify/memory/refactor-backlog.md (actualizado)
═══════════════════════════════════════════════════
```

## Reglas

- El comando **no aplica cambios**, solo audita y reporta.
- El reporte se conserva con fecha; auditorías sucesivas no
  sobreescriben las anteriores. Esto permite ver evolución de la
  deuda a lo largo del tiempo (útil para el TFM).

## Después de la auditoría

Tú decides qué hacer con las propuestas:
- Acciones críticas: deberías abordarlas como features (añádelas al
  `roadmap.md`).
- Importantes: puedes diferir si hay justificación.
- Oportunistas: solo cuando hay capacidad.

Para abordarlas, las incorporas al `roadmap.md` con prefijo `R-` (de
refactor) y las ejecutas con `/execute-feature` como cualquier otra.
