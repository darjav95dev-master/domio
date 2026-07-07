# Plan de integración de codebase-memory-mcp (CBM) en Domio

> Estado: **borrador para revisión** — no ejecutado.
> Fuentes: análisis del código fuente de CBM (github.com/DeusData/codebase-memory-mcp,
> `src/cli/cli.c`, `src/mcp/mcp.c`, `src/pipeline/*`, `internal/cbm/service_patterns.c`,
> `docs/cbmignore.md`, `docs/BENCHMARK.md`) y del estado real de este repo a 2026-07-07.

---

## 0. Hallazgos que condicionan el plan

### Sobre Domio

- ~226 archivos trackeados, ~73 TS/TSX. Indexado <1s. El ahorro absoluto de tokens hoy es
  modesto; el multiplicador real es la chain SDD (cada feature dispara ~8-10 agentes que
  re-exploran el repo desde cero) y el crecimiento previsto (20+ features pendientes).
- `AGENTS.md` solo contiene el bloque `<!-- SPECKIT START/END -->` (4 líneas).
- `opencode.json` define 12 agentes con permission maps explícitos y **sin clave `mcp`**.
  Los modelos reales difieren de la asignación nominal (frontend-developer = kimi-k2.7-code,
  contract-guardian = minimax-m2.7).
- En `.opencode/agents/` no existen aún `debugger`, `db-migration-guardian` ni
  `security-reviewer`; el protocolo del AGENTS.md los cubre para cuando existan.
- Solo hay 1 ruta API (`app/api/health/route.ts`). `src/shared/api-contract/` no existe todavía.

### Sobre CBM (verificado en código, no en README)

1. **OpenCode se configura a nivel GLOBAL**: `codebase-memory-mcp install` escribe en
   `~/.config/opencode/opencode.json` (clave `mcp`) y `~/.config/opencode/AGENTS.md`
   (marcadores `<!-- codebase-memory-mcp:start/end -->`). No toca el `opencode.json` del
   proyecto. Formato de entry (`cbm_upsert_opencode_mcp`, cli.c:1689):
   `{"enabled": true, "type": "local", "command": ["/ruta/binario"]}`.
