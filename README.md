# SDD Template · Spec-Driven Development con orquestación de subagentes

> Plantilla reutilizable para arrancar cualquier proyecto de software
> usando Spec-Driven Development con Spec Kit (de GitHub), Claude Code,
> y una capa de subagentes especializados que orquestan el ciclo
> completo con disciplina automatizada.
>
> **Agnóstica al stack, al dominio y al propósito.** Sirve igual para
> una app comercial, un side-project, un OSS o un trabajo académico.

---

## Qué resuelve esta plantilla

Spec Kit oficial es excelente para descomponer una feature en spec →
plan → tasks → código, pero deja seis huecos:

1. **No descompone un proyecto entero en features** (lo hace el humano
   manualmente cada vez).
2. **No vigila TDD** durante la implementación.
3. **No revisa la calidad conceptual** del código producido.
4. **No mantiene contratos HTTP sincronizados** entre repositorios
   hermanos.
5. **No captura evidencia y métricas** feature a feature para
   trazabilidad posterior (auditoría, informe interno, memoria
   académica, paper, retrospectiva).
6. **Cada feature requiere intervención manual frecuente**, con
   fricción en los mismos puntos una y otra vez.

Esta plantilla **cubre los seis huecos** con siete subagentes
coordinados por un orquestador.

---

## Cómo funciona

```
┌─────────────────────────────────────────────────────────────────┐
│                        TÚ (humano)                              │
│   Edita constitution.md, product.md, architecture.md            │
│   Ejecutas /bootstrap-project y /execute-feature N              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATOR                              │
│   Coordina el ciclo completo SDD para cada feature              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   architect   │    │ feature-briefer │    │   /speckit-*     │
│  Roadmap.md   │    │ Brief de input  │    │  Spec Kit nativo │
└───────────────┘    └─────────────────┘    └──────────────────┘
                               │
                               ▼ durante /speckit-implement
                  ┌────────────────────────┐
                  │     tdd-enforcer       │
                  │  Vigila RED→GREEN      │
                  └────────────────────────┘
                               │
                               ▼ tras /speckit-implement
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌───────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ contract-     │    │ quality-        │    │ tfm-documenter   │
│ guardian      │    │ reviewer        │    │                  │
└───────────────┘    └─────────────────┘    └──────────────────┘

        Bajo demanda (cada 5-10 features):
        ┌────────────────────────┐
        │   refactor-suggester   │
        │   Backlog de deuda     │
        └────────────────────────┘
```

---

## Los tres archivos de memoria (lo que TÚ aportas)

```
.specify/memory/
├── constitution.md       ← Principios de ingeniería universales
├── product.md            ← Qué se construye y para quién
└── architecture.md       ← Cómo se traduce a stack concreto
```

**`constitution.md`** es agnóstica al proyecto: vale para cualquier
sistema que construyas. La plantilla ya incluye una base completa que
solo ajustas si cambian tus principios de ingeniería (TDD, cobertura,
accesibilidad, seguridad, prohibiciones absolutas).

**`product.md`** describe **qué se construye**: visión, actores,
recorridos, reglas de negocio, restricciones. En lenguaje natural, no
en features. Es la entrada del `feature-briefer`.

**`architecture.md`** describe **cómo se traduce a stack**: framework,
BD, autenticación, almacenamiento, esquema de datos, patrones. Es
específico del proyecto y se ajusta cuando cambia una decisión
técnica.

Los dos últimos empiezan como plantillas vacías que rellenas antes de
ejecutar `/bootstrap-project`.

---

## Los siete subagentes

| Subagente | Cuándo actúa | Qué produce |
|---|---|---|
| **architect** | Al bootstrap del proyecto y al añadir features | `roadmap.md` |
| **feature-briefer** | Antes de `/speckit-specify` | Brief para Spec Kit |
| **tdd-enforcer** | Durante `/speckit-implement` | Aprueba o rechaza cada tarea |
| **contract-guardian** | Si toca `api-contract/` | Aprueba o bloquea cambios de contrato |
| **quality-reviewer** | Tras `/speckit-implement` | Reporte de violaciones por severidad |
| **refactor-suggester** | Bajo demanda | `refactor-backlog.md` |
| **tfm-documenter** | Tras cada feature mergeada | Entrada en `tfm-evidencias.md` |

Y el **orchestrator** que los coordina a todos.

