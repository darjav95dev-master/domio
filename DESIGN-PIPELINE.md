# Design + SDD Pipeline — guía completa del flujo

> Cómo se produce, de cero y de forma repetible, una web **distintiva, llena y
> top a nivel gráfico** — no genérica-que-luego-se-rescata. Este documento es la
> referencia única del proceso: qué herramientas hay, en qué orden se usan, qué
> hace cada agente y qué decides tú.
>
> Target principal: **opencode** (agentes/comandos en `.opencode/` + `opencode.json`).
> El motor de diseño vive en `~/.claude/skills/visual-design-kit/` (global, copia
> única) y opencode lo lee desde ahí. Hay un espejo `.claude/agents|commands` que
> **solo usa Claude Code** (opencode no lo lee) — ver §7 para la distinción.

---

## 0. El problema que resuelve (por qué existe esto)

El flujo SDD original (constitution → product → architecture → roadmap →
features) ejecutaba con disciplina, pero **el `design.md` era un input huérfano**:
nadie lo generaba con criterio, y `/bootstrap-project` solo lo *auditaba*
(contraste, tokens) — comprobaba que fuera **correcto**, nunca que fuera
**distintivo**. Resultado: entraba un diseño genérico (el "AI-default trap") y
todo lo demás lo materializaba con fidelidad. Diseño mediocre, ejecución
impecable.

Dos fallos concretos que sufrimos y que este pipeline ahora atrapa:

1. **"Se ve genérica"** → faltaba un **gate de dirección visual** antes del
   bootstrap. Ahora existe: `/design-bootstrap`.
2. **"Se ve vacía / 0 libros / portadas negras"** → faltaba **validar el render
   real**. Ahora existe: el bucle `design-critic` con Playwright + un suelo
   funcional en el orchestrator.

La regla de oro nueva: **dos filtros + un bucle**. Trap-check (distintivo) +
rúbrica de excelencia (bueno) + validación visual del render (verificado, no
asumido).

---

## 1. El ciclo completo (de 0 a merge)

```
FASE 0 · FUNDAMENTOS (a mano, una vez por proyecto)
  .specify/memory/constitution.md   principios de ingeniería (reutilizable)
  .specify/memory/product.md        qué es y para quién
  .specify/memory/architecture.md   stack y decisiones
        │
        ▼
FASE 1 · DIRECCIÓN VISUAL   ← el gate que faltaba
  /design-bootstrap  (lo ejecutas y arranca solo; invoca al subagente
                      design-director vía task, que carga visual-design-kit)
    · clasifica SECTOR → 3 familias estéticas distintas
    · referencias reales (webfetch + librería semilla; WebSearch si hay)
    · 3 direcciones: paleta por motor + trap-check(10) + rúbrica(≥13/16) + refs
    · TÚ eliges una
    · genera design.md (§0–§20, plantilla rica) + .palette-ledger.md
        │
        ▼
FASE 2 · BOOTSTRAP
  /bootstrap-project
    · audita design.md: contraste + tokens + anti-trap + firma
    · architect lee design.md → inserta 'visual-system-implementation' fundacional
    · genera roadmap.md → TÚ apruebas
        │
        ▼
FASE 3 · EJECUCIÓN POR FEATURE (se repite por cada feature del roadmap)
  /execute-feature NNN → agente orchestrator
    · feature-briefer → /speckit-specify → clarify → plan → tasks → analyze
    · /speckit-implement con delegación:
        tarea dominio → backend-developer
        tarea UI      → frontend-developer (carga design-taste-frontend; design.md manda)
        tdd-enforcer vigila antes y después
    · quality-reviewer (código)
    · design-critic (SOLO features de UI): render real → suelo funcional + rúbrica
        < 13/16 o suelo FAIL → fixes al frontend-developer → re-build → re-corre
    · tfm-documenter → rama lista para merge (el merge lo haces TÚ)
```

