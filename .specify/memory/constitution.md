# constitution.md — Principios no negociables de ingeniería

> Este archivo es el ADN de ingeniería del autor. Define las reglas que el agente **NUNCA puede violar**, independientemente del proyecto.
> Es **agnóstico al proyecto**: vale para cualquier sistema. La especificidad de cada proyecto vive en `product.md` (qué) y `architecture.md` (cómo).
> Actualizar solo si cambian las decisiones de fondo del autor sobre ingeniería de software.

---

## 1. Stack tecnológico de referencia

### Stack principal (Next.js / TypeScript)
- **Framework:** Next.js con App Router
- **Lenguaje:** TypeScript en modo `strict` (`"strict": true` en tsconfig)
- **Estilos:** Tailwind CSS
- **Gestor de paquetes:** pnpm (no npm, no yarn)
- **Runtime:** Node.js LTS

### Stacks alternativos reconocidos
- **Frontend alternativo:** React + Vite / Angular
- **Backend JVM:** Java 17+ con Spring Boot 3, arquitectura por capas (controller → service → repository)
- **Backend Node:** Express / NestJS

> El stack concreto del proyecto se declara en `architecture.md`. Este documento solo lista los stacks reconocidos. El agente aplica las herramientas correspondientes según lo que diga `architecture.md`.

---

## 2. Arquitectura y organización de código

### Scope Rule (obligatoria)
```
src/
├── shared/          ← GLOBAL SCOPE: usado por más de una feature
│   ├── types/
│   ├── utils/
│   ├── constants/   ← sin magic numbers ni strings duplicados
│   ├── components/  ← UI reutilizable (Skeleton, Toast, Button…)
│   ├── hooks/
│   └── strategies/
├── features/        ← LOCAL SCOPE: específico de cada funcionalidad
│   └── [feature]/
│       ├── components/
│       ├── hooks/
│       └── utils/
├── context/         ← estado global
└── infrastructure/  ← servicios externos (Sentry, API clients, auth, DB)
```

**Regla:** Si lo usa más de una feature → `shared/`. Si solo lo usa una → `features/X/`.

### En Next.js (App Router)
```
app/
├── (public)/        ← rutas públicas
├── (auth)/          ← rutas protegidas
├── api/             ← API routes (backend)
└── layout.tsx
src/                 ← lógica de negocio (scope rule aquí)
```

### Patrones de diseño obligatorios
- **Strategy Pattern** para lógica intercambiable (descuentos, pagos, notificaciones, proveedores de envío)
- **Page Object Model** para tests E2E (una clase por página, encapsula selectores y acciones)
- **Repository Pattern** para acceso a datos
- **Constantes centralizadas** en `shared/constants/`: ningún magic number ni string duplicado en el código

---

## 3. Testing (obligatorio)

### Metodología TDD — obligatoria para lógica de negocio
```
1. RED:      Escribir el test PRIMERO → ejecutar → DEBE FALLAR
2. GREEN:    Implementar el código MÍNIMO para pasar el test
3. REFACTOR: Mejorar el código manteniendo los tests en verde
```
El agente **NUNCA** escribe implementación antes del test en lógica de dominio o aplicación.

### Herramientas por stack

| Nivel        | Next.js / TS                                       | Angular              | Java/Spring         | Node           |
|--------------|----------------------------------------------------|----------------------|---------------------|----------------|
| Test runner  | Vitest (preferido) o Jest                          | Jest / Karma         | JUnit 5             | Vitest / Jest  |
| Componentes  | @testing-library/react + @testing-library/user-event | Testing Library    | Mockito             | Supertest      |
| E2E          | Playwright                                         | Playwright / Cypress | Selenium / Playwright | Playwright   |
| Coverage     | @vitest/coverage-v8 o istanbul                     | istanbul             | JaCoCo              | v8             |

### Cobertura mínima: 80% en statements, branches, functions y lines

```typescript
// vitest.config.ts
coverage: {
  thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
}
```

### Tests E2E
- Usar **Page Object Model**: una clase por página
- Preferir selectores accesibles: `getByRole` > `getByTestId` > `getByText`
- Limpiar estado (localStorage, DB) antes de cada test

### Tests de contrato
- Toda API pública o consumida por terceros tiene tests de contrato en `tests/contract/`
- El agente verifica el contrato **antes** de modificar cualquier endpoint público

### Scripts mínimos obligatorios
```json
{
  "test": "vitest",
  "test:run": "vitest --run",
  "test:coverage": "vitest --coverage",
  "test:e2e": "playwright test",
  "test:contract": "vitest --run tests/contract",
  "quality": "pnpm lint && pnpm typecheck && pnpm test:run",
  "verify": "pnpm quality && pnpm test:contract && pnpm test:e2e && pnpm build",
  "prepare": "husky"
}
```

