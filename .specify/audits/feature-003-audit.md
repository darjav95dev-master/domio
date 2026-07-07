# Auditoría · Feature 003 · visual-system-implementation

> Generado por `code-auditor` (modelo: claude-sonnet-4-6)
> Fecha: 2026-07-07 15:00
> Commits auditados: 7e3e6bf → c751b89 (merge 7cad68c)
> Archivos modificados: 34 archivos, +1708 / -28 líneas

---

## Resumen ejecutivo

La feature materializa design.md en código con notable fidelidad: tokens CSS
completos, fuentes correctas, cinco componentes primitivos con atributos a11y
exigidos por constitution.md §6, y cobertura de tests que pasa al 100% en su
suite específica. La arquitectura de tokens en globals.css es sólida y cubre
la paleta completa de design.md §2.

Hay dos hallazgos mayores: el z-index del token `--z-toast` (80) queda por
debajo del token `--z-nav` (100), invirtiendo el orden arquitectónico definido
en design.md §19 — los toasts se renderizarán detrás de la barra de navegación
en cuanto una feature los use. El segundo mayor es que tests e implementación
coexisten en el mismo commit, violando la disciplina TDD marcada como
obligatoria en las propias tareas de la feature. No se identifican hallazgos
críticos.

| Severidad | Cantidad |
|-----------|----------|
| Críticos  | 0        |
| Mayores   | 2        |
| Menores   | 7        |

**Veredicto:** AMARILLO

---

## Hallazgos críticos

Ninguno.

---

## Hallazgos mayores

### M1 · Z-index de toast inferior al de nav — bug de capas funcional

- **Archivo:** `app/globals.css:286–294`
- **Regla violada:** design.md §19 (Z-index scale)
- **Confianza:** alta
- **Descripción:** El scale implementado no respeta el orden de diseño. El
  token `--z-toast: 80` es inferior a `--z-nav: 100`, lo que hará que los
  Toasts queden tapados por la barra de navegación fija cuando ambos
  coexistan en pantalla. Design.md §19 establece nav=100 y toast=500.
  Además faltan los tokens `above: 1` (promo-badges) y `overlay-max: 9999`
  (skip-to-content / dev overlays), y los valores intermedios divergen
  completamente (dropdown=10 vs 200, modal-backdrop=40 vs 300, modal=50 vs 400).

- **Código actual:**

  ```css
  --z-base: 0;
  --z-dropdown: 10;      /* design.md: 200 */
  --z-sticky: 20;        /* design.md: 10  */
  --z-fixed: 30;         /* no está en design.md */
  --z-modal-backdrop: 40; /* design.md: 300 */
  --z-modal: 50;          /* design.md: 400 */
  --z-popover: 60;        /* no está en design.md */
  --z-tooltip: 70;        /* no está en design.md */
  --z-toast: 80;          /* design.md: 500 — DEBAJO DE NAV */
  --z-nav: 100;           /* design.md: 100 ✓ */
  ```

- **Fix propuesto:**

  ```css
  --z-base:            0;
  --z-above:           1;      /* promo-badges, image-tags */
  --z-sticky:          10;     /* aside sticky */
  --z-nav:             100;    /* nav fixed */
  --z-dropdown:        200;
  --z-modal-backdrop:  300;
  --z-modal:           400;
  --z-toast:           500;    /* SOBRE nav, modales y todo lo demás */
  --z-overlay-max:     9999;   /* skip-to-content, dev overlays */
  ```

  Ajustar también el bloque `@theme inline` para mapear los tokens renombrados:
  ```css
  --z-index-above:           var(--z-above);
  --z-index-sticky:          var(--z-sticky);
  /* ... resto igual con los nuevos valores */
  --z-index-toast:           var(--z-toast);
  --z-index-overlay-max:     var(--z-overlay-max);
  ```

- **Justificación del fix:** Restaura el orden arquitectónico definido en
  design.md §19. Con toast=500 y nav=100 se garantiza que las notificaciones
  siempre aparecen sobre la navegación. Los tokens que no están en design.md
  (`--z-fixed`, `--z-popover`, `--z-tooltip`) deben eliminarse para no crear
  divergencia de la fuente de verdad — los valores disponibles en design.md
  son suficientes.

