# CBM en Domio — guía de uso

> codebase-memory-mcp v0.8.1, instalado y verificado el 2026-07-07.
> Plan original y justificación de cada decisión: [CBM-INTEGRATION-PLAN.md](./CBM-INTEGRATION-PLAN.md).

## Qué es (en una frase)

Un grafo estructural del código (funciones, clases, llamadas, imports, herencia) que los
agentes consultan vía MCP en lugar de explorar con grep+read, gastando ~10× menos tokens
en la fase de descubrimiento.

## Qué quedó instalado y configurado

| Pieza | Dónde | Qué hace |
|---|---|---|
| Binario | `~/.local/bin/codebase-memory-mcp` | Servidor MCP + CLI. 100% local, sin telemetría |
| Índice | `~/.cache/codebase-memory-mcp/*.db` | El grafo: **842 nodos, 1256 edges** (SQLite) |
| `.cbmignore` | raíz del repo | Excluye del grafo: `migrations/meta/`, lockfile, `.opencode/`, `.claude/`, `.specify/` |
| Entry MCP OpenCode | `opencode.json` → clave `mcp` | Todos los agentes de la chain ven los 14 tools |
| Entry MCP Claude Code | `.mcp.json` | Ídem para sesiones de Claude Code |
| Protocolo de agentes | `AGENTS.md` → bloque `codebase-memory-mcp` | Qué tool usa cada rol, ejemplos verificados, límites |
| Team artifact | `.codebase-memory/graph.db.zst` (~240KB) | Snapshot commiteable; quien clone bootstrapea sin re-indexar |

**Nombre del proyecto en el grafo**: `Users-dariojavierdiazcaballero-Desktop-Domio`
(derivado de la ruta; la release 0.8.1 aún no soporta el override `name`). Si una query
falla con "project not found", ejecuta `list_projects` y usa el nombre que devuelva.

## Cómo se usa

### Tú, desde la terminal (sin agente)

```bash
export PATH="$HOME/.local/bin:$PATH"
P="Users-dariojavierdiazcaballero-Desktop-Domio"

# ¿Qué hay indexado?
codebase-memory-mcp cli list_projects

# Buscar símbolos (regex) o por lenguaje natural (BM25, incluye specs/)
codebase-memory-mcp cli search_graph "{\"project\":\"$P\",\"name_pattern\":\".*Repository.*\"}"
codebase-memory-mcp cli search_graph "{\"project\":\"$P\",\"query\":\"rate limiting login\"}"

# ¿Quién llama a X / a qué llama X?
codebase-memory-mcp cli trace_path "{\"project\":\"$P\",\"function_name\":\"resolveTenantContext\",\"direction\":\"both\",\"depth\":3}"

# Impacto del diff actual contra main (blast radius con riesgo)
codebase-memory-mcp cli detect_changes "{\"project\":\"$P\",\"base_branch\":\"main\"}"

# Cypher libre
codebase-memory-mcp cli query_graph "{\"project\":\"$P\",\"query\":\"MATCH (c:Class) RETURN c.name, c.file_path\"}"

# Re-indexar a mano (normalmente no hace falta: hay watcher por git)
codebase-memory-mcp cli index_repository '{"repo_path":"/Users/dariojavierdiazcaballero/Desktop/Domio","mode":"full","persistence":true}'
```

### Los agentes (OpenCode / Claude Code)

Automático: al arrancar sesión ven los 14 tools MCP y el `AGENTS.md` les dicta el
protocolo por rol (search_graph antes que grep, get_code_snippet para leer símbolos,
trace_path/detect_changes para impacto, y las zonas donde el grafo nunca decide).
No hay que hacer nada, solo **reiniciar OpenCode/Claude Code** para que carguen la config.

### En una sesión de Claude Code (esta misma)

Tras reiniciar, verifica con `/mcp` que aparece `codebase-memory-mcp` con 14 tools.

## Reglas que los agentes tienen ordenadas (resumen)

1. **El grafo localiza, Read verifica**: ~83% de fidelidad (arXiv:2603.27277) — nunca
   editar basándose solo en el grafo.
2. **Zonas vedadas al grafo** (leer archivo completo siempre): migraciones SQL, schemas
   Drizzle, RLS (`rls.ts`), `middleware.ts`, auth/sesión.
3. **Fallback a grep**: literales, mensajes de error, configs, o 0 resultados del grafo.

## Límites verificados en ESTE repo (no son bugs, es el techo de la herramienta)

- **Rutas Next.js App Router**: `app/api/**/route.ts` no genera nodos Route ni HANDLES
  (CBM solo modela SvelteKit y frameworks de registro tipo Express). Los contratos HTTP
  Domio↔VivCoop se verifican por archivos, y el link cross-repo automático no funciona
  con este stack (tampoco detecta `fetch` nativo como cliente HTTP).
- **Sin edges TESTS**: los specs de Vitest no quedan enlazados a las funciones que
  testean. Cobertura → `pnpm vitest`, no el grafo.
- **Tablas Drizzle** (`unidades`, `tipologias`, `promociones`, `leads`): nodos
  `Variable`, no Classes.
- **Specs de Spec Kit**: buscables por BM25 (nodos Section), pero sin links al código.
- **Cypher**: evita `IS NOT NULL` (usa `EXISTS { ... }`); techo 100k filas.

## Mantenimiento

| Cuándo | Qué |
|---|---|
| Día a día | Nada — el watcher re-indexa solo (polling de git) |
| Tras merge a main o cambio de rama grande | `codebase-memory-mcp cli index_repository '{"repo_path":"...","mode":"full","persistence":true}'` (refresca grafo + artifact) |
| Actualizar CBM | `codebase-memory-mcp update` |
| Desinstalar | Borrar clave `mcp` de `opencode.json`, `.mcp.json`, bloque CBM de `AGENTS.md`, `.cbmignore`, `.codebase-memory/`; opcional `rm -rf ~/.cache/codebase-memory-mcp` |

## Paso manual pendiente (el único)

Arrancar OpenCode en este proyecto y comprobar que un agente con permisos restringidos
(p. ej. `feature-briefer`) puede invocar los tools `codebase-memory-mcp_*`. Si OpenCode
tratara sus permission maps como allowlist estricta, habría que añadir el permiso del
tool a cada agente en `opencode.json`. (Verificado en frío: el server MCP responde al
handshake con los 14 tools; lo que falta es la prueba dentro de una sesión real.)

## Piloto (siguiente paso del plan)

F005 (auth) = baseline sin CBM. La próxima feature (F006) se ejecuta con todo esto
activo. Comparar: tokens por agente (los reporta OpenCode), nº de grep/read vs tools CBM,
veredictos de quality-reviewer, y errores atribuibles al grafo. Los criterios de
adopción/rollback están en el plan, §Fase 8.

## Archivos nuevos/modificados por esta integración (sin commitear)

- Nuevos: `.cbmignore`, `.mcp.json`, `.codebase-memory/` (artifact + `.gitattributes`),
  `CBM-INTEGRATION-PLAN.md`, `CBM-USAGE.md`
- Modificados: `opencode.json` (clave `mcp`), `AGENTS.md` (bloque CBM, bloque SPECKIT intacto)
