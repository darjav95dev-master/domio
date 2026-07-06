# Quickstart: Bootstrap del proyecto

**Feature**: F001 · bootstrap-project
**Date**: 2026-07-06

## Prerequisites

- Node.js ≥ 20
- pnpm (o `corepack enable` para usar el packageManager del proyecto)
- Git

## Setup

```bash
# 1. Clonar e instalar
git clone <repo-url> domio
cd domio
git checkout feature/001-bootstrap-project

# 2. Instalar dependencias (pnpm se resuelve via corepack)
corepack enable
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con valores reales (opcional en F001 — los servicios no están activos aún)

# 4. Iniciar servidor de desarrollo
pnpm dev
# → Abrir http://localhost:3000
```

## Validation scenarios

### VS-1: Arranque limpio
```bash
pnpm dev
# Expected: servidor en localhost:3000, sin errores en consola
# Expected: página por defecto de Next.js visible en el navegador
```

### VS-2: Health endpoint
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

### VS-3: Quality gate
```bash
pnpm quality
# Expected: lint → OK, typecheck → OK, test:run → OK
# Expected: exit code 0
```

### VS-4: Build de producción
```bash
pnpm build
# Expected: build exitoso, carpeta .next/ generada
```

### VS-5: Hooks de Husky (pre-commit)
```bash
echo "const x: number = 'string'" > src/test-break.ts
git add src/test-break.ts
git commit -m "test: should fail"
# Expected: commit rechazado por error de typecheck
rm src/test-break.ts
```

### VS-6: Variables de entorno documentadas
```bash
cat .env.example
# Expected: 10 variables con descripciones
# Expected: .env.local aparece en .gitignore
grep ".env.local" .gitignore
```

### VS-7: Estructura de carpetas
```bash
ls app/        # Expected: (public)/  (auth)/  api/  layout.tsx  globals.css
ls src/        # Expected: shared/  features/  context/  infrastructure/
ls tests/      # Expected: unit/  isolation/  contract/  e2e/
```

## Scripts reference

| Script | Descripción |
|--------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm start` | Iniciar build de producción |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Vitest en modo watch |
| `pnpm test:run` | Vitest single run |
| `pnpm test:coverage` | Vitest con coverage |
| `pnpm test:e2e` | Playwright |
| `pnpm test:contract` | Contract tests (reservado) |
| `pnpm quality` | lint + typecheck + test:run |
| `pnpm verify` | quality + test:contract + test:e2e + build |
