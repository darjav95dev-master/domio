# Tasks: backoffice-shell

**Input**: Design documents from `specs/010-backoffice-shell/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Yes — spec.md requiere TDD para lógica de negocio (constitution.md §3). Los tests de componentes, route handler y middleware son parte integral de la feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6)
- File paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Instalar dependencias y crear estructura de archivos base

- [ ] T001 Instalar `next-auth@5` (Auth.js v5) como dependencia: `pnpm add next-auth@5`
- [ ] T002 [P] Crear directorios vacíos: `src/features/backoffice/components/`, `src/features/backoffice/constants/`, `app/(auth)/panel/`, `app/api/internal/leads/unread-count/`

---

## Phase 2: Foundational — Auth infrastructure y middleware

**Purpose**: Configurar Auth.js v5, middleware de protección, y robots.ts. Sin esto, ninguna user story puede funcionar.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Crear configuración de Auth.js en `src/infrastructure/auth/auth.config.ts`: credentials provider que valida contra tabla `users` con bcryptjs, JWT con claims `tenant_id`, `user_id`, `role`, `name`. Sesión 2h con renovación deslizante.
- [ ] T004 [P] Crear helper de sesión server-side en `src/infrastructure/auth/session.ts`: función `getServerSession()` wrapper de Auth.js que devuelve `{ user_id, tenant_id, role, name } | null`.
- [ ] T005 Crear middleware en `src/middleware.ts`: (a) proteger rutas `/panel/*` — si no hay sesión, redirect a `/panel/login`; (b) inyectar header `X-Robots-Tag: noindex, nofollow` en todas las respuestas bajo `(auth)/`; (c) excluir rutas públicas y API pública del auth guard.
- [ ] T006 [P] Crear `app/robots.ts`: exportar configuración que permite `/` y bloquea `/panel` y `/api/internal`.
- [ ] T007 Crear constante de navegación en `src/features/backoffice/constants/nav-items.ts`: array de `NavItem` con label, href, icon (Phosphor), allowedRoles. 7 items: Dashboard, Catálogo, Leads, Equipo, Contenidos, API Keys, ARSOP.

**Checkpoint**: Auth.js configurado. Middleware protege `/panel/*` e inyecta X-Robots-Tag. robots.ts bloquea /panel. Constante de navegación lista.

---

## Phase 3: User Story 1 — Acceso protegido al backoffice (Priority: P1) 🎯 MVP

**Goal**: Layout del backoffice con sidebar + auth guard. Un usuario sin sesión es redirigido a login; con sesión ve el layout.

**Independent Test**: Acceder a `/panel` sin sesión → redirect a `/panel/login`. Acceder con sesión → layout renderiza.

### Implementation

- [ ] T008 [US1] Crear layout del panel en `app/(auth)/panel/layout.tsx`: estructura con sidebar a la izquierda (240px) y área de contenido a la derecha. Auth guard: si no hay sesión, redirect. Header superior con nombre de usuario y logout.
- [ ] T009 [P] [US1] Crear componente Sidebar en `src/features/backoffice/components/sidebar.tsx`: sidebar fijo 240px con `bg.inverted`, logo Fraunces, lista de navegación filtrada por rol, indicador activo (border-left terracota 3px). Responsivo: drawer en móvil (< 768px) con botón hamburguesa.
- [ ] T010 [P] [US1] Crear componente NavItem en `src/features/backoffice/components/nav-item.tsx`: item de navegación con icono Phosphor, label, estado activo (comparar href con pathname), `aria-current="page"` cuando activo. Estilo: `text.body-sm weight-medium`, color `fg.on-inverted`, hover `bg.slate-2`.
- [ ] T011 [US1] Crear componente PanelHeader en `src/features/backoffice/components/panel-header.tsx`: header con nombre del usuario (de la sesión), botón logout con `aria-label="Cerrar sesión"`. Logout invalida sesión Auth.js y redirige a `/panel/login`.

**Checkpoint**: Layout con sidebar y header renderiza. Auth guard funciona. Nav items muestran estado activo.

---

## Phase 4: User Story 2 — Navegación condicional por rol (Priority: P1)

**Goal**: El sidebar muestra solo las secciones que el rol del usuario permite.

**Independent Test**: Login como AGENT → 3 secciones. Login como OPERATOR → 4 secciones. Login como ADMIN → 7 secciones.

### Implementation

- [ ] T012 [US2] Implementar filtrado de nav items por rol en `src/features/backoffice/components/sidebar.tsx`: usar `allowedRoles` de cada NavItem y filtrar según `role` de la sesión. Verificar que AGENT no ve Equipo/Contenidos/API Keys/ARSOP, OPERATOR no ve Equipo/API Keys/ARSOP, ADMIN ve todo.
- [ ] T013 [US2] Crear página placeholder para cada sección en `app/(auth)/panel/`: `catalogo/page.tsx`, `leads/page.tsx`, `equipo/page.tsx`, `contenidos/page.tsx`, `api-keys/page.tsx`, `arsop/page.tsx`. Cada página muestra solo el título de la sección (ej. "Catálogo") como placeholder hasta que la feature correspondiente la implemente.

**Checkpoint**: Roles filtran secciones correctamente. Páginas placeholder navegables.

---

## Phase 5: User Story 3 — Dashboard operativo (Priority: P2)

**Goal**: Dashboard como landing operativa con enlaces rápidos, contador de leads, últimas promociones editadas y atajos. Sin gráficos ni analítica.

**Independent Test**: Acceder a `/panel` con sesión → dashboard renderiza con datos reales.

### Implementation

- [ ] T014 [US3] Crear componente DashboardContent en `src/features/backoffice/components/dashboard-content.tsx`: layout con secciones: (a) saludo con nombre, (b) contador de leads no leídos (numeral-lg Fraunces), (c) enlaces rápidos a secciones disponibles, (d) lista de últimas 5 promociones editadas, (e) atajos "Nueva promoción" y "Ver bandeja".
- [ ] T015 [US3] Crear página dashboard en `app/(auth)/panel/page.tsx`: server component que obtiene sesión y datos (unread count, recent promociones), renderiza DashboardContent.
- [ ] T016 [P] [US3] Crear repositorio de consultas del dashboard en `src/infrastructure/db/repositories/dashboard.repository.ts`: método `getUnreadLeadsCount(userId, tenantId)` que consulta `leads` LEFT JOIN `lead_read_marks` filtrando por usuario y leads sin marca de lectura. Método `getRecentPromociones(userId, tenantId, limit=5)` que consulta `promociones` ordenadas por `updated_at DESC`.

**Checkpoint**: Dashboard renderiza con datos reales. Contador de leads muestra número correcto. Últimas promociones listadas.

---

## Phase 6: User Story 4 — Badge de leads no leídos (Priority: P2)

**Goal**: Badge numérico junto a "Leads" en el sidebar con refresco cada 30s y `aria-live="polite"`.

**Independent Test**: Badge muestra conteo correcto. Se actualiza tras 30s. Lector de pantalla anuncia cambios.

### Implementation

- [ ] T017 [US4] Crear route handler `GET /api/internal/leads/unread-count/route.ts` en `app/api/internal/leads/unread-count/route.ts`: requiere sesión Auth.js, consulta `dashboard.repository.getUnreadLeadsCount`, devuelve `{ count: number }`. Si no hay sesión, 401.
- [ ] T018 [US4] Crear componente UnreadBadge en `src/features/backoffice/components/unread-badge.tsx`: client component con `useEffect` + `setInterval` (30s) que hace fetch a `/api/internal/leads/unread-count`. Muestra número en pill pequeño (`bg.terracota`, `text.bone`, `text.meta`). Si count === 0, no muestra nada. `aria-live="polite"` en el contenedor. Skeleton mientras carga (usar componente Skeleton de shared).
- [ ] T019 [US4] Integrar UnreadBadge en NavItem de Leads en `src/features/backoffice/components/sidebar.tsx`: renderizar UnreadBadge junto al label "Leads" cuando el item tiene `badgeKey === "unread-leads"`.

**Checkpoint**: Badge muestra conteo. Se actualiza cada 30s. Anuncia cambios a lectores de pantalla.

---

## Phase 7: User Story 5 — Protección contra indexación (Priority: P2)

**Goal**: Backoffice no indexable. Header X-Robots-Tag + robots.ts.

**Independent Test**: `curl -I /panel` muestra X-Robots-Tag. `/robots.txt` bloquea /panel.

### Implementation

- [ ] T020 [US5] Verificar que el middleware (creado en T005) inyecta correctamente `X-Robots-Tag: noindex, nofollow` en todas las respuestas bajo `/panel/*`. Si no lo hace, corregir.
- [ ] T021 [US5] Verificar que `app/robots.ts` (creado en T006) incluye `Disallow: /panel` y `Disallow: /api/internal`. Si no lo incluye, corregir.

**Checkpoint**: Headers y robots.txt verificados con curl.

---

## Phase 8: User Story 6 — Header con identidad y logout (Priority: P3)

**Goal**: Header muestra nombre del usuario y botón logout funcional.

**Independent Test**: Header muestra nombre. Logout cierra sesión y redirige.

### Implementation

- [ ] T022 [US6] Verificar que PanelHeader (creado en T011) muestra el nombre del usuario desde la sesión y que el botón logout funciona correctamente. Si falta algo, completar.
- [ ] T023 [US6] Crear ruta de login placeholder en `app/(auth)/panel/login/page.tsx`: formulario simple con email y password que usa Auth.js `signIn("credentials")`. Tras login exitoso, redirect a `/panel`. (Nota: el formulario completo de login con diseño editorial es de F005, aquí solo se necesita lo mínimo para que el auth guard funcione.)

**Checkpoint**: Login funciona. Logout funciona. Nombre visible en header.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final, accesibilidad, limpieza

- [ ] T024 Ejecutar `pnpm quality` (lint + typecheck + tests) — todo debe pasar en verde.
- [ ] T025 Verificar accesibilidad: todos los nav items tienen foco visible, badge tiene `aria-live`, botón logout tiene `aria-label`, sidebar en móvil tiene focus trap en drawer.
- [ ] T026 Verificar quickstart.md: ejecutar escenarios V-1 a V-10 y documentar resultados.
- [ ] T027 Limpiar imports no usados, verificar que no hay archivos `.gitkeep` innecesarios tras crear los componentes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — empezar inmediatamente
- **Foundational (Phase 2)**: Depende de Setup — bloquea todas las user stories
- **US1 (Phase 3)**: Depende de Foundational — es el MVP estructural
- **US2 (Phase 4)**: Depende de US1 (necesita el sidebar renderizando)
- **US3 (Phase 5)**: Depende de US1 (necesita el layout)
- **US4 (Phase 6)**: Depende de US2 (necesita el NavItem de Leads en el sidebar)
- **US5 (Phase 7)**: Depende de Foundational (verifica middleware y robots.ts)
- **US6 (Phase 8)**: Depende de US1 (verifica PanelHeader)
- **Polish (Phase 9)**: Depende de todas las user stories

### User Story Dependencies

- **US1 (Acceso protegido)**: Puede empezar tras Foundational. Es prerequisito de US2-US6.
- **US2 (Navegación por rol)**: Puede empezar tras US1.
- **US3 (Dashboard)**: Puede empezar tras US1. Independiente de US2.
- **US4 (Badge)**: Depende de US2 (el badge va en el NavItem de Leads).
- **US5 (No indexación)**: Puede empezar tras Foundational (verifica infraestructura).
- **US6 (Header + logout)**: Puede empezar tras US1.

### Within Each Phase

- T003 y T004 y T007 son paralelizables (archivos diferentes)
- T005 y T006 son paralelizables
- T009 y T010 son paralelizables (componentes diferentes)
- T014 y T016 son paralelizables
- T017 y T018 son paralelizables (route handler y client component)

### Parallel Opportunities

```bash
# Phase 2: auth config, session helper y nav items en paralelo
Task T003: auth.config.ts
Task T004: session.ts
Task T007: nav-items.ts

# Phase 3: sidebar y nav-item en paralelo
Task T009: sidebar.tsx
Task T010: nav-item.tsx

# Phase 5: dashboard content y repository en paralelo
Task T014: dashboard-content.tsx
Task T016: dashboard.repository.ts

# Phase 6: route handler y badge component en paralelo
Task T017: unread-count/route.ts
Task T018: unread-badge.tsx
```

---

## Implementation Strategy

### MVP (User Stories 1 + 2)

1. Complete Phase 1: Setup (5 min)
2. Complete Phase 2: Foundational (30 min)
3. Complete Phase 3: US1 — layout + sidebar + header (45 min)
4. Complete Phase 4: US2 — filtrado por rol (20 min)
5. **STOP and VALIDATE**: Backoffice renderiza con sidebar, auth guard y navegación por rol

### Incremental Delivery

1. Setup + Foundational → Auth y middleware listos
2. US1 → Layout con sidebar y header (MVP estructural)
3. US2 → Navegación por rol (seguridad por rol)
4. US3 → Dashboard operativo (primera página real)
5. US4 → Badge de leads (interactividad en tiempo real)
6. US5 → Verificación de no-indexación (seguridad SEO)
7. US6 → Verificación de header + logout (usabilidad)
8. Polish → Verificación final

### Clasificación de tareas para delegación

- **Dominio (backend-developer)**: T001, T003, T004, T005, T006, T007, T016, T017
- **UI (frontend-developer)**: T002, T008, T009, T010, T011, T012, T013, T014, T015, T018, T019, T020, T021, T022, T023, T024, T025, T026, T027

---

## Notes

- Feature 100% dependiente de F003 (visual-system) y F005 (auth). Los tokens CSS y los primitives ya existen. Auth.js se instala en esta feature.
- El login page (T023) es un placeholder mínimo. El login con diseño editorial completo es responsabilidad de F005.
- Las páginas de sección (T013) son placeholders. Cada una será implementada por su feature correspondiente (F011 catálogo, F014 leads, etc.).
- El sidebar responsivo usa drawer en móvil. El focus trap es obligatorio para accesibilidad.
- No hay gráficos ni analítica en el dashboard (regla product.md §7).
- `aria-live="polite"` es obligatorio en el badge (constitution §6).
