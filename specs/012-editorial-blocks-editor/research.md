# Research: Editorial Blocks Editor

**Feature**: F012 — Editorial Blocks Editor
**Date**: 2026-07-08

## R-001: Drag & drop library for block reordering

**Decision**: Use `@dnd-kit/core` + `@dnd-kit/sortable` para el drag & drop de bloques.

**Rationale**: Es la librería más ligera y accesible para React. Soporta keyboard navigation, screen readers, y tiene bundles pequeños (~15KB). Alternativas como `react-beautiful-dnd` están deprecadas. `react-dnd` es más potente pero más compleja para este caso de uso simple (reordenar una lista vertical).

**Alternatives considered**:
- `react-beautiful-dnd` — deprecada, sin mantenimiento activo
- `react-dnd` — más compleja, overkill para una lista sortable
- Implementación manual con HTML5 DnD API — requiere mucho código para accesibilidad

## R-002: Constraint CHECK por kind en BD

**Decision**: Añadir un constraint CHECK en `promocion_content_blocks` que use un subquery para verificar el kind de la promoción asociada.

**Rationale**: PostgreSQL soporta CHECK constraints con subqueries limitadas, pero para esta restricción cruzada entre tablas, la mejor opción es un trigger function o un constraint CHECK que use una función. Sin embargo, para simplicidad y mantenibilidad, se implementa como:
1. Validación en el servicio (antes del INSERT) — rechaza si kind='external' y block_type in (ZONAS_COMUNES, PLAZOS_GARANTIAS).
2. Trigger en BD como última línea de defensa — BEFORE INSERT OR UPDATE que verifica el kind de la promoción.

**Alternatives considered**:
- CHECK constraint con subquery — no soportado directamente en PostgreSQL
- Trigger function — más robusto, se ejecuta siempre incluso si se bypassa el servicio
- Solo validación en servicio — insuficiente si se fuerza desde API directa

## R-003: Formato de texto para descripción general

**Decision**: Usar un textarea con formato limitado (negrita, cursiva, listas) implementado como un campo de texto con HTML sanitizado. No se usa un editor WYSIWYG completo.

**Rationale**: El spec dice "formato limitado (negrita, cursiva, listas)" y la constitution/architecture prohíben editores markdown genéricos. La solución más simple es un textarea que acepta HTML básico con sanitización (solo `<strong>`, `<em>`, `<ul>`, `<ol>`, `<li>`, `<p>`, `<br>`). Se valida en el servidor rechazando tags no permitidos.

**Alternatives considered**:
- TipTap/ProseMirror — overkill para formato limitado, añade ~200KB
- Markdown con remark — viola la regla de "no editores markdown genéricos"
- Textarea plano sin formato — insuficiente para párrafos con énfasis

## R-004: Integración UI en el formulario de edición existente

**Decision**: La sección de bloques se integra como un nuevo componente `<BlocksEditor>` dentro de la página de edición de promoción (`app/(auth)/panel/catalogo/[id]/page.tsx`). Se coloca después de las secciones existentes (identidad, estado comercial, ubicación, SEO, agente).

**Rationale**: El spec dice "El editor de bloques se integra como una sección más dentro de ese formulario". No se crea una página separada. El componente es un client component porque necesita interactividad (drag & drop, edición inline).

**Alternatives considered**:
- Página separada `/panel/catalogo/[id]/bloques` — viola el spec, fragmenta la edición
- Modal/drawer — no escala para 5 tipos de bloque con formularios complejos