---

### M2 · TDD roto: tests e implementación en el mismo commit

- **Archivo:** `tests/shared/components/*.test.tsx` + `src/shared/components/*.tsx` (commit `074a8d0`)
- **Regla violada:** constitution.md §3 — TDD obligatorio; tasks.md T006–T010 marcadas [P] (primero)
- **Confianza:** alta
- **Descripción:** Las tareas T006–T010 están marcadas con `[P]` indicando
  explícitamente que los tests deben preceder a la implementación. Sin embargo,
  todos los archivos de test (`button.test.tsx`, `input.test.tsx`,
  `skeleton.test.tsx`, `toast.test.tsx`, `media-image.test.tsx`) y todos los
  archivos de implementación (`button.tsx`, `input.tsx`, etc.) aparecen en el
  mismo commit `074a8d0`. No existe ningún commit anterior en la rama donde
  los tests existieran en estado rojo (RED phase). Las fases RED → GREEN →
  REFACTOR no se ejecutaron — los tests se escribieron a posteriori junto con
  la implementación.

- **Fix propuesto:** No hay fix de código: el código funciona correctamente.
  El fix es de proceso: en futuras features, los commits de test deben
  preceder a los de implementación. Para documentación del TFM, registrar
  este hallazgo como excepción justificada (feature de infraestructura visual,
  no lógica de negocio).

- **Justificación:** La metodología SDD del proyecto marca TDD como
  obligatorio en lógica de negocio; los components UI primitivos son un área
  de aplicabilidad más débil. Sin embargo, la decisión de marcar T006–T010
  como [P] en tasks.md crea una expectativa explícita que no se cumplió.

---

## Hallazgos menores

### m1 · Fraunces cargada como variable font, design.md especifica pesos discretos

- **Archivo:** `app/layout.tsx:9`
- **Regla violada:** design.md §12.5
- **Confianza:** alta
- **Descripción:** design.md especifica `weight: ["400", "500", "600", "700"]`
  para Fraunces. La implementación usa `weight: "variable"` que descarga el
  archivo de fuente variable completo (toda la gama de pesos), resultando en
  un payload de fuente mayor que los cuatro pesos estáticos especificados.
- **Código actual:** `weight: "variable"`
- **Fix propuesto:** `weight: ["400", "500", "600", "700"],`

---

### m2 · Skeleton en reduced-motion muestra gradiente estático, no fondo sólido

- **Archivo:** `src/shared/components/skeleton.tsx` + `app/globals.css:347–359`
- **Regla violada:** design.md §17 ("Reduced-motion: static `bg: paper-2`, no shimmer")
- **Confianza:** media
- **Descripción:** La regla global `prefers-reduced-motion` colapsa las
  animaciones a `0.01ms`, deteniendo el shimmer. Sin embargo, el Skeleton
  mantiene su `background-image: linear-gradient(90deg, ...)` como fondo
  estático en vez de un sólido `bg-surface-sunken`. Design.md §17 es explícito:
  bajo reduced-motion el skeleton debe tener fondo sólido `paper-2`, no un
  gradiente freezado.
- **Fix propuesto:** Añadir regla CSS específica para Skeleton:

  ```css
  @media (prefers-reduced-motion: reduce) {
    [data-skeleton] {
      background-image: none;
      background-color: var(--bg-surface-sunken);
    }
  }
  ```

  Y añadir `data-skeleton` al elemento raíz de `Skeleton`. Alternativamente,
  usar una clase Tailwind condicional:
  ```tsx
  "motion-reduce:bg-surface-sunken motion-reduce:bg-none animate-shimmer"
  ```

---

### m3 · Utilidad `cn` es concatenación naïve, no tailwind-merge

