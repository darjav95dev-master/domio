# Quickstart: global-content-editor

**Date**: 2026-07-08 | **Feature**: 017-global-content-editor

## Prerequisites

- Base de datos Neon configurada y migraciones aplicadas (`pnpm db:migrate`)
- Seed data cargado (`pnpm db:seed`) — incluye tenant por defecto y usuarios demo
- Variables de entorno configuradas (`.env.local` con DATABASE_URL, AUTH_SECRET, etc.)
- Servidor de desarrollo corriendo (`pnpm dev`)

## Validation Scenarios

### Scenario 1: Editar bloque de contenido global (ADMIN)

**Objetivo**: Verificar que un ADMIN puede editar un bloque de contenido en la página "home" y que el cambio se persiste y revalida.

**Pasos**:
1. Iniciar sesión como ADMIN (email: admin@domio.test, password: según seed)
2. Navegar a `/panel/contenidos`
3. Verificar que se muestra la lista de páginas editables: home, sobre, equipo, aviso-legal, privacidad, cookies
4. Hacer clic en "home"
5. Verificar que se muestran los bloques de la página home (hero, como-trabajamos, sobre, etc.)
6. Editar el bloque "hero": cambiar el campo "claim" a "Nuevo claim editorial"
7. Hacer clic en "Guardar"
8. **Verificar**: Toast "Contenido guardado correctamente" aparece
9. **Verificar**: En la base de datos, `content_blocks` tiene una fila con `page_key='home'`, `block_key='hero'`, `payload.claim='Nuevo claim editorial'`
10. **Verificar**: En la base de datos, `content_history` tiene una nueva entrada con `content_type='block'`, `content_key='home:hero'`, `payload_snapshot.claim='Nuevo claim editorial'`
11. Navegar a la home pública (`/`)
12. **Verificar**: El hero muestra "Nuevo claim editorial" (tras revalidación ISR, puede tardar hasta 60s)

**Comandos de verificación**:
```bash
# Verificar en BD
pnpm db:studio
# Navegar a content_blocks y content_history

# Verificar revalidación (opcional, requiere acceso a logs de Next.js)
# Buscar en logs: "revalidateTag content:home"
```

---

### Scenario 2: Editar configuración de contacto (OPERATOR)

**Objetivo**: Verificar que un OPERATOR puede editar la configuración de contacto global y que el cambio se refleja en el footer público.

**Pasos**:
1. Iniciar sesión como OPERATOR (email: operador@domio.test, password: según seed)
2. Navegar a `/panel/contenidos/contacto`
3. **Verificar**: El formulario se muestra con campos: teléfono, email, dirección, horario, WhatsApp, mensaje predefinido WhatsApp
4. Si ya existe configuración, verificar que el formulario está precargado
5. Editar el campo "phone" a "+34 612 345 678"
6. Editar el campo "email" a "info@domio.test"
7. Hacer clic en "Guardar"
8. **Verificar**: Toast "Configuración de contacto guardada" aparece
9. **Verificar**: En la base de datos, `contact_config` tiene `phone='+34 612 345 678'`, `email='info@domio.test'`
10. **Verificar**: En la base de datos, `content_history` tiene una nueva entrada con `content_type='contact'`, `content_key='global'`, `payload_snapshot.phone='+34 612 345 678'`
11. Navegar a cualquier página pública (por ejemplo, `/`)
12. **Verificar**: El footer muestra "+34 612 345 678" e "info@domio.test" (tras revalidación ISR)

---

### Scenario 3: Navegar historial y revertir (ADMIN)

**Objetivo**: Verificar que un ADMIN puede navegar el historial de un bloque y revertir a una versión anterior.