---

## 4. Calidad de código y linting

### Herramientas obligatorias

| Herramienta             | Propósito                                                       | Equivalente Java           |
|-------------------------|-----------------------------------------------------------------|----------------------------|
| ESLint                  | Reglas de estilo y errores                                      | Checkstyle + SpotBugs      |
| eslint-plugin-sonarjs   | Complejidad cognitiva, duplicados, funciones idénticas          | SonarQube                  |
| eslint-plugin-jsx-a11y  | Accesibilidad WCAG AA                                           | —                          |
| TypeScript strict       | Type checking estático                                          | —                          |

### Reglas SonarJS obligatorias
```js
rules: {
  'sonarjs/cognitive-complexity': ['error', 15],
  'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
  'sonarjs/no-identical-functions': 'error',
  'sonarjs/no-nested-conditional': 'warn',
}
```

### Quality gates con Husky

**Pre-commit** (rápido, cada commit):
```bash
pnpm lint || exit 1
pnpm typecheck || exit 1
```

**Pre-push** (completo, cada push):
```bash
pnpm test:run || exit 1
pnpm build || exit 1
```

> El agente configura Husky en el setup inicial. `git init` **SIEMPRE** antes de instalar Husky.

### Validación de esquemas
- Usar `zod` o `yup` para validación de formularios y API
- Validar **siempre** en cliente Y en servidor
- Equivalente Java: Bean Validation (@Valid, @NotNull, @Size…)

---

## 5. Seguridad

- Variables secretas en `.env.local` (en `.gitignore`, **nunca** commiteadas)
- Siempre existe `.env.example` como plantilla commiteada sin valores reales
- **NUNCA** hardcodear DSNs, API keys, tokens ni passwords
- **En Java/Spring Boot:** secrets vía variables de entorno del servidor (setenv.sh en Tomcat), nunca en `application.properties`
- Rate limiting en endpoints sensibles (login, registro): bloquear tras 3–5 intentos fallidos
- Dependencias sin vulnerabilidades críticas: pasar `pnpm audit` antes de cualquier deploy
- Sanitizar inputs contra XSS en cualquier formulario

### Validación de passwords
- Mínimo 12 caracteres
- Al menos una mayúscula, minúscula, número y carácter especial
- Indicador de fortaleza visual (weak / medium / strong)

---

## 6. Accesibilidad (WCAG AA — obligatorio)

- `eslint-plugin-jsx-a11y` configurado y sin errores en build
- Todas las imágenes tienen atributo `alt`
- Botones con solo icono tienen `aria-label`
- Formularios con labels asociados o `aria-label`
- `aria-live` para contenido dinámico (carrito, notificaciones, mensajes de error)
- `focus-visible` para navegación con teclado
- Contraste de colores suficiente (AA mínimo)
- **Lighthouse Accessibility: 90+ antes de cualquier deploy a producción**

### Componentes UX obligatorios

| Componente                | Atributos a11y requeridos                          |
|---------------------------|----------------------------------------------------|
| Skeleton (loading)        | `role="status"`, `aria-hidden="true"`              |
| Toast / notificación      | `role="alert"`, `aria-live="polite"`               |
| Botones con estado        | idle → loading → success reflejado visualmente    |

### Suelo de calidad visual (obligatorio)

Dos reglas heredables, derivadas de fallos reales de producción. Las verifica el
`design-critic` renderizando la página, no revisando el código:

- **Una página mayormente vacía de puro texto es trabajo incompleto.** No es
  "minimalismo". Toda vista con superficie visual debe estar compuesta y llena
  (imágenes reales, color, contenido estructurado), no un texto suelto con
  huecos. Una página que puntúa bajo en "fills its space" (rúbrica de excelencia)
  no se cierra.
- **Todo contenido externo (portadas, imágenes, embeds) lleva fallback robusto,
  y se verifica renderizando contenido real** antes de cerrar la feature. Nunca
  se da por buena una vista que muestra "0 resultados" en una app seedeada, ni
  imágenes rotas/negras. El suelo funcional se comprueba con la app corriendo y
  datos reales, no asumiendo.

---

## 7. Observabilidad

- **Sentry** como herramienta de error tracking en producción
- Configurar siempre: error tracking, error boundaries (React), breadcrumbs, user context
- `tracesSampleRate`: 0.1 en producción, 1.0 en desarrollo
- DSN de Sentry va en variable de entorno, **nunca** hardcodeado
- **En Java/Spring:** Sentry o Datadog según el entorno corporativo

---

## 8. Build y commits

