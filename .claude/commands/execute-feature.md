---
description: Execute a complete feature from the roadmap end-to-end. Invokes the orchestrator subagent which coordinates the full SDD lifecycle with all guardian subagents.
argument-hint: <feature-number>
---

# /execute-feature

Ejecuta una feature completa del roadmap delegando en el subagente
`orchestrator`, que coordina el ciclo SDD completo.

## Uso

```
/execute-feature 003
```

O por nombre:

```
/execute-feature modulo-tenancy
```

## Lo que hace

Invoca al subagente `orchestrator` con la feature solicitada. El
orquestador:

1. Verifica prerrequisitos (estado git, archivos de memoria).
2. Crea la rama feature.
3. Invoca `feature-briefer` para preparar el input rico.
4. Te muestra el brief y te pide aprobación.
5. Ejecuta `/speckit-specify` → `clarify` → `plan` → `tasks` →
   `analyze` con checkpoints intermedios.
6. Commit de los artefactos de especificación.
7. Ejecuta `/speckit-implement` con `tdd-enforcer` vigilando cada
   tarea.
8. Si toca el contrato HTTP, invoca `contract-guardian`.
9. Tras implementar, invoca `quality-reviewer`.
10. Si todo aprueba, invoca `tfm-documenter` para anotar la
    evidencia.
11. Reporta el resumen final y te indica que la rama está lista para
    merge.

## Tu rol durante la ejecución

El orquestador hace **casi todo solo**, pero pausa en los puntos
donde tienes que decidir:

- Aprobar el brief antes de `/speckit-specify`.
- Resolver `[NEEDS CLARIFICATION]` significativos.
- Decidir qué hacer con observaciones del `quality-reviewer`.
- Confirmar acciones destructivas.

Salvo en esos checkpoints, el orquestador trabaja autónomamente.

## Cuándo NO usar este comando

- Si quieres trabajar una feature paso a paso sin orquestación
  (modo manual), ejecuta los `/speckit-*` directamente.
- Si la feature no está en `roadmap.md`, actualiza el roadmap antes
  (invoca a `architect` o edita manualmente).

## Lo que ves al final

```
✓ Feature 003 · modulo-tenancy COMPLETADA
  Rama: feature/003-modulo-tenancy
  Commits: 2 (spec+plan+tasks, implement)
  
  Métricas:
    - tasks.md: 14 tareas
    - TDD: 14/14 verificadas por tdd-enforcer
    - Quality review: APROBADA (0 críticas, 2 menores)
    - Cobertura tenancy: 92%
    - Cobertura global: 81%
    - Tests añadidos: 27
  
  Evidencia TFM añadida a: tfm-evidencias.md

Para mergear:
  git checkout main
  git merge --no-ff feature/003-modulo-tenancy
  git push
```