**Pasos**:
1. Iniciar sesión como ADMIN
2. Navegar a `/panel/contenidos/home`
3. Editar el bloque "hero": cambiar "claim" a "Versión 2"
4. Guardar
5. Editar nuevamente el bloque "hero": cambiar "claim" a "Versión 3"
6. Guardar
7. Navegar a `/panel/contenidos/home/history?block=hero` (o botón "Ver historial" en el bloque)
8. **Verificar**: Se muestra una lista cronológica con al menos 3 entradas (la inicial del seed + 2 ediciones)
9. **Verificar**: Cada entrada muestra timestamp, nombre del autor, y preview del payload
10. Seleccionar la entrada con "claim" = "Versión 2"
11. Hacer clic en "Revertir a esta versión"
12. **Verificar**: Diálogo de confirmación aparece: "¿Revertir a la versión del [timestamp]? Esta acción creará una nueva versión en el historial."
13. Confirmar
14. **Verificar**: Toast "Contenido revertido correctamente" aparece
15. **Verificar**: En la base de datos, `content_blocks` tiene `payload.claim='Versión 2'`
16. **Verificar**: En la base de datos, `content_history` tiene una nueva entrada (la 4ª) con `payload_snapshot.claim='Versión 2'`
17. Navegar a la home pública
18. **Verificar**: El hero muestra "Versión 2" (tras revalidación ISR)

---

### Scenario 4: Control de acceso (AGENT)

**Objetivo**: Verificar que un AGENT no puede acceder a `/panel/contenidos`.

**Pasos**:
1. Iniciar sesión como AGENT (email: agente@domio.test, password: según seed)
2. Intentar navegar a `/panel/contenidos`
3. **Verificar**: El sistema redirige a `/panel` (dashboard)
4. **Verificar**: Mensaje de acceso denegado aparece (Toast o banner)
5. Intentar navegar a `/panel/contenidos/contacto`
6. **Verificar**: El sistema redirige a `/panel`
7. **Verificar**: Mensaje de acceso denegado aparece

---

### Scenario 5: Validación de payload (ADMIN)

**Objetivo**: Verificar que el sistema rechaza payloads inválidos con mensajes de error claros.

**Pasos**:
1. Iniciar sesión como ADMIN
2. Navegar a `/panel/contenidos/home`
3. Editar el bloque "hero"
4. Dejar el campo "claim" vacío
5. Hacer clic en "Guardar"
6. **Verificar**: El sistema NO persiste el cambio
7. **Verificar**: Mensaje de error visible en el formulario: "El claim es obligatorio" (o similar)
8. **Verificar**: En la base de datos, `content_blocks` NO tiene una nueva entrada con `payload.claim=''`
9. **Verificar**: En la base de datos, `content_history` NO tiene una nueva entrada para este cambio fallido

---

### Scenario 6: Estado vacío (ADMIN)

**Objetivo**: Verificar que el sistema muestra estados vacíos compuestos cuando no hay bloques para una página.

**Pasos**:
1. Iniciar sesión como ADMIN
2. Navegar a `/panel/contenidos`
3. Hacer clic en una página que no tenga bloques creados (por ejemplo, "equipo" si el seed no crea bloques para esa página)
4. **Verificar**: Se muestra un estado vacío con mensaje "Aún no hay contenido para esta página"
5. **Verificar**: Botón "Crear primer bloque" está visible
6. Hacer clic en "Crear primer bloque"
7. **Verificar**: Se muestra el formulario para crear el primer bloque de esa página
8. Completar el formulario y guardar
9. **Verificar**: El bloque se crea y se muestra en la lista

---

## Test Commands

```bash
# Tests unitarios de repositorios y servicios
pnpm vitest run src/features/contenidos --reporter=dot

# Tests de integración de server actions
pnpm vitest run src/features/contenidos/actions --reporter=dot

# Tests de validación de schemas Zod
pnpm vitest run src/features/contenidos/server/schemas --reporter=dot

# E2E (si se implementan en F026)
pnpm playwright test contenidos.spec.ts

# Verificar typecheck
pnpm typecheck

# Verificar lint
pnpm lint src/features/contenidos
```

---

## Expected Outcomes

- ADMIN y OPERATOR pueden editar bloques de contenido global y configuración de contacto
- Los cambios se persisten en `content_blocks` y `contact_config`
- Cada cambio genera una entrada en `content_history`
- El revert funciona correctamente y crea una nueva entrada en el historial
- Los payloads inválidos son rechazados con mensajes de error claros
- AGENT no puede acceder a `/panel/contenidos`
- La revalidación ISR se dispara tras cada cambio
- Los estados vacíos se muestran correctamente cuando no hay datos
