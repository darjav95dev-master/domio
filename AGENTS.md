<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/026-e2e-tests/plan.md
<!-- SPECKIT END -->

<!-- codebase-memory-mcp:start -->
# Grafo de conocimiento del codebase (codebase-memory-mcp)

Este proyecto mantiene un grafo estructural del código vía MCP.
Proyecto indexado: `Users-dariojavierdiazcaballero-Desktop-Domio`
(el nombre deriva de la ruta local; si una query devuelve "project not found",
ejecuta `list_projects` y usa el nombre que devuelva).

Úsalo para DESCUBRIR y LOCALIZAR; usa Read para VERIFICAR antes de editar.
Regla de oro: ningún edit se basa solo en lo que dice el grafo — el grafo
tiene ~83% de fidelidad frente a leer el archivo real (arXiv:2603.27277).

## Protocolo general (todos los agentes)
1. Para encontrar código: `search_graph` ANTES que grep/glob.
   - `query="..."` → búsqueda BM25 en lenguaje natural (incluye las specs de `specs/**`,
     indexadas como nodos Section).
   - `name_pattern="..."` → regex sobre nombres de símbolos (sin anclar con ^$).
2. Para leer un símbolo concreto: `search_graph` → `get_code_snippet(qualified_name=...)`.
3. Para impacto de un cambio: `trace_path(direction="inbound")` o
   `detect_changes(base_branch="main")`.
4. `get_graph_schema` una vez por sesión si vas a usar Cypher (`query_graph`).
5. Fallback a grep/glob: literales de strings, mensajes de error, archivos de config,
   o cuando el grafo devuelve 0 resultados.

## Cuándo NO fiarse solo del grafo (obligatorio leer el archivo completo)
- Migraciones SQL y `src/infrastructure/db/schema/**` (orden de columnas, constraints
  y defaults no están en el grafo).
- Políticas RLS (`src/infrastructure/db/schema/rls.ts`) y `src/middleware.ts`.
- Lógica de auth/sesión (`app/(auth)/**`, Auth.js v5) y rate limiting.
- Cualquier archivo que vayas a editar: Read completo primero, siempre.

## Limitaciones verificadas en ESTE repo (no pierdas tiempo en esto)
- Las rutas API de Next.js App Router (`app/api/**/route.ts`) NO generan nodos Route
  ni edges HANDLES. `search_graph(label="Route")` devuelve 0. Los contratos HTTP se
  verifican sobre archivos, no sobre el grafo.
- No hay edges TESTS en este proyecto (los specs de Vitest no se enlazan). No uses
  queries de cobertura por grafo; usa `pnpm vitest` y coverage real.
- Las tablas Drizzle (`unidades`, `tipologias`, `promociones`, `leads`) son nodos
  `Variable` en `src/infrastructure/db/schema/*.ts`, no Classes.
- `IS NOT NULL` en Cypher puede no estar soportado: usa `EXISTS { ... }`.

## Protocolo por agente
| Agente | Antes de trabajar, ejecuta |
|---|---|
| orchestrator | `get_architecture(aspects=["overview"])` al iniciar la feature |
| architect | `get_architecture(aspects=["all"])` — usa `clusters` para los módulos de facto |
| feature-briefer | `search_graph(query="<términos del dominio de la feature>")` (encuentra código Y specs previas) |
| backend-developer / frontend-developer | Por símbolo a tocar: `search_graph` → `get_code_snippet` → `trace_path(direction="inbound", depth=2)` (blast radius); después Read del archivo |
| debugger | `trace_path(function_name=<sospechosa>, direction="both", mode="data_flow")` |
| quality-reviewer | `detect_changes(base_branch="main")` como mapa del review + query de dead code |
| contract-guardian | Solo archivos (`src/shared/api-contract/`); el grafo no modela rutas Next.js |
| db-migration-guardian | Solo localización (`search_graph(file_pattern=".*db/schema.*")`); el veredicto sale SIEMPRE del SQL y los schema files reales |
| security-reviewer | `trace_path` inbound de `resolveTenantContext` y `getTenantContext` para verificar que ningún camino salta el tenant context; veredicto sobre código real |
| code-auditor | Dead code + clones: ejemplos abajo |
| tfm-documenter | `manage_adr(mode="update")` para persistir decisiones arquitectónicas |
| tdd-enforcer | No usa el grafo (sin edges TESTS); verifica con vitest y git |

## Ejemplos verificados (dominio Domio)
- ¿Quién usa el repositorio base multi-tenant? (las clases se rastrean con
  INHERITS/USAGE, no con trace_path, que solo sigue CALLS):
  `query_graph(query="MATCH (a)-[r]->(b) WHERE b.name = 'TenantAwareRepository' RETURN a.name, type(r)")`
- ¿Qué llama y a qué llama la resolución de tenant?
  `trace_path(function_name="resolveTenantContext", direction="both", depth=3)`
- Schemas del dominio:
  `search_graph(name_pattern="unidades|tipologias|promociones|leads", label="Variable")`
- Clases del sistema de contexto:
  `query_graph(query="MATCH (c:Class) WHERE c.name CONTAINS 'Context' RETURN c.name, c.file_path")`
- Dead code candidato:
  `query_graph(query="MATCH (f:Function) WHERE NOT EXISTS { (f)<-[:CALLS]-() } RETURN f.qualified_name, f.file_path LIMIT 50")`
- Clones near-duplicate entre features (puede devolver 0 mientras el repo sea pequeño):
  `query_graph(query="MATCH (a:Function)-[:SIMILAR_TO]->(b:Function) RETURN a.qualified_name, b.qualified_name")`
<!-- codebase-memory-mcp:end -->

<!-- context-discipline:start -->
# Disciplina de output y contexto (todos los agentes)

El contexto de sesión es el recurso más caro del proyecto. Cada token de
output de un comando o de un reporte se queda en la ventana para siempre.

## Comandos: output mínimo por defecto
- Tests durante el loop de implementación: SOLO los archivos de test de tu
  tarea, con reporter mínimo: `pnpm vitest run <archivos> --reporter=dot`.
  El reporter completo solo para diagnosticar UN test que ya sabes que falla.
- La suite completa, `pnpm build` y los E2E se ejecutan al cerrar cada fase
  de tasks.md (los lanza el orchestrator) — nunca por tarea.
- Lint: `npx eslint <paths tocados>`, no `pnpm lint` sobre todo el repo.
- Playwright: siempre `--reporter=line`, scoped al spec de la feature.
- Comando de output impredecible o largo → añade `| tail -30`; si falla,
  re-ejecuta scoped para ver el detalle.
- No re-leas un archivo que acabas de editar para "verificar": la edición
  falla ruidosamente si no aplicó. Re-lee solo tras un error real.

## Formato de reporte de subagentes (obligatorio)
El mensaje final de un subagente hacia quien lo invocó: **máximo ~10 líneas**.
1. Veredicto: hecho / parcial / bloqueado (+ por qué en una frase).
2. Archivos tocados (solo paths).
3. Tests: qué se ejecutó y resultado (1 línea).
4. Bloqueos o decisiones que necesitan al humano, si las hay.

PROHIBIDO pegar en el reporte: diffs, código, volcados de tests/lint/build.
El detalle vive en git y en los archivos; quien lo necesite, lo abre.
<!-- context-discipline:end -->
