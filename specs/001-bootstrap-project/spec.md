# Feature Specification: Bootstrap del proyecto

**Feature Branch**: `feature/001-bootstrap-project`

**Created**: 2026-07-06

**Status**: Draft

**Input**: User description: "Feature F001 · bootstrap-project: Scaffold completo del proyecto Domio con Next.js 15, tooling de calidad (ESLint, Prettier, Husky, Vitest, Playwright), estructura de carpetas según architecture.md, scripts npm obligatorios, y configuración de variables de entorno."

## User Scenarios & Testing

### User Story 1 — Scaffold limpio y arrancable (Priority: P1)

Un desarrollador clona el repositorio y ejecuta `pnpm install && pnpm dev`. Quiere ver la aplicación corriendo en localhost sin errores, con la estructura de carpetas correcta y todas las dependencias instaladas.

**Why this priority**: Sin un scaffold que arranque, ninguna feature posterior puede desarrollarse. Es el prerequisito absoluto de todo el roadmap.

**Independent Test**: `pnpm install && pnpm dev` arranca sin errores. Navegar a `http://localhost:3000` muestra una página por defecto de Next.js.

**Acceptance Scenarios**:

1. **Given** un entorno limpio con Node.js y pnpm instalados, **When** el desarrollador ejecuta `pnpm install`, **Then** todas las dependencias se instalan sin errores.
2. **Given** dependencias instaladas, **When** el desarrollador ejecuta `pnpm dev`, **Then** el servidor de desarrollo arranca en `localhost:3000` sin errores en consola.
3. **Given** el servidor corriendo, **When** el desarrollador abre `http://localhost:3000`, **Then** se muestra una página funcional (puede ser la página por defecto de Next.js).

---

### User Story 2 — Verificación de calidad automatizada (Priority: P1)

El desarrollador quiere ejecutar un comando único (`pnpm quality`) que verifique linting, tipado estático y tests en un solo paso, y que falle si alguna verificación no pasa.

**Why this priority**: La calidad automatizada es un pilar de la constitución del proyecto (§1, §4, §9). Sin ella, no hay garantía de que el código que se escriba en features posteriores cumpla los estándares.

**Independent Test**: `pnpm quality` ejecuta lint + typecheck + test:run y devuelve código de salida 0 cuando todo pasa.

**Acceptance Scenarios**:

1. **Given** el proyecto scaffoldado sin errores de código, **When** el desarrollador ejecuta `pnpm quality`, **Then** los tres pasos (lint, typecheck, test:run) se ejecutan y el comando termina con código 0.
2. **Given** un archivo con un error de TypeScript, **When** el desarrollador ejecuta `pnpm quality`, **Then** el paso de typecheck falla y el comando termina con código distinto de 0.
3. **Given** código que viola una regla de ESLint, **When** el desarrollador ejecuta `pnpm quality`, **Then** el paso de lint falla y el comando termina con código distinto de 0.

---

### User Story 3 — Hooks de git que protegen la rama (Priority: P2)

El desarrollador hace `git commit`. Antes de que el commit se complete, Husky ejecuta lint y typecheck. Si algo falla, el commit se rechaza. Antes de `git push`, se ejecutan tests y build.

**Why this priority**: Los hooks de git son la última línea de defensa antes de que código incorrecto entre al historial. La constitución (§9) los exige explícitamente. Es P2 porque se puede trabajar sin ellos (ejecutando manualmente), pero idealmente deben estar desde el día 1.

**Independent Test**: Crear un archivo con un error de lint, intentar commit → rechazado. Corregir el error, commit → aceptado.

**Acceptance Scenarios**:

1. **Given** Husky instalado y hooks configurados, **When** el desarrollador intenta hacer commit de código que no pasa lint, **Then** el commit es rechazado con un mensaje descriptivo.
2. **Given** Husky instalado, **When** el desarrollador intenta hacer push de código que no compila, **Then** el push es rechazado.
3. **Given** código limpio que pasa todas las verificaciones, **When** el desarrollador hace commit y push, **Then** ambas operaciones se completan exitosamente.