2. **OpenCode no recibe hooks de CBM.** Solo Claude Code recibe un hook PreToolUse, y es
   estructuralmente no-bloqueante por diseño (intercepta Grep/Glob, nunca Read; issue #362).
   → Enforcement en OpenCode = advisory-only.
3. **No hay extractor de rutas filesystem para Next.js App Router** (`pass_route_nodes.c`:
   solo SvelteKit, frameworks de registro tipo Express/Fastify/Hono/Flask, y gRPC).
   `app/api/**/route.ts` con `export async function GET` NO genera nodos Route ni edges HANDLES.
4. **`fetch` global no está en los patrones de cliente HTTP** (`service_patterns.c`: axios,
   node-fetch, undici, ofetch, ky, wretch… pero no el fetch nativo). Clasificación por
   identidad de librería en el QN resuelto.
5. **Consecuencia de 3+4: CROSS_HTTP_CALLS Domio↔VivCoop no funciona out-of-the-box**
   con Next.js en ambos lados (ni HTTP_CALLS en el cliente ni Route/HANDLES en el servidor).
6. **Markdown**: cada `.md` = nodo `document` + headings. Sin CALLS/IMPORTS/frontmatter.
   Las specs de Spec Kit son buscables por BM25 pero no son entidades enlazadas al código.
7. **PostgreSQL**: sin introspección de BD. El grafo ve los `pgTable(...)` de Drizzle como
   código TS y el `.sql` de migración vía gramática SQL (tier "Good"). La semántica RLS
   no existe en el grafo.
8. **Cypher**: subset amplio (MATCH/WHERE/WITH/UNWIND/UNION/CASE, agregados,
   `EXISTS {}` de un salto). Contradicción README↔BENCHMARK sobre `IS NOT NULL` →
   usar `EXISTS { }` hasta verificar en vivo. Techo 100k filas en `query_graph`.
9. **Team artifact**: `index_repository(persistence=true)` → `.codebase-memory/graph.db.zst`
   (zstd -9) + `.gitattributes` con `merge=ours` auto. Bootstrap automático al clonar.
10. **Trade-off del paper (arXiv:2603.27277)**: 83% calidad de respuesta vs exploración
    archivo-por-archivo, a cambio de 10× menos tokens y 2.1× menos tool calls (31 repos).
    → Regla central: **el grafo localiza, Read verifica**.

### Expectativa realista de ahorro para Domio

- CBM ataca solo la fase de descubrimiento; no acorta la lectura de spec/plan/constitution
  ni la generación de código. Estimación: 15-30% del total por feature, creciente con el
  tamaño del repo (~punto de inflexión hacia ~150 archivos).
- Coste fijo nuevo: 14 definiciones de tools ≈ 2-4K tokens de contexto por agente y sesión.
  Pérdida neta probable en agentes que no exploran (tfm-documenter, tdd-enforcer).
- El ahorro depende de que los agentes obedezcan el AGENTS.md (sin enforcement bloqueante).
  El piloto (Fase 8) lo mide con F005 como baseline.

---

## 1. Los 14 tools MCP (schemas verificados en `mcp.c`)

| Tool | Parámetros clave | Notas |
|---|---|---|
| `index_repository` | `repo_path` (req), `mode` full\|moderate\|fast\|cross-repo-intelligence, `name`, `persistence`, `target_projects` | Devuelve `excluded` (valida `.cbmignore`); puede devolver `status:"degraded"` |
| `search_graph` | `project` (req) + modos combinables: `query` (BM25), `name_pattern` (regex), `semantic_query` (**array**; requiere modo full/moderate) + `label`, `file_pattern`, `min_degree`, `limit`/`offset` | Cap 200; paginar con `has_more` |
| `query_graph` | `query` Cypher + `project` (req), `max_rows` | Techo 100k filas; errores `unsupported …` claros |
| `trace_path` | `function_name` + `project` (req), `direction`, `depth` 1-5, `mode` calls\|data_flow\|cross_service, `risk_labels`, `include_tests` | 0 resultados → buscar nombre exacto con `search_graph` antes |
| `get_code_snippet` | `qualified_name` + `project` (req) | QN = `<project>.<path>.<name>` |
| `get_graph_schema` | `project` (req) | Ejecutar primero si se va a usar Cypher |
| `get_architecture` | `project` (req), `path`, `aspects` | `clusters` = comunidades Leiden |
| `search_code` | `pattern` + `project` (req), `file_pattern`, `path_filter`, `mode` | Cap 10, sin offset |
| `detect_changes` | `project` (req), `base_branch` (default main), `since` | Diff → símbolos + blast radius con riesgo |
| `manage_adr` | `project` (req), `mode` get\|update\|sections, `content` | ADRs persistentes |
| `list_projects` / `delete_project` / `index_status` | — / `project` / `project` | |
| `ingest_traces` | `traces` [{caller, callee, count}] + `project` (req) | Valida/crea edges HTTP desde runtime |

**Nodos**: Project, Package, Folder, File, Module, Class, Function, Method, Interface, Enum,
Type, Route, Resource.
**Edges**: CONTAINS_*, DEFINES, DEFINES_METHOD, IMPORTS, CALLS, HTTP_CALLS, ASYNC_CALLS,
IMPLEMENTS, HANDLES, USAGE, CONFIGURES, WRITES, MEMBER_OF, TESTS, USES_TYPE,
FILE_CHANGES_WITH, DATA_FLOWS, SIMILAR_TO, SEMANTICALLY_RELATED, CROSS_*.

---

## 2. Fases

### Fase 1 — Instalar y validar en local (no toca el repo)

```bash
# Instalar binario (verifica SHA-256) SIN configurar agentes
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash -s -- --skip-config

~/.local/bin/codebase-memory-mcp --version

# Indexar Domio desde CLI y revisar el campo `excluded`
codebase-memory-mcp cli index_repository '{"repo_path": "/Users/dariojavierdiazcaballero/Desktop/Domio", "mode": "full"}'
codebase-memory-mcp cli list_projects
```

*Por qué `--skip-config`*: el install automático escribe configs globales para todos los
agentes detectados, afectando a todos los proyectos. Primero validar el grafo; configurar
con alcance de proyecto en la Fase 3.

**Salida**: Domio en `list_projects` con nodos/edges > 0 y `excluded` sin sorpresas.

### Fase 2 — `.cbmignore` específico

La lista built-in ya excluye `.git`, `node_modules`, `dist`; el `.gitignore` ya cubre
`.next/`, `coverage/`, `test-results/`, `playwright-report/`, `out/`, `build/`.
Solo falta lo trackeado que es ruido:

```gitignore
# .cbmignore — qué NO entra en el grafo de CBM

# Snapshots meta de Drizzle: JSON generado sin valor semántico
src/infrastructure/db/migrations/meta/

# Lockfile: en modo full se indexaría como YAML gigante
pnpm-lock.yaml

# Prompts de agentes y tooling SDD: contaminan la búsqueda BM25
.opencode/
.claude/
.specify/

# macOS
.DS_Store
```

**Se queda dentro deliberadamente**: `specs/` (BM25 sobre spec.md útil para feature-briefer),
`src/infrastructure/db/migrations/*.sql`, `tests/` (edges TESTS), `scripts/`, `tfm-evidencias.md`.

**Verificación**: re-indexar → `excluded` correcto;
`search_graph(file_pattern=".*migrations/meta.*")` → 0.

### Fase 3 — Configuración MCP con alcance de proyecto

**OpenCode** — añadir al `opencode.json` **del proyecto** (mergea sobre el global),
preservando todo lo existente:

```json
{
  "mcp": {
    "codebase-memory-mcp": {
      "type": "local",
      "enabled": true,
      "command": ["/Users/dariojavierdiazcaballero/.local/bin/codebase-memory-mcp"]
    }
  }
}
```

⚠️ **Verificación obligatoria**: los agentes tienen permission maps explícitos. Arrancar
OpenCode y confirmar que un agente restringido (p. ej. `feature-briefer`) puede invocar
tools `codebase-memory-mcp_*`. Si OpenCode trata los maps como allowlist estricta, añadir
el permiso por agente.

**Claude Code** — `.mcp.json` en el raíz del proyecto:

```json
{
  "mcpServers": {
    "codebase-memory-mcp": {
      "command": "/Users/dariojavierdiazcaballero/.local/bin/codebase-memory-mcp",
      "args": []
    }
  }
}
```

El hook PreToolUse de Claude Code (augmenter global, no-bloqueante): **no instalarlo en el
piloto** — añade una variable más al experimento del TFM.

### Fase 4 — AGENTS.md actualizado

Preservar el bloque SPECKIT intacto; añadir el bloque CBM con sus marcadores (así
`codebase-memory-mcp uninstall` podría limpiarlo):

````markdown
<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

<!-- codebase-memory-mcp:start -->
# Grafo de conocimiento del codebase (codebase-memory-mcp)

Este proyecto mantiene un grafo estructural del código (proyecto: `Domio`).
Úsalo para DESCUBRIR y LOCALIZAR; usa Read para VERIFICAR antes de editar.
Regla de oro: ningún edit se basa solo en lo que dice el grafo — el grafo
tiene ~83% de fidelidad frente a leer el archivo real.

## Protocolo general (todos los agentes)
1. `get_graph_schema(project="Domio")` una vez por sesión si vas a usar Cypher.
2. Para encontrar código: `search_graph` ANTES que grep/glob.
3. Para leer un símbolo concreto: `search_graph` → `get_code_snippet(qualified_name=...)`.
4. Para impacto de un cambio: `trace_path(direction="inbound")` o `detect_changes`.
5. Fallback a grep/glob: literales de strings, mensajes de error, archivos de
   config, o cuando el grafo devuelve 0 resultados.

## Cuándo NO fiarse solo del grafo (obligatorio leer el archivo completo)
- Migraciones SQL y `src/infrastructure/db/schema/**` (orden de columnas,
  constraints y defaults no están en el grafo).
- Políticas RLS (`src/infrastructure/db/schema/rls.ts`) y `src/middleware.ts`.
- Lógica de auth/sesión (`app/(auth)/**`, Auth.js v5) y rate limiting.
- Cualquier archivo que vayas a editar: Read completo primero, siempre.

## Protocolo por agente
| Agente | Antes de trabajar, ejecuta |
|---|---|
| orchestrator | `get_architecture(project="Domio", aspects=["overview"])` al iniciar la feature |
| architect | `get_architecture(aspects=["all"])` — usa `clusters` para los módulos de facto |
| feature-briefer | `search_graph(query="<términos del dominio de la feature>")` + `get_architecture(aspects=["overview"])` |
| backend-developer / frontend-developer | Por símbolo a tocar: `search_graph` → `get_code_snippet` → `trace_path(direction="inbound", depth=2)` (blast radius); después Read del archivo |
| tdd-enforcer | `query_graph`: funciones nuevas sin edge TESTS (ver ejemplos) |
| debugger | `trace_path(function_name=<sospechosa>, direction="both", mode="data_flow")` |
| quality-reviewer | `detect_changes(project="Domio", base_branch="main")` como mapa del review + query de dead code |
| contract-guardian | `search_graph(label="Route")` — AVISO: las rutas App Router de Next.js NO generan nodos Route; el contrato se verifica sobre archivos, el grafo solo complementa |
| db-migration-guardian | Solo localización (`search_graph(file_pattern=".*schema.*")`); el veredicto sale SIEMPRE del SQL y los schema files reales |
| security-reviewer | `trace_path` inbound de `resolveTenantContext`/`getTenantContext` para verificar que ningún camino salta el tenant context; veredicto sobre código real |
| code-auditor | Dead code + clones: ejemplos de Cypher abajo |
| tfm-documenter | `manage_adr(mode="update")` para persistir decisiones arquitectónicas |

## Ejemplos reales (dominio Domio)
- ¿Quién hereda del repositorio base?
  `query_graph(project="Domio", query="MATCH (c:Class)-[:INHERITS]->(b) WHERE b.name = 'TenantAwareRepository' RETURN c.name, c.file_path")`
- ¿Qué llama a la resolución de tenant?
  `trace_path(project="Domio", function_name="resolveTenantContext", direction="inbound", depth=3)`
- Schemas del dominio:
  `search_graph(project="Domio", name_pattern="unidades|tipologias|promociones|leads", file_pattern=".*db/schema.*")`
- Dead code candidato:
  `query_graph(project="Domio", query="MATCH (f:Function) WHERE NOT EXISTS { (f)<-[:CALLS]-() } RETURN f.qualified_name, f.file_path LIMIT 50")`
- Funciones sin test:
  `query_graph(project="Domio", query="MATCH (f:Function) WHERE NOT EXISTS { (f)<-[:TESTS]-() } AND NOT f.file_path CONTAINS 'test' RETURN f.qualified_name LIMIT 50")`
- Clones near-duplicate entre features:
  `query_graph(project="Domio", query="MATCH (a:Function)-[:SIMILAR_TO]->(b:Function) RETURN a.qualified_name, b.qualified_name")`
<!-- codebase-memory-mcp:end -->
````

### Fase 5 — Enforcement

- **OpenCode**: advisory-only vía AGENTS.md. CBM no instala hooks para OpenCode y no hay
  mecanismo declarativo para condicionar grep a una llamada previa al grafo. Un plugin
  custom (`.opencode/plugin/*.ts` + `tool.execute.before` que lance excepción) es posible
  pero stateful y frágil; CBM mismo abandonó el gating bloqueante en Claude Code.
  **Decisión: no construirlo.** Medir obediencia en el piloto (logs de tool calls);
  reevaluar solo si los agentes lo ignoran sistemáticamente.
- **Claude Code**: el hook oficial es augmenter, no gate — misma conclusión.

### Fase 6 — Verificación del indexado (checklist ejecutable por CLI)

```bash
# 1. Volumen razonable (~73 TS/TSX → cientos de nodos)
codebase-memory-mcp cli list_projects

# 2. El dominio está: las 4 tablas núcleo
codebase-memory-mcp cli search_graph '{"project":"Domio","name_pattern":"unidades|tipologias|promociones|leads"}'

# 3. Clases clave de aislamiento multi-tenant
codebase-memory-mcp cli query_graph '{"project":"Domio","query":"MATCH (c:Class) WHERE c.name CONTAINS \"Repository\" OR c.name CONTAINS \"Context\" RETURN c.name, c.file_path"}'
# Esperado: TenantAwareRepository, ApiKeyContext, AuthenticatedContext, PublicContext, ContextResolutionError

# 4. Trace sobre el call graph real
codebase-memory-mcp cli trace_path '{"project":"Domio","function_name":"resolveTenantContext","direction":"both","depth":3}'

# 5. Tests enlazados
codebase-memory-mcp cli query_graph '{"project":"Domio","query":"MATCH ()-[t:TESTS]->() RETURN count(t)"}'

# 6. .cbmignore efectivo
codebase-memory-mcp cli search_graph '{"project":"Domio","file_pattern":".*migrations/meta.*"}'   # → 0

# 7. Confirmar limitación Next.js (documentar para el TFM)
codebase-memory-mcp cli search_graph '{"project":"Domio","label":"Route"}'   # esperado: 0 o casi 0
```

Si 3 o 4 devuelven vacío, el grafo no sirve para el protocolo → parar antes de tocar AGENTS.md.

### Fase 7 — Team artifact y cross-repo con VivCoop

**Artifact**: tras validar, re-indexar con `persistence: true` y commitear
`.codebase-memory/graph.db.zst` + el `.gitattributes` auto-generado (KBs).
Valor: reproducibilidad documentable en el TFM.

**Cross-repo — expectativas honestas**: `cross-repo-intelligence` NO producirá
CROSS_HTTP_CALLS con este stack (hallazgos 3-5). Opciones en orden:
1. **Aceptarlo**: contrato por archivos espejo (`src/shared/api-contract/`, a crear con la
   primera API expuesta). Indexar VivCoop igualmente para que sus agentes tengan su grafo.
2. **Puente vía `ingest_traces`**: los E2E de Playwright de VivCoop contra Domio pueden
   volcar pares caller→callee reales. Experimento para el TFM, no requisito.
3. Cambiar a `ofetch`/`axios` en VivCoop solo arreglaría el lado cliente — no merece la pena.

### Fase 8 — Piloto en una feature real

- **Alcance**: F006 con `/execute-feature`, AGENTS.md y MCP activos. F005 = baseline sin CBM.
- **Métricas** (tfm-documenter): tokens por agente (OpenCode los reporta), nº tool calls
  grep/glob/read vs tools CBM, veredictos de quality-reviewer, errores atribuibles al grafo.
- **Criterio de adopción**: los agentes usan CBM sin forzarlo, el consumo por agente baja
  de forma medible, cero errores introducidos por confiar en el grafo.
- **Rollback**: borrar clave `mcp` de `opencode.json`, `.mcp.json`, bloque CBM del
  AGENTS.md y `.cbmignore`. Binario y caché no estorban.

---

## 3. Riesgos y mitigaciones

| Riesgo | Realidad | Mitigación |
|---|---|---|
| Calidad 83% vs 92% | El grafo se equivoca ~1 de cada 6 veces vs leer archivos | "Grafo localiza, Read verifica" en AGENTS.md; zonas donde el grafo nunca decide: migraciones, RLS, auth, middleware |
| Grafo desactualizado | Watcher = polling git; puede quedarse atrás tras cambios de rama/merges | `index_status` al inicio de cada feature; re-index tras merge a main (paso del orchestrator) |
| Cross-repo no funciona con Next.js | Confirmado en código | No prometerlo; contrato por archivos; opcional `ingest_traces` |
| 14 tool defs en contexto de agentes flash | 2-4K tokens/agente/sesión; modelos pequeños se distraen | Si se observa en el piloto, desactivar MCP por agente en `opencode.json` (tdd-enforcer, tfm-documenter) |
| Permission maps bloquean tools MCP | No verificable en frío | Primera comprobación de la Fase 3 |
| Binario de terceros | Función declarada; 100% local, sin telemetría, SLSA 3 + checksums | `--skip-config` + configuración manual con alcance de proyecto |
| `IS NOT NULL` contradictorio README↔BENCHMARK | Posible fallo silencioso | Usar `EXISTS { }` (ya en los ejemplos); verificar en Fase 6 |

**Orden de ejecución**: Fase 1 → 2 → 6 (validación temprana) → 3 → 4 → 7 → 8.
La Fase 5 no requiere acción (decisión: advisory).

---

## Anexo A — OpenWiki (langchain-ai/openwiki): evaluado y descartado por ahora

Analizado 2026-07-07 (README, `src/agent/prompt.ts`, `src/agent/utils.ts`, wiki dogfood).

**Qué es**: CLI que ejecuta un agente LLM (proveedor/modelo propio, configurado aparte) para
generar y mantener una wiki markdown en `openwiki/` (quickstart + páginas de sección con el
"por qué", guías de cambio y mapas de fuentes). Añade un bloque a AGENTS.md/CLAUDE.md para
que los agentes lean el quickstart primero. Updates incrementales por git-diff desde el
`gitHead` de `.last-update.json` (quirúrgicos, pueden ser no-op) + workflow CI que abre PRs.

**Economía de tokens**: coste de *generación* en cada init/update (tokens del LLM elegido);
coste de *lectura* mínimo (su propia wiki: 529 líneas ≈ 5-6K tokens, y el quickstart ~70
líneas). Complementario a CBM, no competidor: CBM responde "¿qué llama a X?" (estructural,
exacto, sin LLM); OpenWiki responde "¿cómo funciona esto y por qué?" (prosa curada).

**Por qué no ahora en Domio**: ese nicho ya está cubierto tres veces —
`specs/**` por feature (Spec Kit), `.specify/memory/` (constitution/product/architecture)
que la chain ya lee, y la skill `breadcrumb` (system-map en ~300 tokens). Añadir OpenWiki
= cuarta capa de documentación que mantener consistente + coste de generación recurrente +
riesgo de docs stale contradiciendo las specs. Reevaluar si algún repo del ecosistema
carece de capa de intención (p. ej. VivCoop si no usa SDD), donde un `--init` en un repo
pequeño costaría poco y daría el mayor retorno.
