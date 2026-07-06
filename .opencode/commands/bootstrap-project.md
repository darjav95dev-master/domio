---
description: Bootstrap a new SDD project. Verifies memory files, audits design.md (if present) inline via WCAG contrast scripts and token-reference checks, and generates .specify/memory/roadmap.md by invoking the architect subagent via the task tool.
---

# /bootstrap-project

Inicializa un proyecto SDD generando el `.specify/memory/roadmap.md` a partir de los
archivos de memoria ya escritos.

## Prerrequisitos

Los siguientes archivos deben existir en `.specify/memory/`:

**Siempre requeridos:**
- `constitution.md` — principios de ingeniería del proyecto.
- `product.md` — qué es el producto y para quién.
- `architecture.md` — decisiones técnicas estructurales.

**Detectado por existencia** (no por metaflag):
- `design.md` — si existe, el proyecto tiene sistema visual y se
  audita antes de generar el roadmap. Si no existe, el bootstrap
  procede sin él.

Si algún archivo requerido falta, el comando se detiene y reporta cuál.

## Lo que hace

1. **Verificación de memoria**. Comprueba que existen los tres archivos
   requeridos. Detecta si existe `design.md`.

2. **Auditoría de diseño** (solo si `design.md` existe). Se ejecuta
   inline — no depende de ninguna skill externa. Tres chequeos:

   **a) Contraste WCAG (programático):** Extrae todos los pares
   `fg.* on bg.*` declarados en la sección 2.3 de design.md, lee sus
   hex values de la sección 2.2, y calcula el ratio de contraste real
   con la fórmula WCAG 2.1 de luminancia relativa. Compara el ratio
   calculado contra el declarado. Si un par declarado PASS en realidad
   falla, es `critical` y el bootstrap aborta.

   Ejecuta este script de Node para calcular automáticamente:

   ```bash
   node -e "
     // Lee design.md, extrae pares de contraste, calcula ratios reales
     const fs = require('fs');
     const md = fs.readFileSync('.specify/memory/design.md', 'utf-8');
     // ... parse, calculate, report
   "
   ```

   **b) Consistencia de tokens:** Verifica que cada token semántico
   referenciado en los contratos de componentes (sección 7) exista en
   la definición de tokens (secciones 2.2, 3.4, 4.2, 5). Usa `grep`
   para buscar referencias `color.*`, `type.*`, `space.*`, `radius.*`
   en sección 7 y verifica que cada uno esté definido en las
   secciones anteriores.

   **c) Hex crudos en componentes:** Busca en la sección 7 valores hex
   (`#[0-9a-fA-F]{3,6}`) que no estén en la capa primitive. Una
   excepción documentada ("documented deviation") es `warning`, no
   `critical`.

   **d) Anti-trap + firma (nuevo — evita "correcto pero genérico"):** la
   auditoría de contraste comprueba que el diseño es *correcto*, no que sea
   *distintivo*. Este chequeo cierra ese hueco:
   - **Firma presente:** la sección 1 (The signature) debe describir un gesto
     estructural concreto, no decoración. Si está vacía o es genérica
     ("clean modern look"), es `critical` — un design.md sin firma es genérico
     por definición.
   - **Rechazo anti-vacío:** la sección 11 (REJECTS) debe incluir un rechazo
     explícito a la página de puro texto / vacía. Si falta, `warning`.
   - **Traza de trap-check:** el design.md (o las `design/direction-*.md` que lo
     originaron) debe evidenciar que se corrió el trap-check de los diez traps.
     Si el diseño reproduce un default reconocible (p.ej. acento violeta
     `#8b5cf6` + Inter + slate; o cream+serif+terracotta) sin justificación en el
     brief, es `warning` fuerte y se anota para revisión humana.

   La auditoría devuelve tres niveles:
   - **`critical`**: el bootstrap **aborta**. Ejemplos: contraste
     declarado PASS que falla, tokens referenciados indefinidos.
   - **`warning`**: el bootstrap **continúa** pero los avisos quedan
     anotados en el commit final.
   - **`info`**: se muestran pero no bloquean.

