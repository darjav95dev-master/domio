---
description: Bootstrap a new SDD project. Generates roadmap.md from existing constitution.md, product.md and architecture.md by invoking the architect subagent.
---

# /bootstrap-project

Inicializa un proyecto SDD generando el `roadmap.md` a partir de los
tres archivos de memoria ya escritos.

## Prerrequisitos

Los tres archivos deben existir en `.specify/memory/`:
- `constitution.md`
- `product.md`
- `architecture.md`

Si alguno falta, el comando se detiene y reporta cuál.

## Orden en el ciclo (importante)

Si el proyecto tiene superficie visual, **antes** de este comando corre
`/design-bootstrap` para generar el `design.md` (dirección visual con
sector-map + motor de paleta + rúbrica + trap-check). Este comando lo
**audita**, no lo crea.

## Lo que hace

1. Verifica que existen los tres archivos de memoria.
2. **Detecta `design.md`.** Si existe, lo audita antes de generar el roadmap:
   - **Contraste WCAG:** cada par de la §2.3 se calcula de verdad; un PASS
     declarado que en realidad falla es `critical` y aborta.
   - **Tokens y hex crudos:** cada token consumido en §7 existe en §2-5; sin hex
     fuera de la capa primitive.
   - **Anti-trap + firma (evita "correcto pero genérico"):** la §1 (firma) debe
     describir un gesto estructural real (si está vacía/genérica → `critical`);
     la §11 debe rechazar la página de puro texto/vacía; si el diseño reproduce
     un default reconocible (violeta+Inter+slate, cream+serif+terracotta) sin
     justificación en el brief → `warning` fuerte anotado.
   Si no hay `design.md`, se omite la auditoría (proyecto sin superficie visual).
3. Verifica que `roadmap.md` **no** existe (para no sobrescribir).
   Si ya existe, te pregunta si quieres regenerarlo (haciendo backup del anterior).
4. Invoca al subagente `architect` (que lee `design.md` e inserta
   `visual-system-implementation` como feature fundacional si aplica).
5. Te muestra el roadmap generado y te pide aprobación.
6. Si lo apruebas, lo guarda como `.specify/memory/roadmap.md` y hace commit.

## Uso

```
/bootstrap-project
```

## Lo que ves al final

```
✓ Constitución verificada
✓ Product verificado
✓ Architecture verificado
▶ Invocando architect...
✓ Roadmap generado con 14 features

[muestra el roadmap]

¿Apruebas este roadmap? (y/n)
```

Si apruebas, queda guardado y commiteado. Si no, te pide en qué
quieres iterar (añadir features, cambiar orden, ajustar tamaños) y
vuelve a invocar a `architect` con ese feedback.

## Después de este comando

Estás listo para ejecutar `/execute-feature 001` y empezar el flujo.
