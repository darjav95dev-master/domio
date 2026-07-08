# Quickstart: backoffice-shell

**Feature**: 010-backoffice-shell
**Date**: 2026-07-08

## Prerequisites

- Node.js >= 20
- pnpm instalado
- Base de datos Neon configurada con `DATABASE_URL` en `.env.local`
- Seed data ejecutado (`pnpm db:seed`) — provee usuarios demo
- Auth.js configurado con `AUTH_SECRET` y `AUTH_URL` en `.env.local`

## Validation Scenarios

### V-1: Auth guard redirige a login

**Steps**:
1. Asegurar que no hay sesión activa (borrar cookies o usar incógnito).
2. Navegar a `http://localhost:3000/panel`.

**Expected**: Redirección a `/panel/login` (302/307).

**Verify**:
```bash
curl -I http://localhost:3000/panel
# Esperado: HTTP 307 o 302, Location: /panel/login
```

---

### V-2: Login y visualización del layout

**Steps**:
1. Navegar a `http://localhost:3000/panel/login`.
2. Iniciar sesión con `admin@domio.dev` / `Domio2026!`.

**Expected**: Redirección a `/panel`. Layout visible con sidebar 240px a la izquierda, header superior con nombre "Admin Domio" y botón logout. Sidebar muestra las 7 secciones: Dashboard, Catálogo, Leads, Equipo, Contenidos, API Keys, ARSOP.

**Verify**: Inspección visual en navegador.

---

### V-3: Navegación condicional por rol (AGENT)

**Steps**:
1. Cerrar sesión.
2. Iniciar sesión con `agente1@domio.dev` / `Domio2026!`.

**Expected**: Sidebar muestra solo 3 secciones: Dashboard, Catálogo, Leads. No aparecen Equipo, Contenidos, API Keys, ARSOP.

**Verify**: Inspección visual en navegador.

---

### V-4: Navegación condicional por rol (OPERATOR)

**Steps**:
1. Cerrar sesión.
2. Iniciar sesión con `operador1@domio.dev` / `Domio2026!`.

**Expected**: Sidebar muestra 4 secciones: Dashboard, Catálogo, Leads, Contenidos. No aparecen Equipo, API Keys, ARSOP.

**Verify**: Inspección visual en navegador.

---

### V-5: Badge de leads no leídos

**Steps**:
1. Iniciar sesión como `agente1@domio.dev`.
2. Observar el badge junto a "Leads" en el sidebar.

**Expected**: Badge muestra un número (puede ser 0 si todos los leads están leídos). Si hay leads no leídos, el número es > 0.

**Verify**:
```bash
curl http://localhost:3000/api/internal/leads/unread-count -H "Cookie: <session-cookie>"
# Esperado: { "count": <number> }
```

---

### V-6: X-Robots-Tag en respuestas del panel

**Steps**:
1. Con sesión activa, hacer request a `/panel`.
2. Inspeccionar headers de respuesta.

**Expected**: Header `X-Robots-Tag: noindex, nofollow` presente.

**Verify**:
```bash
curl -I http://localhost:3000/panel -H "Cookie: <session-cookie>"
# Esperado: X-Robots-Tag: noindex, nofollow
```

---

### V-7: robots.txt bloquea /panel

**Steps**:
1. Acceder a `http://localhost:3000/robots.txt` (sin sesión).

**Expected**: Contenido incluye `Disallow: /panel` y `Disallow: /api`.

**Verify**:
```bash
curl http://localhost:3000/robots.txt
# Esperado: User-agent: *\nDisallow: /panel\nDisallow: /api
```

---

### V-8: Dashboard operativo

**Steps**:
1. Iniciar sesión como ADMIN.
2. Navegar a `/panel`.

**Expected**: Dashboard muestra:
- Contador de leads no leídos (numeral grande).
- Lista de últimas 5 promociones editadas (o estado vacío si no hay).
- Enlaces rápidos a secciones.
- Atajos "Nueva promoción" y "Ver bandeja".
- NO hay gráficos, charts, ni métricas de conversión.

**Verify**: Inspección visual en navegador.

---

### V-9: Logout

**Steps**:
1. Con sesión activa, hacer clic en "Cerrar sesión" en el header.

**Expected**: Sesión invalidada. Redirección a `/panel/login`. Intentar acceder a `/panel` redirige a login.

**Verify**: Navegación manual.

---

### V-10: Accesibilidad del badge

**Steps**:
1. Activar lector de pantalla (VoiceOver, NVDA).
2. Esperar a que el badge se actualice (30s o forzar cambio).

**Expected**: El cambio en el badge se anuncia vía `aria-live="polite"`.

**Verify**: Lector de pantalla anuncia el nuevo valor.

---

## Test Commands

```bash
# Tests unitarios de componentes
pnpm vitest run src/features/backoffice/

# Tests de route handler
pnpm vitest run app/api/internal/leads/unread-count/

# Tests de middleware
pnpm vitest run middleware.spec.ts

# Typecheck
pnpm typecheck

# Lint
pnpm lint

# E2E (si aplica)
pnpm test:e2e --grep "backoffice"
```