**Orden crítico:** `visual-system-implementation` se construye **primero** (tokens,
fuentes, primitives, el componente-firma). Todas las páginas después consumen
esos primitives. Sin eso, cada página reinventa tokens y el diseño deriva.

---

## 2. Las herramientas, una por una

### 2.1 Skills (globales, en `~/.claude/skills/`, accesibles desde opencode)

| Skill | Rol | Cuándo se carga |
|---|---|---|
| **`visual-design-kit`** | El motor de dirección visual. Genera `design.md`. Contiene sector-map, motor de paleta, rúbrica, traps(10), referencias, y los agentes director/critic canónicos | La carga el `design-director` en Fase 1 y el `design-critic` en Fase 3 |
| **`design-taste-frontend`** | Baseline de gusto anti-slop (tipografía, imágenes reales, AI-tells). Alimenta la rúbrica | La carga el `frontend-developer` en features de alto peso visual. **`design.md` manda sobre la skill** |

### 2.2 Agentes (`.opencode/agents/` y espejo en `.claude/agents/`)

Modelos: todos **opencode-go** (cero Claude). El único `primary` es el
`orchestrator`; el resto son `subagent` (invocados vía `task`).

| Agente | Modo · Modelo | Qué hace |
|---|---|---|
| **`design-director`** | subagent · `deepseek-v4-pro` | Fase 1. Genera `design.md` vía el kit. Invocado por `/design-bootstrap` en 2 llamadas (propone 3 / genera tras tu pick). No escribe código |
| **`design-critic`** | subagent · `qwen3.7-plus` **(visión)** | Fase 3. Renderiza con Playwright y puntúa el render real contra la rúbrica. Suelo funcional primero. Necesita visión sí o sí |
| **`architect`** | subagent · `deepseek-v4-pro` | Fase 2. Descompone en `roadmap.md`. Lee `design.md` e inserta la feature visual fundacional |
| **`orchestrator`** | **primary** · `deepseek-v4-pro` | Fase 3. Coordina el ciclo completo de una feature. Gate visual (paso 12b) |
| **`frontend-developer`** | subagent · `kimi-k2.7-code` | Implementa UI consumiendo `design.md`. Carga `design-taste-frontend` cuando el gusto pesa |
| **`backend-developer`** | subagent · `kimi-k2.7-code` | Implementa dominio (repos, servicios, migraciones, seeds) |
| **`quality-reviewer`** | subagent · `deepseek-v4-pro` | Revisa el código contra constitution/architecture |
| **`refactor-suggester` / `code-auditor`** | subagent · `deepseek-v4-pro` | Auditoría/deuda técnica bajo demanda |
| **`tdd-enforcer`** | subagent · `deepseek-v4-flash` | Vigila el ciclo RED→GREEN→REFACTOR en cada tarea |
| **`feature-briefer`** | subagent · `deepseek-v4-flash` | Prepara el brief de cada feature antes de `/speckit-specify` |
| **`tfm-documenter`** | subagent · `deepseek-v4-flash` | Anota evidencia de cada feature |
| **`contract-guardian`** | subagent · `minimax-m2.7` | Verifica contratos HTTP si la feature los toca |

> **Modelos declarados en dos sitios que deben coincidir:** `opencode.json` **y**
> el frontmatter de cada `.opencode/agents/*.md`. Si cambias uno, cambia el otro.
> Los espejos `.claude/agents/` corren bajo Claude Code (inherentemente Claude);
> no afectan a opencode.

### 2.3 Comandos (`.opencode/commands/` y espejo en `.claude/commands/`)

| Comando | Hace |
|---|---|
| **`/design-bootstrap`** | Fase 1. **Lo ejecutas y arranca solo** (igual que `/bootstrap-project`): invoca al subagente `design-director` vía `task` en 2 llamadas — propone 3 direcciones → eliges → genera `design.md`. Sin Tab |
| **`/bootstrap-project`** | Fase 2. Audita `design.md` + genera `roadmap.md` invocando al `architect` vía `task` |
| **`/execute-feature NNN`** | Fase 3. Ejecuta una feature completa vía el `orchestrator` (primary; se entra con Tab) |
| **`/audit-project` · `/audit-codebase`** | Auditorías de deuda/calidad bajo demanda |