3. **Verificación de roadmap previo**. Comprueba que `.specify/memory/roadmap.md` no
   existe. Si ya existe, pregunta si regenerar (con backup).

4. **Invocación del architect**. Invoca al subagente `architect` vía el
   tool `task` con `subagent_type: "architect"`. Le pasa en el prompt
   los paths a los archivos de memoria (constitución, product,
   architecture, y design.md si existe). El architect genera el
   roadmap aplicando sus reglas — si hay `design.md`, incluye la
   feature `visual-system-implementation` como fundacional.

5. **Aprobación del humano**. Muestra el roadmap y pide `y/n` (usa el
   tool `question` si está disponible, o pausa y espera respuesta).

6. **Commit**. Si el humano aprueba, guarda `.specify/memory/roadmap.md` y hace commit
   con mensaje que incluye el resumen de la auditoría.

## Uso

```
/bootstrap-project
```

## Lo que ves al final

**Proyecto con design.md, auditoría limpia:**

```
✓ Constitución verificada
✓ Product verificado
✓ Architecture verificado
✓ Design detectado — ejecutando auditoría inline...
  · Contraste WCAG: 7/7 pares verificados PASS
  · Token references: 0 undefined
  · Hex crudos en componentes: 0
✓ Auditoría de design.md: sin hallazgos críticos
  · 2 warnings (revisables):
    - "type.eyebrow uso no restringido en la sección 3.5"
    - "space.section.sm posiblemente redundante con space.stack.xl"

▶ Invocando architect via task tool...
✓ Roadmap generado con 15 features
  · Feature fundacional 'visual-system-implementation' en posición 004

[muestra el roadmap]

¿Apruebas este roadmap? (y/n)
```

**Proyecto con design.md, auditoría bloqueante:**

```
✓ Constitución verificada
✓ Product verificado
✓ Architecture verificado
✓ Design detectado — ejecutando auditoría inline...
  · Contraste WCAG: 6/7 pares PASS, 1 FAIL
  · Token references: 1 undefined
✗ Auditoría de design.md: 2 hallazgos críticos — bootstrap abortado.
  · CRITICAL: color.fg.muted (#6b6660) sobre bg.canvas (#faf8f5)
    declarado PASS AA en §2.3 pero cálculo real da 4.2:1 (<4.5:1).
  · CRITICAL: Button.primary consume 'color.accent.hover' pero este
    token no está definido en §2.2.

Corrige el design.md y vuelve a ejecutar /bootstrap-project.
```

**Proyecto sin design.md (backend, CLI, servicio):**

```
✓ Constitución verificada
✓ Product verificado
✓ Architecture verificado
· No se detecta design.md — proyecto sin superficie visual, se omite auditoría.
▶ Invocando architect via task tool...
✓ Roadmap generado con 12 features

[muestra el roadmap]

¿Apruebas este roadmap? (y/n)
```

## Implementación técnica en opencode

- La auditoría de contraste se hace con un script Node inline ejecutado
  vía `bash`. El script lee `.specify/memory/design.md`, extrae los pares
  de la tabla §2.3, busca los hex en §2.2, calcula el ratio con la
  fórmula WCAG 2.1 (`(L1+0.05)/(L2+0.05)`) y reporta PASS/FAIL.
- La verificación de tokens se hace con `grep` buscando referencias en
  sección 7 y contrastando con definiciones en secciones 2–5.
- La invocación del architect se hace con el tool `task`:
  `task({ subagent_type: "architect", prompt: "...", description: "..." })`
- La pregunta de aprobación usa el tool `question` si está disponible.

## Notas

- **No depende de ningún plugin externo.** Toda la auditoría es
  programática (Node script + grep). Funciona en cualquier instalación
  de opencode sin skills adicionales.
- El resumen de auditoría queda anotado en el body del commit del
  `.specify/memory/roadmap.md` para trazabilidad.
- Si el proyecto ya tiene `.specify/memory/roadmap.md`, pregunta antes de sobrescribir
  y hace backup del anterior como `roadmap.backup.md`.