- **Archivo:** `src/shared/utils/cn.ts`
- **Regla violada:** constitution.md §4 — calidad de código
- **Confianza:** alta
- **Descripción:** La utilidad `cn` hace `filter(Boolean).join(" ")`. Si un
  consumidor pasa `className="px-4"` a un Button con `px-[30px]`, ambas
  clases coexistirán, ganando la última por especificidad CSS — comportamiento
  impredecible. El estándar del ecosistema para Tailwind es `clsx` +
  `tailwind-merge` que resuelve conflictos.
- **Código actual:**
  ```ts
  export function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
  }
  ```
- **Fix propuesto:**
  ```ts
  import { clsx, type ClassValue } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
  }
  ```
  Requiere `pnpm add clsx tailwind-merge`.

---

### m4 · Ghost button usa utilidades `white` hardcoded en vez de token semántico

- **Archivo:** `src/shared/components/button.tsx:40–43`
- **Regla violada:** design.md §12.2 — "Componentes NUNCA usan hex crudos. Siempre `var(--…)` o utilities de @theme"
- **Confianza:** media
- **Descripción:** El variant ghost usa `bg-white/[0.12]`, `border-white/40`,
  `text-white` que son utilidades Tailwind predefinidas que referencian `#fff`
  crudo, no tokens del sistema. El espíritu de design.md §12.2 es que toda
  referencia de color resuelva a un token semántico propio del sistema.
- **Fix propuesto:** Definir un token específico para ghost-over-photography:
  ```css
  :root {
    --ghost-bg:     rgba(255,255,255,.12);
    --ghost-border: rgba(255,255,255,.40);
    --ghost-fg:     #ffffff;
    --ghost-bg-hover: rgba(255,255,255,.22);
  }
  ```
  Y en `@theme inline`:
  ```css
  --color-ghost-bg:    var(--ghost-bg);
  --color-ghost-border: var(--ghost-border);
  --color-ghost-fg:    var(--ghost-fg);
  ```
  Entonces en el componente:
  ```tsx
  ghost: cn(
    pillShape,
    "border-[1.5px] border-ghost-border bg-ghost-bg px-[26.5px] py-[13.5px]",
    "text-ghost-fg backdrop-blur-[8px] hover:bg-ghost-bg-hover",
    disabledStyles,
  ),
  ```

---

### m5 · `Input` usa `forwardRef` sin directiva `"use client"`

- **Archivo:** `src/shared/components/input.tsx:1`
- **Regla violada:** constitution.md §1 (coherencia de stack Next.js App Router)
- **Confianza:** media
- **Descripción:** `Button`, `Toast` y `MediaImage` llevan `"use client"`.
  `Input` y `Skeleton` no lo llevan. `Input` usa `forwardRef` para exponer
  una ref al DOM — si un Server Component importa `Input` directamente, la
  ref silenciosamente no funcionará. El patrón consistente en el proyecto es
  marcar con `"use client"` cualquier componente que expone o usa refs.
- **Fix propuesto:** Añadir en la primera línea de `input.tsx`:
  ```tsx
  "use client";
  ```

---

### m6 · Archivo `.eslintignore` deprecado genera warning en ESLint v9

- **Archivo:** `.eslintignore`
- **Regla violada:** constitution.md §4 (herramientas de calidad sin warnings)
- **Confianza:** alta
- **Descripción:** El proyecto usa ESLint v9 (flat config). El archivo
  `.eslintignore` está explícitamente deprecado en ESLint v9 y emite el
  warning: `"The ".eslintignore" file is no longer supported."` en cada
  ejecución de `pnpm lint`. El ignore de `.design-audit/` que ese archivo
  aplica ya está en `eslint.config.mjs` como `globalIgnores([".design-audit/**"])`.
- **Fix propuesto:** Eliminar el archivo `.eslintignore`. La entrada
  `.design-audit/` ya está cubierta en `eslint.config.mjs`.

---

### m7 · Indirección de fuente redundante en `:root` (`--font-body`)

- **Archivo:** `app/globals.css:234–236`
- **Regla violada:** design.md §12.1 (implementación técnica de tokens)
- **Confianza:** baja
- **Descripción:** La cadena de resolución de la fuente sans es:
  `--font-sans → --font-body → --font-inter`. Design.md §12.1 especifica
  una cadena directa `--font-sans → --font-inter`. La variable intermedia
  `--font-body` en `:root` no aporta valor y añade una hop innecesaria.
