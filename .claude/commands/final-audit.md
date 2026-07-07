---
description: Auditoría final del proyecto completo. Recorre todas las features desarrolladas y verifica que el código respeta constitution.md, architecture.md, product.md Y la spec.md de cada feature. Produce informes por feature + un informe consolidado con veredicto. Ejecutar cuando todas las features del roadmap estén implementadas (o bajo demanda para las completadas hasta ahora).
---

# Auditoría final de Domio contra sus especificaciones

Ejecuta una auditoría completa del codebase en tres pasadas: dos de
diagnóstico (solo informes) y una de APLICACIÓN de los fixes en rama
aparte con merge a main si todo queda verde.

## Pasada 1 — Conformidad por feature (spec compliance)

1. Enumera las features desarrolladas: carpetas `specs/NNN-*/` que tengan
   `spec.md`.

   **Modo incremental (este comando también sirve como checkpoint cada N
   features)**: si ya existe `.specify/audits/feature-<NNN>-audit.md` Y la
   feature no tiene commits posteriores a la fecha del informe (verifícalo
   con `git log --since` sobre sus archivos), sáltala y reutiliza el informe
   existente en la consolidación. Solo se auditan features nuevas o
   modificadas desde su último informe.

   Lista al humano cuáles vas a auditar y cuáles reutilizas antes de empezar.

2. Por cada feature, EN ORDEN y UNA A LA VEZ, invoca el subagente
   `code-auditor` con este encargo:

   > Audita el código de la feature <NNN>-<slug> contra CUATRO fuentes,
   > en este orden de autoridad:
   > 1. `.specify/memory/constitution.md` (principios de ingeniería)
   > 2. `.specify/memory/architecture.md` (decisiones técnicas)
   > 3. `.specify/memory/product.md` (reglas de dominio)
   > 4. `specs/<NNN>-<slug>/spec.md` + `tasks.md` — verifica que CADA
   >    requisito y criterio de aceptación de la spec está implementado
   >    de verdad en el código (no solo que exista un archivo con el
   >    nombre esperado), y que no hay tareas marcadas [X] sin código
   >    que las respalde.
   > Para localizar el código usa el grafo (search_graph / trace_path /
   > get_code_snippet de codebase-memory-mcp) antes que grep; lee los
   > archivos completos antes de emitir un hallazgo sobre ellos.
   > Escribe tu informe en `.specify/audits/feature-<NNN>-audit.md`
   > con hallazgos clasificados CRITICAL / MAJOR / MINOR y fix textual
   > propuesto. Tu reporte de vuelta hacia mí: máximo 10 líneas
   > (veredicto por severidades + path del informe).

3. Entre feature y feature no acumules detalle: solo el contador de
   hallazgos por severidad.

## Pasada 2 — Consolidado transversal (lo que ninguna feature ve sola)

Invoca `code-auditor` una última vez con este encargo:

> Auditoría transversal del repo completo. Verifica lo que solo se ve
> con contexto global:
> - Duplicación entre features: `query_graph` con SIMILAR_TO y revisión
>   de helpers repetidos que deberían promoverse a `src/shared/`.
> - Dead code: `query_graph` de funciones sin callers (excluye entry
>   points de Next.js: pages, layouts, route handlers, middleware).
> - Scope rule: imports entre `features/A/` y `features/B/`.
> - Disciplina multi-tenant global: toda tabla de dominio con tenant_id
>   + RLS; ninguna query fuera de repositorios context-aware; ningún
>   `SET ` sin `LOCAL`.
> - Drift specs↔código: reglas de product.md que ninguna feature
>   implementó, o comportamiento en código que ninguna spec pidió.
> Lee los informes parciales de `.specify/audits/feature-*-audit.md`
> y consolida. Escribe `.specify/audits/final-audit.md` con: veredicto
> ejecutivo (APTO / APTO CON RESERVAS / NO APTO para considerar el
> proyecto conforme a especificación), tabla de hallazgos por severidad
> y feature, y el top-10 de fixes por impacto.

## Pasada 3 — Aplicación de fixes (rama aparte → merge a main)

Solo si las pasadas 1-2 produjeron hallazgos con fix propuesto. Invoca
`code-auditor` en su MODO APLICACIÓN (ver su definición) con este encargo:

> Modo aplicación. Ejecuta los fixes del informe consolidado
> `.specify/audits/final-audit.md` (y los parciales que referencia):
> 1. La rama de fixes es EFÍMERA: se crea desde main actualizado en cada
>    ejecución y se borra tras el merge. Nunca reutilices una rama
>    `audit/fixes-*` de una ejecución anterior (estaría desactualizada
>    respecto a las features mergeadas después). Verifica working tree
>    limpio, y: `git checkout main && git pull` →
>    `git checkout -b audit/fixes-<YYYY-MM-DD>`.
>    Si quedó una rama `audit/fixes-*` huérfana de un run anterior fallido,
>    avisa al humano antes de continuar (puede contener fixes sin mergear).
> 2. Aplica los fixes en orden CRITICAL → MAJOR → MINOR, un commit por
>    hallazgo (`fix(audit): <ID> — <título>`). Read completo antes de cada
>    edit; si el fix cambia comportamiento, ajusta/añade el test primero.
> 3. Los hallazgos cuyo fix resulte ambiguo, más complejo de lo estimado,
>    o conflictivo con otro: OMÍTELOS y anótalos como "requiere decisión
>    humana". No fuerces nada.
> 4. Al terminar: `pnpm verify` completo.
>    - TODO VERDE → merge a main y borra la rama:
>      `git checkout main && git merge --no-ff audit/fixes-<fecha>
>      -m "fix(audit): apply final-audit findings"` →
>      `git branch -d audit/fixes-<fecha>`.
>      (La trazabilidad no se pierde: el --no-ff conserva el merge commit
>      y los commits por hallazgo en la historia de main.)
>    - ALGO ROJO → NO mergees y NO borres: deja la rama con los commits
>      hechos y reporta exactamente qué falla. Es el único caso en que
>      una rama audit/fixes-* sobrevive.
> 5. Actualiza `.specify/audits/final-audit.md` marcando cada hallazgo como
>    APLICADO / OMITIDO (con motivo) / PENDIENTE-HUMANO.

## Reporte al humano

Cierra con: veredicto ejecutivo, conteo de hallazgos por severidad,
las 3 features con más hallazgos, resultado de la aplicación (cuántos
fixes aplicados / omitidos / pendientes de decisión humana, si hubo
merge a main o la rama quedó abierta y por qué), y los paths de todos
los informes. No pegues el contenido de los informes en el chat.
