---
description: Execute a complete feature from the roadmap end-to-end. Switches to the orchestrator primary agent which coordinates the full SDD lifecycle with all guardian subagents.
argument-hint: <feature-number>
---

# /execute-feature

Ejecuta una feature completa del roadmap. En opencode, el orquestador
es un **primary agent** (no un subagente), así que este comando te
indica cómo cambiar a él.

## Uso

```
/execute-feature 003
```

O por nombre:

```
/execute-feature modulo-tenancy
```

## Lo que hace

1. **Te indica que cambies al orquestador.** Pulsa **Tab** para
   cambiar al agente `orchestrator`. Si no lo ves en el cycle, pulsa
   Tab hasta que aparezca "orchestrator" en el indicador de agente.

2. **Escribe el número de feature al orquestador.** Una vez en modo
   orchestrator, escribe: `ejecuta la feature 003` (o el número/nombre
   que pasaste al comando). El orquestador reconoce la orden y arranca
   el ciclo.

3. **El orquestador coordina todo:**
   - Verifica prerrequisitos (estado git, archivos de memoria).
   - Crea la rama feature.
   - Invoca `feature-briefer` (via tool `task`) para preparar el input.
   - Te muestra el brief y pide aprobación (via tool `question`).
   - Ejecuta `/speckit-specify` → `clarify` → `plan` → `tasks` →
     `analyze` con checkpoints intermedios.
   - Commit de los artefactos de especificación.
   - Ejecuta `/speckit-implement` con `tdd-enforcer` vigilando cada
     tarea (invocado via tool `task`).
   - Si toca el contrato HTTP, invoca `contract-guardian` (via `task`).
   - Tras implementar, invoca `quality-reviewer` (via `task`).
   - Si la feature tiene superficie visual, invoca `frontend-developer`
     (via `task`) para las tareas de UI.
   - Si todo aprueba, invoca `tfm-documenter` (via `task`) para anotar
     la evidencia.
   - Reporta el resumen final: rama lista para merge.

## Tu rol durante la ejecución

El orquestador hace **casi todo solo**, pero pausa en los puntos
donde tienes que decidir:

- Aprobar el brief antes de `/speckit-specify`.
- Resolver `[NEEDS CLARIFICATION]` significativos.
- Decidir qué hacer con observaciones del `quality-reviewer`.
- Confirmar acciones destructivas.

Salvo en esos checkpoints, el orquestador trabaja autónomamente.

## Por qué hay que cambiar de agente (Tab)

En opencode, los agentes **primary** son los que manejan la
conversación principal. El orquestador es `mode: primary` porque
necesita mantener estado a lo largo del ciclo completo de la feature
(espec → implement → review) y coordinar múltiples subagentes. Los
subagentes (`mode: subagent`) son stateless — se invocan vía tool
`task`, hacen su trabajo, devuelven un resultado y terminan.

El orquestador no puede ser subagente porque necesita vivir durante
toda la feature, no para una tarea puntual.

## Cuándo NO usar este comando

- Si quieres trabajar una feature paso a paso sin orquestación
  (modo manual), ejecuta los `/speckit-*` directamente desde
  cualquier agente primary.
- Si la feature no está en `.specify/memory/roadmap.md`, actualiza el roadmap antes
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

## Notas de implementación en opencode

- El orquestador invoca subagentes con el tool `task`:
  `task({ subagent_type: "feature-briefer", prompt: "...", description: "..." })`.
- Los checkpoints usan el tool `question` para pausar y esperar tu
  decisión.
- El orquestador carga skills con el tool `skill` cuando las necesita
  (ej: `frontend-ui-engineering` si la feature tiene UI).
- Elasticsearch/sppeckit-* se ejecutan como skills (tool `skill` con
  nombres `speckit-specify`, `speckit-implement`, etc.).