**Sobre `tfm-documenter`**: captura métricas objetivas por feature
(cobertura conseguida, número de checkpoints humanos, complejidad
cognitiva media, violaciones detectadas por severidad, tiempo total,
número de iteraciones) en `tfm-evidencias.md`. Ese log sirve como:

- **Trazabilidad interna** para retrospectivas del equipo.
- **Evidencia académica** para TFM, tesis o papers de metodología.
- **Informe a cliente** o stakeholder que necesita ver cómo se
  construyó cada pieza.
- **Auditoría** cuando el proyecto atraviesa revisión externa.

Es el mismo dato en los cuatro casos; solo cambia quién lo lee.

---

## Los tres slash commands custom

| Comando | Cuándo usarlo |
|---|---|
| `/bootstrap-project` | Tras escribir los 3 archivos de memoria, para generar el `roadmap.md` |
| `/execute-feature N` | Para ejecutar una feature completa del roadmap |
| `/audit-project` | Cada 5-10 features, para auditar deuda y compliance |

---

## Cómo usar la plantilla

### 1. Prerrequisitos

```bash
# uv y specify CLI
brew install uv
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Claude Code (ya instalado)
claude --version
```

### 2. Crear un proyecto nuevo

Desde la carpeta donde guardes la plantilla:

```bash
./scripts/new-project-from-template.sh ~/Desktop/mi-proyecto mi-proyecto
```

El script:
- Ejecuta `specify init` en la carpeta destino.
- Copia los subagentes y los slash commands custom.
- Crea plantillas vacías de `product.md` y `architecture.md`.
- Copia la `constitution.md` base.
- Inicializa git y hace el primer commit.

### 3. Rellenar la memoria del proyecto

```bash
cd ~/Desktop/mi-proyecto

# Edita product.md con la visión real
$EDITOR .specify/memory/product.md

# Edita architecture.md con el stack y decisiones técnicas
$EDITOR .specify/memory/architecture.md

# Opcionalmente ajusta la constitution si quieres
$EDITOR .specify/memory/constitution.md

git add .specify/memory/
git commit -m "docs: write project memory"
```

Ambos archivos incluyen instrucciones inline sobre qué escribir en
cada sección. Si dudas, empieza describiendo el producto en lenguaje
natural como si se lo contases a un colega nuevo — sin jerga
técnica, sin listas de features. El `feature-briefer` se encargará
de traducir esa narrativa a features accionables.

### 4. Generar el roadmap

```bash
claude
```

Dentro de Claude Code:

```
/bootstrap-project
```

El subagente `architect` lee los tres archivos y propone un
`roadmap.md` con features ordenadas por dependencias y prioridad. Lo
revisas, lo apruebas, y queda guardado.

### 5. Ejecutar features una a una

```
/execute-feature 001
```

El orquestador se ocupa del resto. Tú solo intervienes en los
checkpoints:

- Aprobar el brief que produce `feature-briefer` antes de
  `/speckit-specify`.
- Resolver inconsistencias significativas que detecte el
  `contract-guardian`.
- Decidir sobre observaciones del `quality-reviewer` (aceptar,
  arreglar ahora, aplazar al backlog).

Cuando la feature está lista:

```bash
git checkout main
git merge --no-ff feature/001-bootstrap
git push
```

Y a por la siguiente:

```
/execute-feature 002
```

### 6. Auditar cada cierto tiempo

Cada 5-10 features mergeadas:

```
/audit-project
```

Te da un reporte completo de compliance, deuda técnica y cobertura.

---

## Estructura completa de la plantilla

```
spec-kit-template/
├── README.md                           ← este archivo
├── .specify/
│   └── memory/
│       └── constitution.md             ← constitución universal base
├── .claude/
│   ├── agents/
│   │   ├── orchestrator.md
│   │   ├── architect.md
│   │   ├── feature-briefer.md
│   │   ├── tdd-enforcer.md
│   │   ├── contract-guardian.md
│   │   ├── quality-reviewer.md
│   │   ├── refactor-suggester.md
│   │   └── tfm-documenter.md
│   └── commands/
│       ├── bootstrap-project.md
│       ├── execute-feature.md
│       └── audit-project.md
└── scripts/
    └── new-project-from-template.sh
```

---

## Casos de uso típicos

Esta plantilla no presupone tipo de proyecto. Funciona igual para:

- **Aplicación SaaS o comercial**: la disciplina de guardianes reduce
  bugs en producción y el `tfm-documenter` alimenta informes de
  entrega al cliente.
- **Side-project o OSS**: el `refactor-suggester` mantiene la deuda
  bajo control cuando trabajas en ratos sueltos.