> **Patrón de ejecución:** `/design-bootstrap`, `/bootstrap-project` y los audits
> se **auto-ejecutan** al lanzar el comando (coordinan invocando subagentes vía
> `task`). `/execute-feature` va contra el `orchestrator`, que es `primary`.

### 2.4 Script (`.opencode/scripts/visual-capture.mjs`)

El "ojo". Usa el **Playwright propio del proyecto** (sin MCP, sin instalar nada:
el Chromium ya está en caché). Captura las rutas a desktop + mobile, **hace
auto-scroll para disparar los reveals** antes de capturar, y sale con código ≠ 0
si una ruta falla. Lo invoca el `design-critic`:

```bash
node .opencode/scripts/visual-capture.mjs \
  --base-url http://localhost:3000 \
  --routes / /catalog /books/<slug-real> \
  --out .design-audit
```

---

## 3. El motor de diseño por dentro (`visual-design-kit/references/`)

Lo que convierte el kit de **filtro negativo** ("evita 3 looks") a **motor
positivo** (variedad + excelencia fiables):

| Fichero | Qué aporta |
|---|---|
| **`sector-aesthetic-map.md`** | ~20 familias por sector. Cada dirección arranca de una familia distinta ⇒ **variedad por construcción** y esquiva el default del sector |
| **`palette-engine.md`** | Paleta como procedimiento: neutrales primero, acento no-default, `accent.text` AA-safe, contraste pre-verificado, y **ledger de rotación** (no repite familia entre proyectos) |
| **`excellence-rubric.md`** | 8 palancas puntuables (llena la página, imágenes reales, tipografía con personalidad, firma con peso, ritmo, motion motivado, un acento, variedad). **Umbral ≥ 13/16** |
| **`ai-default-traps.md`** | **10** traps (cream+serif, dark+acid, broadsheet, AI-purple, glass-everything, clon-Linear, 3-cards, mesh-startup, azul-corporativo, shadcn-default) |
| **`reference-library.md`** | Fuentes reales verificadas (Awwwards, Typewolf, Color Hunt, Godly…) + tipografía actual libre (Bricolage Grotesque, Space Grotesk…). **Tool-agnóstico:** webfetch + librería semilla en opencode; WebSearch si el runtime lo tiene |
| **`token-taxonomy.md`** | El vocabulario de tokens que todo `design.md` define y el guardian enforca |

**La firma es obligatoria.** Toda dirección compromete un gesto estructural
memorable (bandas, chapter-markers, index-spine…). Sin firma = genérica.

**La plantilla del `design.md` es rica por obligación (§12–§20).** Además de los
cimientos (§0–§11: paleta, tipografía, componentes), el director rellena las
secciones que fuerzan densidad nivel Kiosco: **§12 imagen real (mandato)**,
**§13 densidad y composición (mandato)**, **§14 spec vista-por-vista** (el mayor
driver de riqueza: ≥3 bloques compuestos por vista), §15 tabla de motion, §16
estados, §17 responsive, §18 z-index, §19 overflow, §20 mapping técnico + fuentes.
Un `design.md` con §12–§20 vacías es incompleto — por eso las páginas salen
llenas y no delgadas.

**Datos verificados (2026).** El motor de paleta y los traps están anclados en
tendencias reales: el pool de acentos no-default incluye persimmon `#f97316`,
teal `#14b8a6`, electric-green `#10b981`, plum; y los traps registran que el
"trend 2026" (violeta `#8b5cf6` + gradientes) **es** el AI-default a evitar.

---

## 4. Cómo usarlo (paso a paso)

### 4.1 Proyecto nuevo con superficie visual

1. Escribe `constitution.md`, `product.md`, `architecture.md` en `.specify/memory/`.
2. Escribe el brief de diseño en `design/brief.md` (o corre `/design-bootstrap`
   una vez y te copia la plantilla para rellenar).
