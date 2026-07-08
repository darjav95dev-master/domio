# Data Model: Team and API Keys

## Existing Entities

### users (F002)
id, tenant_id, name, email, role, password_hash, is_active, created_at, updated_at

### api_keys (F002)
id, tenant_id, name, key_hash, rate_limit_per_min, is_active, last_used_at, created_at, updated_at

## New Repositories

### UserRepository
- findAll(filters), findById(id), create(data), update(id, data), deactivate(id)

### ApiKeyRepository
- findAll(filters), findById(id), create(name, rateLimit), revoke(id), verifyKey(plainKey)