- **Fix propuesto:**
  ```css
  /* En @theme inline */
  --font-sans: var(--font-inter);  /* directo, eliminando --font-body */
  ```
  Y eliminar `--font-body: var(--font-inter)` de `:root`.

---

## Coherencia con features previas

Feature 003 es la primera feature de UI del proyecto. No existe código anterior
de UI contra el que detectar duplicaciones. El `src/shared/components/` estaba
vacío antes de esta feature. No se detectan imports cruzados (no hay features
UI previas). No se detectan abstracciones prematuras — los cinco componentes
primitivos (Button, Input, Skeleton, Toast, MediaImage) son exactamente los
que dictan spec.md y architecture.md §5. La ubicación en `src/shared/components/`
es correcta conforme a la Scope Rule de constitution.md §2.

La feature establece el sistema de diseño como infraestructura fundacional para
todas las features de UI futuras, lo que es el propósito correcto declarado en
constitution.md §11.5. El barrel export en `src/shared/components/index.ts`
permite consumo limpio sin imports directos a archivos internos.

---

## Veredicto de tests

**Nivel de confianza en la suite: MEDIA**

Los 14 tests de la suite específica de F003 pasan al 100% y cubren los contratos
a11y más importantes: label asociado en Input, aria-describedby en error state,
role/aria-live en Toast, role/aria-hidden en Skeleton, alt obligatorio en
MediaImage, fallback en error de imagen, y focus-visible ring con lectura del
CSS real (técnica pragmática pero efectiva).

Sin embargo, la suite tiene huecos relevantes:
- No hay test de `autoDismiss` / `onDismiss` en Toast (timer interno)
- No hay test de Skeleton bajo `prefers-reduced-motion` (el hallazgo m2)
- El Button test verifica la ring leyendo el archivo CSS con `readFileSync` —
  funciona, pero es frágil ante refactors de globals.css y no verifica el
  comportamiento en renderizado
- No se prueban estados de carga (loading state con `aria-busy`)

El hallazgo principal (M2) es que los tests fueron escritos simultáneamente
con la implementación en el mismo commit, lo que indica ausencia del ciclo
RED → GREEN → REFACTOR. Los tests no cuentan con evidencia de haber fallado
antes de que existiera código. Son correctos en contenido pero post-hoc en
proceso.

---

## Métricas

- Archivos modificados: 34 archivos (nueva estructura desde cero)
- Líneas añadidas / borradas: +1708 / -28
- Cobertura medida en esta feature: no ejecutada en aislamiento (suite completa requiere BD)
- Cobertura específica de tests F003: 14/14 tests pasan
- Complejidad cognitiva máxima encontrada: < 5 (todos los componentes son simples)
- Tiempo de ejecución de tests F003: 490ms (5 archivos)
- TypeScript: 0 errores (`pnpm tsc --noEmit` limpio)
- ESLint: 0 errores, 1 warning (`.eslintignore` deprecado — m6)

---

## Recomendación

ACEPTAR CON REPARACIONES RECOMENDADAS

La feature entrega una base sólida y correcta. Los tokens CSS son fieles a
design.md, los primitivos a11y cumplen constitution.md §6, los tests son
correctos en contenido. El hallazgo M1 (z-index de toast < nav) es el único
que tiene impacto funcional directo — producirá toasts ocultos detrás de la
navegación en cuanto cualquier feature use el componente Toast en una página
con nav fijo. Debe corregirse antes de que F003 se use como base de una
feature de UI real.

El hallazgo M2 (TDD) es de proceso; el código producido es correcto.

Los siete hallazgos menores son mejoras de calidad sin impacto en producción
inmediato. Se recomienda abordar m3 (`cn` → `tailwind-merge`) y m6 (eliminar
`.eslintignore`) en la próxima sesión de trabajo, antes de que más features
los propaguen.