3. **`/design-bootstrap`** → el director propone 3 direcciones. **Elige una.** →
   escribe `design.md`.
4. **`/bootstrap-project`** → audita `design.md` + genera `roadmap.md` (con
   `visual-system-implementation` primero). **Apruébalo.**
5. **`/execute-feature 00X`** empezando por `visual-system-implementation`, luego
   las páginas. En cada feature de UI, el `design-critic` valida el render y no
   cierra hasta ≥13/16 con suelo funcional PASS.
6. Revisa los screenshots en `.design-audit/` y **haz el merge tú**.

### 4.2 Rediseño de un proyecto existente (el caso "se ve genérica/vacía")

1. `/design-bootstrap` para generar una **nueva** dirección (archiva la vieja).
2. Actualiza `design.md`; el `design-guardian` marcará la deriva en cada diff.
3. Ejecuta la feature de re-implementación visual; el `design-critic` cierra el
   bucle contra el render.

### 4.3 Proyecto sin superficie visual (backend/CLI/servicio)

Salta la Fase 1. `/bootstrap-project` detecta que no hay `design.md` y omite la
auditoría y la feature visual. El resto del ciclo es igual.

---

## 5. Los dos guardarraíles de calidad

**Filtro 1 — Trap-check (distintivo).** Cada dirección se auto-evalúa contra los
10 traps. Un default reconocible sin justificación del brief se revisa.

**Filtro 2 — Rúbrica de excelencia (bueno).** 8 palancas, ≥13/16 para ser
presentable/embarcable. Evitar lo genérico no basta; una dirección libre de
traps pero plana no se embarca.

**El bucle — Suelo funcional + validación visual (verificado).** Antes de
puntuar estética, el `design-critic` exige que la app **renderice contenido
real** (no "0 resultados", no portadas rotas). Luego puntúa el render de verdad.
Below 13 → fixes → re-render. Esto convierte "se ve increíble" de *asumido* a
*verificado*.

Heredado al `constitution.md` (§6 y §10), para que todo proyecto futuro lo
respete: *"una página de puro texto es trabajo incompleto"* y *"todo contenido
externo lleva fallback verificado renderizando"*.

---

## 6. Fuentes / dependencias (qué tiene que existir)

**Imprescindible — todo self-contained, sin cuentas ni MCP:**

| Fuente | Estado |
|---|---|
| Modelos **opencode-go** en los 12 agentes (cero Claude) | ✅ el `design-critic` usa `qwen3.7-plus` **con visión** (imprescindible para puntuar screenshots) |
| Skills globales (`visual-design-kit`, `design-taste-frontend`) | ✅ accesibles desde opencode |
| `webfetch` (referencias reales) | ✅ activo en orchestrator y design-director |
| Playwright + Chromium (bucle visual) | ✅ ya instalado (paquete + binario en caché) |
| Docker + Postgres (datos reales para validar) | ✅ (`pnpm db:setup`) |
| Red a Open Library / Google Fonts / picsum | ✅ |

**Opcional (power-ups, no requeridos):** Google Stitch+MCP, Firecrawl API key,
Figma token. El pipeline no los necesita.

**Único setup manual real:** ninguno pendiente — el Chromium de Playwright ya
está. Si en otra máquina faltara: `npx playwright install chromium`.

---

## 7. Mapa de ficheros (dónde vive todo)

> ⚠ OJO con las dos cosas que llevan "claude" en el nombre — NO son lo mismo:
> - `~/.claude/skills/` (GLOBAL, a nivel de usuario) → **opencode SÍ lo lee**
>   (lo configuraste así). Aquí vive el motor, en **copia única**.
> - `<proyecto>/.claude/agents|commands` (proyecto) → **opencode NO lo lee**.
>   Es de Claude Code (el CLI). Opencode usa `.opencode/agents|commands`.