- **Trabajo académico** (TFM, tesis, paper de metodología): el
  `tfm-documenter` produce métricas citables sin trabajo extra.
- **Proyecto de aprendizaje** de una tecnología nueva: la `constitution`
  y el `tdd-enforcer` te fuerzan buenos hábitos desde el día uno.
- **Migración o modernización** de un sistema existente: cada feature
  del roadmap es un paso de la migración, con evidencia de que no
  rompiste lo anterior.

---

## Personalización

### Añadir un subagente propio

Los subagentes viven en `.claude/agents/*.md`. Para añadir uno nuevo,
crea un archivo con el frontmatter estándar de Claude Code y
regístralo en el `orchestrator.md` en el punto del ciclo donde debe
actuar.

### Ajustar la constitution

Todo cambio en `constitution.md` afecta al resto del ciclo (el
`quality-reviewer` la usa como referencia). Si añades una regla,
asegúrate de que sea verificable — el guardián necesita poder decir
"aprobado" o "rechazado" sin ambigüedad.

### Cambiar de stack

`architecture.md` es la única superficie que amarra al stack. Si
migras de Next.js a algo distinto (Python, Go, Rust, otro framework
JS), reescribes `architecture.md` y los subagentes siguen funcionando
— porque razonan sobre principios y contratos, no sobre sintaxis.

---

## Principios de diseño de esta plantilla

1. **Separación de responsabilidades**: cada subagente tiene una
   misión nítida y no solapada con otros.
2. **Disciplina automatizada**: los guardianes (`tdd-enforcer`,
   `contract-guardian`, `quality-reviewer`) son binarios: aprueban o
   bloquean. Nunca negocian.
3. **El humano dirige, el agente ejecuta**: el orquestador pausa en
   los checkpoints donde hay decisión de producto o de criterio. No
   asume.
4. **Trazabilidad como subproducto**: el `tfm-documenter` captura
   evidencia durante el proceso, no al final. Sin trabajo extra, cada
   feature deja métricas objetivas.
5. **Reutilizable de verdad**: la plantilla no presupone stack
   concreto. Cualquier proyecto (Next.js, Python, Go, Rust) puede
   usarla cambiando solo `architecture.md`.
6. **Compatible con Spec Kit oficial**: no reemplaza Spec Kit, lo
   envuelve. Si en algún momento quieres bajar al flujo crudo de
   `/speckit-*`, puedes hacerlo sin desinstalar nada.

---

## Cuándo NO usar esta plantilla

- **Para prototipos rápidos** que se van a tirar a la basura. Es
  overkill.
- **Cuando no tienes claro el qué del producto**. Antes de SDD,
  necesitas el `product.md`. Si todavía estás explorando, primero
  explora — con papel y lápiz, con conversaciones, con maquetas.
- **En proyectos con equipo grande** donde ya hay metodología propia.
  Esta plantilla asume que uno o dos ingenieros trabajan con Claude
  Code como copiloto. Escalar a equipos grandes requiere adaptación.
- **Para tareas puramente creativas** (arte generativo, storytelling
  interactivo, diseño puro) donde el ciclo spec → tests → código no
  aporta valor.

---

## Roadmap de la plantilla

- **v1.0**: 7 subagentes + orquestador + 3 slash commands. Funcional
  extremo a extremo.
- **v1.1** (futuro): hooks de Claude Code para invocar guardianes
  automáticamente en eventos (`PostToolUse`, `PreCommit`).
- **v1.2** (futuro): integración con GitHub Actions para que los
  guardianes corran también en CI y bloqueen PRs.
- **v2.0** (futuro): variante para proyectos multi-repo con
  orquestación inter-repo — útil cuando dos repositorios hermanos
  comparten un contrato HTTP y necesitan mantenerlo sincronizado.

---

## Licencia y créditos

Publicada bajo licencia MIT. Úsala, modifícala, redistribúyela.

La plantilla se apoya en dos herramientas de terceros:

- **Spec Kit** (GitHub) — el framework SDD subyacente.
- **Claude Code** (Anthropic) — el agente que ejecuta los subagentes
  y los slash commands.

Ninguna de las dos está incluida en este repositorio; ambas se
instalan como prerrequisito.

---

*Spec-Driven Development con Spec Kit es agente-agnóstico. Esta
plantilla está optimizada para Claude Code, pero los principios y la
estructura de subagentes pueden trasladarse a otros agentes (Cursor,
opencode, Codex) con adaptaciones menores.*