---

### User Story 4 — Variables de entorno documentadas y seguras (Priority: P1)

Un desarrollador nuevo en el proyecto necesita saber qué variables de entorno requiere la aplicación para funcionar. Encuentra un archivo `.env.example` que lista todas las variables necesarias con una breve descripción, pero sin valores reales. Sabe que `.env.local` está en `.gitignore` para proteger secretos.

**Why this priority**: La constitución (§5) exige que las variables de entorno estén documentadas y que los secretos nunca se commiteen. Es P1 porque sin esta documentación, cada desarrollador nuevo pierde tiempo adivinando qué configurar.

**Independent Test**: Abrir `.env.example` → contiene las 10 variables requeridas por architecture.md §8 con descripciones. `.gitignore` incluye `.env.local`.

**Acceptance Scenarios**:

1. **Given** el proyecto scaffoldado, **When** el desarrollador abre `.env.example`, **Then** encuentra todas las variables requeridas: DATABASE_URL, AUTH_SECRET, AUTH_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, RESEND_API_KEY, SENTRY_DSN, RATE_LIMIT_STORE_URL, cada una con una descripción de su propósito.
2. **Given** el proyecto scaffoldado, **When** el desarrollador crea un archivo `.env.local` con secretos reales, **Then** git ignora ese archivo (no aparece en `git status`).

---

### User Story 5 — Estructura de carpetas alineada con la arquitectura (Priority: P2)

El desarrollador explora el proyecto y encuentra la estructura de carpetas exactamente como la define architecture.md §5: grupos de rutas `(public)`, `(auth)`, `api/` dentro de `app/`; directorios `shared/`, `features/`, `context/`, `infrastructure/` dentro de `src/`; y `unit/`, `isolation/`, `contract/`, `e2e/` dentro de `tests/`.

**Why this priority**: La estructura de carpetas es el esqueleto sobre el que se construyen todas las features. Es P2 porque se puede crear incrementalmente, pero tenerla desde el inicio evita refactors posteriores.

**Independent Test**: `ls app/` muestra `(public)`, `(auth)`, `api/`. `ls src/` muestra `shared`, `features`, `context`, `infrastructure`. `ls tests/` muestra `unit`, `isolation`, `contract`, `e2e`.

**Acceptance Scenarios**:

1. **Given** el proyecto scaffoldado, **When** el desarrollador lista el directorio `app/`, **Then** ve los grupos de rutas `(public)/`, `(auth)/` y el directorio `api/`.
2. **Given** el proyecto scaffoldado, **When** el desarrollador lista `src/`, **Then** ve los directorios `shared/`, `features/`, `context/`, `infrastructure/`.
3. **Given** el proyecto scaffoldado, **When** el desarrollador lista `tests/`, **Then** ve los directorios `unit/`, `isolation/`, `contract/`, `e2e/`.

---

### Edge Cases

- ¿Qué ocurre si el desarrollador no tiene pnpm instalado? El `package.json` debe tener `"packageManager": "pnpm@..."` con `corepack` habilitado para que `corepack enable` resuelva la versión correcta automáticamente.
- ¿Qué ocurre si el desarrollador intenta usar npm o yarn? Debe ver un error o advertencia (idealmente via `engines` en `package.json` o `preinstall` script).
- ¿Qué ocurre si `git init` no se ha ejecutado antes de instalar Husky? Husky falla. El desarrollo debe incluir este paso explícitamente.
- ¿Qué ocurre si `.env.local` no existe pero la app intenta arrancar? La app debe mostrar un error claro indicando qué variables faltan, no un error genérico.

## Requirements

### Functional Requirements

