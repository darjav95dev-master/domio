# Domio

Plataforma de comercialización inmobiliaria. Domio conecta promotoras y agentes con compradores e inquilinos a través de un catálogo publicable, un backoffice de gestión y una API pública versionada.

## Requisitos previos

- Node.js >= 20
- pnpm 9.x (se activa vía corepack)

## Instalación y arranque local

```bash
corepack enable
pnpm install
cp .env.example .env.local
# Edita .env.local con las credenciales de desarrollo
pnpm dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Inicia el servidor de desarrollo |
| `pnpm build` | Genera el build de producción |
| `pnpm start` | Inicia el servidor de producción (requiere build previo) |
| `pnpm lint` | Ejecuta ESLint con flat config (sonarjs + jsx-a11y) |
| `pnpm typecheck` | Ejecuta `tsc --noEmit` |
| `pnpm test` | Ejecuta Vitest en modo watch |
| `pnpm test:run` | Ejecuta Vitest una sola vez |
| `pnpm test:coverage` | Ejecuta Vitest con reporte de cobertura |
| `pnpm test:e2e` | Ejecuta los tests E2E con Playwright |
| `pnpm test:contract` | Reservado para tests de contrato de la API pública |
| `pnpm quality` | Ejecuta lint + typecheck + test:run |
| `pnpm verify` | Ejecuta quality + contract + e2e + build |

## Calidad y hooks de git

El repositorio usa Husky para proteger los commits y pushes:

- **pre-commit**: `pnpm lint && pnpm typecheck`
- **pre-push**: `pnpm test:run && pnpm build`

Ejecuta `pnpm verify` antes de cualquier merge a `main`.

## Estructura del proyecto

```text
app/              # Rutas de Next.js App Router
src/              # Lógica de negocio
  shared/         # Código reutilizable entre features
  features/       # Código específico de cada feature
  context/        # Estado global
  infrastructure/ # Servicios externos (DB, auth, email, etc.)
tests/            # Tests unitarios, de aislamiento, contrato y E2E
```

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena las credenciales de desarrollo. Nunca commitees `.env.local` ni valores reales de secretos.
