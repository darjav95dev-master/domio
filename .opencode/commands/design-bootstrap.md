---
description: Genera el sistema visual del proyecto (design.md) invocando al subagente design-director, que carga la skill visual-design-kit. Propone tres direcciones distintas (sector-map + motor de paleta + rúbrica + trap-check ampliado + referencias reales), espera tu elección y escribe design.md. Debe ejecutarse ANTES de /bootstrap-project. No escribe código.
---

# /design-bootstrap

La **Fase 1** del ciclo: fija la dirección visual antes de generar el roadmap o
una sola línea de UI. Funciona igual que `/bootstrap-project`: **lo ejecutas y
arranca el proceso solo** — el agente actual coordina invocando al subagente
`design-director` vía el tool `task`. No tienes que cambiar de agente.

## Prerrequisito

- Un brief de diseño en `design/brief.md`. Si falta, el primer paso te copia la
  plantilla y para para que lo rellenes.
- La skill `visual-design-kit` disponible (el `design-director` la carga).

## Lo que hace (al ejecutar el comando)

1. **Verifica el brief.** Busca `design/brief.md`. Si no existe, copia
   `~/.claude/skills/visual-design-kit/templates/design-brief.md` a
   `design/brief.md`, avisa al humano de que lo rellene, y **para**.

2. **Invoca al `design-director` (fase de propuesta) vía `task`:**
   ```
   task({ subagent_type: "design-director", description: "Proponer 3 direcciones",
     prompt: "Carga la skill visual-design-kit y lee sus references por ruta
       (~/.claude/skills/visual-design-kit/). Lee design/brief.md. Clasifica el
       sector (sector-aesthetic-map), lee design/.palette-ledger.md, trae 2-3
       referencias reales con webfetch. Propón TRES direcciones de tres familias
       distintas siguiendo templates/direction-proposal.md: paleta del
       palette-engine con contraste verificado, trap-check contra los diez traps,
       auto-score de rúbrica (≥13/16), referencias citadas. Escríbelas a
       design/direction-01-<name>.md, -02, -03. Devuélveme un resumen de las tres
       con su tesis, su riesgo y tu recomendación. NO generes design.md todavía." })
   ```

3. **Muestra las tres direcciones al humano y pausa** pidiendo que elija una (o
   pida una 4ª iteración, o un híbrido). Igual que `/bootstrap-project` pausa
   para aprobar el roadmap.

4. **Con la elección, invoca al `design-director` (fase de generación) vía `task`:**
   ```
   task({ subagent_type: "design-director", description: "Generar design.md",
     prompt: "El humano eligió direction-0N-<name>. Genera .specify/memory/design.md
       (o design.md en la raíz según convención del repo) a partir de esa
       dirección siguiendo templates/design.md AL COMPLETO: rellena §0–§11 y
       ESPECIALMENTE las secciones de riqueza §12–§20 (imagen real, densidad,
       spec vista-por-vista, tabla de motion, responsive…). Verifica contraste.
       Apéndalo a design/.palette-ledger.md. NO escribas código." })
   ```

5. **Hand-off:** informa de que `design.md` está escrito, nombra lo que revisar
   primero (firma §1, contraste §2.3, rechazos §11), y que el siguiente paso es
   `/bootstrap-project` → luego construir el sistema visual → `design-critic`.

## Tu rol

Un único punto de decisión: **eliges la dirección** entre las tres. El resto es
automático.

## Orden en el ciclo

```
/design-bootstrap   ← AQUÍ (fija la dirección visual)
      ↓
/bootstrap-project  (audita design.md + genera roadmap con visual-system-implementation)
      ↓
/execute-feature N  (implementa; el design-critic valida el render)
```

## Lo que NO hace

- No propone una sola dirección. Tres o para.
- No inventa el brief. Si falta, copia plantilla y para.
- No genera código, Tailwind, componentes ni screenshots.
- No corre si no hay superficie visual en el proyecto.