- **FR-001**: El proyecto DEBE ser un scaffold de Next.js 15 con App Router y TypeScript strict (`"strict": true` en tsconfig).
- **FR-002**: El proyecto DEBE usar pnpm como gestor de paquetes exclusivo, con `"packageManager"` declarado en `package.json` y `corepack` habilitado.
- **FR-003**: El proyecto DEBE tener ESLint configurado con los plugins `@typescript-eslint`, `sonarjs` (cognitive-complexity ≤ 15, no-duplicate-string threshold 3, no-identical-functions) y `jsx-a11y`.
- **FR-004**: El proyecto DEBE tener Prettier configurado para formateo consistente.
- **FR-005**: El proyecto DEBE tener Husky configurado con hooks de pre-commit (lint + typecheck) y pre-push (test:run + build), ejecutando `git init` antes de instalar si es necesario.
- **FR-006**: El proyecto DEBE tener Vitest configurado como test runner con `pool: 'forks'`, `singleFork: true`, `fileParallelism: false` y coverage thresholds al 80% en statements, branches, functions y lines.
- **FR-007**: El proyecto DEBE tener Playwright configurado con `workers: 1` y `fullyParallel: false`.
- **FR-008**: El proyecto DEBE tener la estructura de carpetas definida en architecture.md §5: `app/(public)/`, `app/(auth)/`, `app/api/`, `src/shared/`, `src/features/`, `src/context/`, `src/infrastructure/`, `tests/unit/`, `tests/isolation/`, `tests/contract/`, `tests/e2e/`.
- **FR-009**: El proyecto DEBE tener un `.env.example` con todas las variables requeridas (DATABASE_URL, AUTH_SECRET, AUTH_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, RESEND_API_KEY, SENTRY_DSN, RATE_LIMIT_STORE_URL) sin valores reales, cada una con una descripción de su propósito.
- **FR-010**: El proyecto DEBE tener `.env.local` listado en `.gitignore`.
- **FR-011**: El proyecto DEBE tener los siguientes scripts npm: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:run`, `test:coverage`, `test:e2e`, `test:contract`, `quality` (lint + typecheck + test:run), `verify` (quality + test:contract + test:e2e + build).
- **FR-012**: El tsconfig DEBE excluir los directorios `tests/` del build de producción.
- **FR-013**: El proyecto DEBE tener un `README.md` mínimo con instrucciones de instalación (`pnpm install && pnpm dev`) y los scripts disponibles.

### Key Entities

Esta feature no define entidades de dominio. Es puramente infraestructural. Las entidades se introducen en features posteriores (F002: schema de base de datos, F009: constantes de dominio).

## Success Criteria

- **SC-001**: Un desarrollador puede clonar el repositorio, ejecutar `pnpm install && pnpm dev`, y ver la aplicación corriendo en `localhost:3000` en menos de 5 minutos.
- **SC-002**: `pnpm quality` ejecuta lint, typecheck y test:run en un solo paso y termina con código de salida 0 en un proyecto sin errores.
- **SC-003**: `pnpm build` produce un build de producción exitoso sin errores.
- **SC-004**: Un commit con errores de lint es rechazado por el hook de pre-commit de Husky.
- **SC-005**: El 100% de las variables de entorno requeridas por la arquitectura están documentadas en `.env.example`.
- **SC-006**: La estructura de carpetas coincide exactamente con lo especificado en architecture.md §5 al inspeccionar con `ls`.

## Assumptions

- Se asume que el desarrollador tiene Node.js ≥ 20 y pnpm instalado (o corepack habilitado).
- Se asume que `create-next-app` está disponible como herramienta de scaffolding inicial, pero la configuración posterior es manual para garantizar el cumplimiento exacto de la arquitectura.
- Se asume que los tests unitarios en esta feature serán mínimos (solo smoke tests de que la app arranca), ya que no hay lógica de dominio implementada.
- Se asume que las variables de entorno listadas son las requeridas por features futuras, aunque los servicios correspondientes no estén implementados aún.

## Dependencies

- **Internas**: Ninguna. Es la primera feature del roadmap.
- **Externas**: `create-next-app` (para el scaffold inicial), `pnpm` (≥ 9), `Node.js` (≥ 20).