- **Commits convencionales** obligatorios: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`
- El build (`pnpm build` / `mvn package`) debe pasar limpio antes de cualquier merge
- **Lighthouse Performance: 80+** antes de deploy a producción
- Bundle analysis recomendado con `@next/bundle-analyzer`
- `pnpm verify` debe ejecutarse antes de cualquier merge o deploy. Si falla, **no mergear**

---

## 9. Checklist de proyecto nuevo (Día 1)

- [ ] `git init` (ANTES de todo)
- [ ] Crear proyecto (`create-next-app` / `create vite` / `spring initializr`)
- [ ] Configurar TypeScript strict
- [ ] Instalar y configurar testing (Vitest + Testing Library + Playwright)
- [ ] Configurar ESLint (sonarjs + jsx-a11y)
- [ ] Instalar Husky + configurar pre-commit y pre-push
- [ ] Crear `.env.example`
- [ ] Configurar tsconfig para excluir tests del build de producción
- [ ] Configurar coverage thresholds (80%)
- [ ] Configurar Sentry con DSN en variable de entorno

---

## 10. Lo que el agente NUNCA puede hacer

- Escribir implementación antes del test en lógica de negocio (viola TDD)
- Hardcodear secretos, API keys o tokens en el código
- Añadir dependencias nuevas sin justificación explícita
- Dejar magic numbers o strings duplicados en el código
- Generar código con code smells SonarJS críticos o mayores
- Omitir atributos de accesibilidad en componentes UI
- Commitear sin que pasen los checks de pre-commit
- Mergear sin que `pnpm verify` pase completamente
- Romper contratos de API pública sin actualizar primero los tests de contrato
- Cerrar una feature de UI con la vista mayormente vacía / de puro texto (viola el suelo de calidad visual §6)
- Dar por buena una vista sin verificarla renderizada con datos reales (portadas rotas, "0 resultados" en app seedeada)

---

## 11. Patrones que emergen de la práctica

Esta sección recoge patrones derivados de ejecutar la metodología en proyectos reales. No son "primeros principios" sino descubrimientos operativos: cosas que costaron una tarde de bug o un roadmap mal ordenado, y que ahora previenen ese mismo modo de fallo en cualquier proyecto futuro.

### 11.1 Enums y sets cerrados como fuente única

Cualquier campo con valores acotados (roles, estados, categorías, tipos, canales, modos) tiene su fuente en `shared/constants/` y su schema en Zod (o Bean Validation en Java/Spring). Los repositorios y los servicios consumen la constante, nunca definen literales inline.

**Regla dura**: el agente **no puede** inventar valores nuevos. Añadir un valor requiere migración de BD explícita + actualización de la constante + PR aprobado + tests que cubran el nuevo valor.

Motivación: sin este patrón, cada feature acaba con su propia definición del enum y aparecen valores fantasma en producción (`"ACTIVE"` vs `"active"` vs `"ACTIVO"` para lo mismo). El coste es depurar tres semanas después bugs que no se ven en desarrollo.

### 11.2 Dependencias entre features siempre explícitas

Cada feature del roadmap declara **todas** sus dependencias, incluidas las que "parecen obvias" (tablas ya creadas por otra feature, servicios ya instanciados, contextos ya resueltos). Una dependencia transitiva **no cuenta como declarada**.

**Regla dura**: si la feature F usa un artefacto que produce la feature G, F lista a G aunque haya features intermedias que también dependan de G.

Motivación: los subagentes SDD no razonan bien sobre transitividad. Si `send-email` usa la tabla `email_queue` (creada por `email-service`), `send-email` debe listar `email-service` aunque `db-schema` haya creado la tabla, porque el servicio funcional lo materializa `email-service`. Sin esta disciplina, los agentes empiezan features sin sus prerrequisitos reales y descubren a mitad de sprint que falta infraestructura.

### 11.3 Servicios externos nunca síncronos en el path crítico

Todo envío que dependa de un servicio externo (email, SMS, notificación push, webhook saliente, llamada a API de IA, envío a portal de terceros) pasa por una **cola persistente en base de datos**. El path crítico persiste el trabajo pendiente en la misma transacción del recurso de origen; un worker separado procesa la cola con backoff exponencial y política de reintentos declarada.

**Regla dura**: prohibido `await externalService.send()` (o equivalente) en el path de un endpoint público o de una operación de negocio.

Consecuencia: la caída del servicio externo **nunca** bloquea la operación de negocio. Un fallo de Resend no impide crear el lead. Un fallo de Stripe no impide registrar el pedido. Un fallo de la API de terceros no impide guardar la solicitud del usuario. El sistema degrada; no cae.

Excepción única: cuando la respuesta del servicio externo es **parte del contrato del endpoint** (ej. `POST /verify-payment` que debe retornar el resultado real). En ese caso el timeout y el fallback están declarados en el propio contrato.

### 11.4 Historiales inmutables por policy, no por convención

Toda tabla de auditoría (cambios de estado, eventos, registros de consentimiento, log de acciones administrativas, historial de reasignaciones) es **físicamente inmutable**: las policies de la base de datos impiden `UPDATE` y `DELETE` incluso desde el rol de aplicación.

**Regla dura**: confiar en que "convencionalmente no se modifica" es dejarlo a merced del primer bug, del primer script correctivo apresurado, o del primer agente que decide "limpiar" un histórico. La inmutabilidad se declara en el motor de datos.

Ejemplo (PostgreSQL con RLS):
```sql
CREATE POLICY history_read   ON audit_log FOR SELECT USING (…);
CREATE POLICY history_insert ON audit_log FOR INSERT WITH CHECK (…);
-- Deliberadamente no hay policy de UPDATE ni DELETE.
```

Tests verifican que un `UPDATE` sobre la tabla falla incluso con el rol de aplicación activo.

### 11.5 Dependencias del sistema de diseño desde la feature fundacional

Cuando el proyecto tiene sistema de diseño (design.md o equivalente), **todas** sus dependencias externas (fuentes, sets de iconos, librerías de mapas, librerías de motion, componentes base) se instalan y configuran en la **feature fundacional del sistema visual**, no como side-effect de la primera feature de UI que las necesite.

**Regla dura**: la primera feature de UI de negocio (una página real, un dashboard) no debe estar instalando fuentes, iconos y componentes primitivos a la vez que resuelve su propio problema. Los cimientos ya están.

Motivación: sin este patrón, la primera feature de UI se convierte en un vertedero de instalaciones. La cadena confunde "cimientos del sistema visual" con "necesidades de esta pantalla" y acaba mezclando tokens con lógica de negocio en el mismo commit.

### 11.6 Warnings suaves para redundancias intencionales

Cuando dos campos del dominio pueden diverger y **uno tiene autoridad** (típicamente porque uno es una decisión del operador y otro es un dato observable), el sistema **avisa pero no bloquea**. El bloqueo pertenece a las reglas duras del §6 del `product.md`; la contradicción entre campos redundantes es información, no error.

**Regla dura**: distinguir *"esto es incorrecto"* (bloquea) de *"esto parece raro"* (advierte).

Ejemplo: si un operador marca un producto como "novedad" pero su fecha de creación es de hace 3 años, el editor emite un warning suave (`"marcado como novedad pero se creó hace 3 años, ¿correcto?"`). No bloquea, porque el operador tiene contexto que el sistema no tiene (relanzamiento, cambio de posicionamiento, etc.).

Motivación: sistemas que bloquean por contradicciones semánticas suaves obligan a los operadores a mentir a la máquina para poder trabajar. Los warnings preservan la autoridad del operador sin ocultar el problema.

---

## 12. Límites operacionales del host de desarrollo

El agente NUNCA debe asumir que dispone de recursos ilimitados en la
máquina de desarrollo. Para evitar saturar memoria y CPU:

- **Vitest:** `pool: 'forks'`, `poolOptions.forks.singleFork: true`,
  `fileParallelism: false`. Tests secuenciales en proyecto local.
- **Playwright:** `workers: 1`, `fullyParallel: false`.
- **Nunca ejecutar `pnpm verify` y `pnpm dev` simultáneamente**: el primero
  ya levanta build, tests y E2E; el segundo levanta dev server.
- **Nunca lanzar más de un `pnpm install` a la vez** entre features.
- **Si una feature exige tests pesados (E2E con varias páginas)**, dividir
  en archivos pequeños y ejecutar uno a uno, no la suite completa de golpe.

Estas restricciones son **operacionales**, no estéticas. Violarlas puede
forzar reinicio del host y corromper el estado del repositorio.

**Versión:** 1.1 — Julio 2026
**Cambios desde v1.0:** añadida sección §11 "Patrones que emergen de la práctica" con 6 principios universales derivados de la ejecución de la metodología SDD en proyectos reales — enums cerrados como fuente única (§11.1), dependencias explícitas entre features (§11.2), servicios externos desacoplados por cola persistente (§11.3), historiales inmutables por policy no por convención (§11.4), dependencias del sistema de diseño desde la feature fundacional (§11.5), warnings suaves para redundancias intencionales (§11.6). Renumeración: la antigua §11 (Límites operacionales del host) pasa a §12.
**Mantenedor:** Darío J. Díaz Caballero