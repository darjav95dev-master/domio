---
description: Genera el sistema visual del proyecto (design.md) invocando al design-director, que carga la skill visual-design-kit. Propone tres direcciones distintas (sector-map + motor de paleta + rúbrica + trap-check ampliado + referencias reales), espera tu elección y escribe design.md. Debe ejecutarse ANTES de /bootstrap-project. No escribe código.
---

# /design-bootstrap

La **Fase 1** del ciclo: fija la dirección visual antes de generar el roadmap o
una sola línea de UI. Es el gate que evita que el diseño entre genérico.

## Prerrequisito

- Un brief de diseño en `design/brief.md` (o el director te copia la plantilla
  en la primera ejecución y para).
- La skill `visual-design-kit` disponible (el director la carga).

## Lo que hace (al ejecutar el comando — se auto-conduce)

Ejecutas el comando y arranca solo. El agente actual coordina invocando al
subagente `design-director` (tool `Task`) en **dos llamadas**, con tu elección
en medio:

1. **Verifica el brief.** Si falta `design/brief.md`, copia la plantilla del kit
   y para para que lo rellenes.
2. **Llamada 1 — Propuesta:** invoca `design-director` para que clasifique el
   sector, lea el ledger, traiga 2-3 referencias reales (WebSearch), y proponga
   **tres** direcciones de tres familias distintas (paleta del motor con
   contraste verificado, trap-check de los diez traps, auto-score ≥13/16,
   referencias citadas), escritas a `design/direction-0N-*.md`.
3. **Te muestra las tres y pausa** para que elijas una (o pidas una 4ª, o un
   híbrido).
4. **Llamada 2 — Generación:** con tu elección, invoca `design-director` para
   generar `design.md` (plantilla completa §0–§20), apéndalo al ledger, con los
   mandatos de imagen y motion.
5. **Hand-off:** qué revisar y que el siguiente paso es `/bootstrap-project` →
   construir el sistema visual → `design-critic`.

## Orden en el ciclo

```
/design-bootstrap   ← AQUÍ (fija la dirección visual)
      ↓
/bootstrap-project  (audita design.md + roadmap con visual-system-implementation)
      ↓
/execute-feature N  (implementa; el design-critic valida el render)
```

## Tu rol

Solo decides en un punto: **eliges la dirección** entre las tres. Lo demás lo
hace el director.
