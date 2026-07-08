# Quickstart: Team and API Keys

## Scenarios
1. ADMIN crea usuario → email encolado
2. ADMIN desactiva usuario → is_active=false, histórico intacto
3. ADMIN crea API key → clave mostrada una vez, hash almacenado
4. ADMIN revoca key → is_active=false, autenticación rechazada
5. No-ADMIN intenta acceder → denegado
