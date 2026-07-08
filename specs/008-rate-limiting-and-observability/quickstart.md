# Quickstart: Rate Limiting & Observability

**Feature**: 008 | **Date**: 2026-07-08

---

## Prerrequisitos

- `.env.local` con las variables:
  - `RATE_LIMIT_STORE_URL` — URL de Upstash Redis (o vacía para desactivar rate limiting en dev)
  - `SENTRY_DSN` — DSN del proyecto Sentry (o vacía para desactivar Sentry en dev)
- Base de datos migrada y seedeada (`pnpm db:migrate && pnpm db:seed`)
- Al menos una API key creada en la BD (para probar rate limiting por key)

---

## Escenarios de validación

### V-1: Rate limiting por IP en login

1. Arrancar la app: `pnpm dev`
2. Ir a `/panel/login`
3. Introducir credenciales incorrectas 5 veces seguidas desde la misma IP
4. **Resultado esperado**: El 6º intento recibe HTTP 429 con mensaje "Rate limit exceeded"
5. Esperar 15 minutos (o limpiar la clave Redis manualmente)
6. **Resultado esperado**: Login funciona de nuevo

### V-2: Rate limiting por API key

1. Crear una API key con `rate_limit_per_min = 5` (vía seed o directamente en BD)
2. Ejecutar 6 requests rápidas a `/api/v1/promociones` con header `X-API-Key: <key>`
3. **Resultado esperado**: La 6ª request recibe HTTP 429 con headers `X-RateLimit-*`
4. Verificar headers en las respuestas anteriores: `X-RateLimit-Limit: 5`, `X-RateLimit-Remaining` decrementando

### V-3: Degradación graceful

1. Configurar `RATE_LIMIT_STORE_URL` con una URL inválida (ej: `https://invalid.upstash.io`)
2. Reiniciar la app
3. Hacer requests a `/api/v1/promociones`
4. **Resultado esperado**: Las requests pasan sin límite (no hay 429). En la consola del servidor aparece un log `warn` indicando la degradación.

### V-4: Sentry captura errores con tenant_id

1. Configurar `SENTRY_DSN` con un DSN válido de desarrollo
2. Introducir un error intencional en una server action (ej: `throw new Error('test')`)
3. Ejecutar la server action desde el backoffice
4. **Resultado esperado**: El error aparece en el dashboard de Sentry con tag `tenant_id` presente
5. Verificar que el tag `user_id` y `role` también están presentes si hay sesión

### V-5: Error boundary renderiza fallback

1. Crear un componente de prueba que lance un error en render: `throw new Error('test boundary')`
2. Montar el componente dentro de una página
3. **Resultado esperado**: La página muestra el fallback del error boundary (mensaje + botón "Reintentar"), no una pantalla en blanco ni un stack trace
4. Pulsar "Reintentar"
5. **Resultado esperado**: Se reintenta el render (y falla de nuevo si el componente sigue lanzando)

### V-6: Sentry sin DSN es no-op

1. Dejar `SENTRY_DSN` vacía en `.env.local`
2. Lanzar un error en cualquier parte de la app
3. **Resultado esperado**: La app funciona normalmente, no hay errores en consola relacionados con Sentry, el error boundary sigue capturando y mostrando fallback

---

## Tests automatizados

```bash
# Tests unitarios del rate limiter
pnpm vitest run src/infrastructure/rate-limiting/ --reporter=dot

# Tests unitarios del wrapper de Sentry
pnpm vitest run src/infrastructure/observability/ --reporter=dot

# Tests del error boundary
pnpm vitest run src/shared/components/error-boundary --reporter=dot

# Todos los tests de la feature
pnpm vitest run --reporter=dot
```

---

## Referencias

- [spec.md](./spec.md) — requisitos funcionales y criterios de aceptación
- [data-model.md](./data-model.md) — entidades y claves Redis
- [contracts/](./contracts/) — interfaces del rate limiter, Sentry wrapper y error boundary