```
~/.claude/skills/visual-design-kit/     ← EL MOTOR · copia ÚNICA · opencode SÍ lo lee
  SKILL.md                                (global, editable, tuyo; no se duplica)
  agents/design-director.md · design-critic.md
  templates/direction-proposal.md · design.md · design-brief.md
  references/sector-aesthetic-map.md · palette-engine.md · excellence-rubric.md
             ai-default-traps.md · reference-library.md · token-taxonomy.md
  → busca aquí ai-default-traps.md; NO está en ~/.config/opencode/skills/

<proyecto>/.opencode/                    ← PIPELINE OPENCODE · lo que opencode ejecuta
  agents/design-director.md (subagent) · design-critic.md · architect.md(edit) · orchestrator.md(edit)
  commands/design-bootstrap.md (auto-ejecuta) · bootstrap-project.md(edit)
  scripts/visual-capture.mjs · design-md-hash.mjs · check-agent-models.mjs
  opencode.json (modelos opencode-go de los 12 agentes + permisos + webfetch)
  ⚠ el modelo de cada agente vive TAMBIÉN en el frontmatter del .md → deben coincidir
     (lo vigila `pnpm check:agents`)

<proyecto>/.claude/agents|commands/      ← ESPEJO CLAUDE CODE · opencode NO lo lee
  (solo se usa si corres Claude Code en este repo; para tu flujo opencode es inerte)
  agents/design-director.md · design-critic.md · architect.md(edit) · orchestrator.md(edit)
  commands/design-bootstrap.md · bootstrap-project.md(edit)

<proyecto>/.specify/memory/                   ← memoria del proyecto
  constitution.md(edit: §6 y §10) · product.md · architecture.md
  design.md (generado) · roadmap.md (generado)

<proyecto>/design/                            ← artefactos de dirección
  brief.md · direction-0N-*.md · .palette-ledger.md

<proyecto>/.design-audit/                     ← screenshots del critic + validation-log.json (gitignored)
```

**Nivelación (dos niveles distintos):**
- **El motor NO se duplica:** `visual-design-kit` vive en `~/.claude/skills/`
  (copia única) y lo leen los dos runtimes. Editas ahí una vez y vale para ambos.
- **Los agentes/comandos SÍ se duplican por formato:** `.opencode/agents|commands`
  (lo que ejecuta opencode) y `.claude/agents|commands` (fallback de Claude Code).
  El **target primario es `.opencode/`**; el `.claude/` es espejo para Claude Code
  y opencode no lo lee. Por eso solo los agentes/comandos necesitan mantenerse
  sincronizados a mano — el motor no.

---

## 8. Caso de referencia — BookRack / "Kiosco"

Cómo se validó todo esto en la práctica:

- La primera versión de BookRack era **Trap 1** (cream + Fraunces + sienna): un
  `design.md` accesible y coherente… y genérico. El bootstrap lo aprobó porque
  solo auditaba contraste. **Este es el hueco que el anti-trap gate cierra.**
- Al pivotar, el `design-director` (con sector-map + trap-check) propuso 3
  familias editoriales distintas; se eligió **Kiosco** (revista color-blocked:
  bandas, numerales grandes, portadas reales, tangerina como único acento).
- Al construirlo, el **bucle visual cazó un bug real**: el home salía vacío
  porque los `ScrollReveal` en `opacity:0` no se revelaban en el screenshot. Se
  corrigió el script (auto-scroll) y se verificó el render de verdad — exactamente
  lo que el pipeline debe hacer antes de dar algo por bueno.

La lección, ya incorporada al sistema: **no basta con generar bien; hay que
mirar el resultado renderizado y puntuarlo.** Ese bucle es lo que hace que el
resultado sea top *de una vez*, y no por suerte.

---

## 9. Resumen en una frase

`/design-bootstrap` fija una dirección **distinta por sector, excelente por
rúbrica y no-genérica por trap-check**; `/bootstrap-project` la audita y planifica
con la feature visual primero; `/execute-feature` la implementa y **el
design-critic la valida contra el render real** hasta que se ve top. Todo
self-contained en opencode (y espejado en Claude Code).
