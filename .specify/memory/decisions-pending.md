# Decisiones Pendientes de Revisión

> Registro de inconsistencias y decisiones de diseño que requieren revisión humana.
> Actualizado por features del ciclo SDD cuando detectan desviaciones o deuda técnica.

---

## DP-001 · `email_queue` sin `tenant_id` — Inconsistencia con `architecture.md §6.5`

**Detectado en**: F002 (audit M6), re-confirmado en F007 (quality review C0)  
**Fecha**: 2026-07-08  
**Severidad**: Media (no bloquea MVP single-tenant, pero rompe multi-tenant DNA)

### Contexto

`architecture.md §6.5` (línea 340) lista `tenant_id` como columna de `email_queue`:

```markdown
| `email_queue` | `id`, `tenant_id`, `to_email`, `template`, ...
```

Sin embargo, el schema real (`src/infrastructure/db/schema/email-queue.ts`) **no incluye `tenant_id`** ni RLS, con comentario explícito:

```typescript
// Infrastructure table — no tenant_id, no RLS by design. See architecture.md §6.5 note.
```

### Decisión original de F002

F002 documentó esta omisión como **decisión consciente**:

> *"email_queue sin tenant_id: Decisión consciente de dejar esta tabla fuera del multi-tenant por ser un mecanismo de infraestructura (cola de envío) no vinculado a un tenant específico."*  
> — `tfm-evidencias.md` línea 108

### Problema

La decisión de F002 contradice la documentación de `architecture.md`. El efecto práctico:

1. **Single-tenant (hoy)**: No hay problema funcional.
2. **Multi-tenant (mañana)**: El worker procesaría emails de todos los tenants sin filtrado. No hay forma de atribuir emails a un tenant específico (Sentry, observabilidad, auditoría).

### Opciones de resolución

| Opción | Acción | Implicaciones |
|--------|--------|---------------|
| **A. Mantener multi-tenant DNA estricta** | Añadir `tenant_id NOT NULL` a `email_queue`, migración, RLS, y filtrado en el worker. | Requiere migración. El worker necesitará contexto de tenant (o procesar por tenant en bucle). Alinea con constitution §11.2 y architecture §2.1. |
| **B. Aceptar como infraestructura global** | Corregir `architecture.md §6.5` para quitar `tenant_id` de la fila. Documentar excepción explícita en §2.1 (como puentes N:M). | Más simple. Rompe la regla "toda tabla de dominio lleva tenant_id". Requiere justificación documental de por qué email_queue es excepción. |

### Recomendación

**Opción A** (mantener multi-tenant DNA). La regla de constitution §2.1 es explícita: *"Toda tabla de dominio lleva tenant_id NOT NULL. Sin excepciones"*. Si email_queue es excepción, debe documentarse como tal en constitution §2.1.4 (actualmente solo menciona puentes N:M).

### Estado

- [ ] Pendiente de decisión humana
- [ ] No corregir en features del MVP sin revisión explícita

---

## Cómo añadir nuevas entradas

Cuando una feature detecte una inconsistencia o decisión pendiente:

1. Copiar la plantilla abaixo.
2. Asignar ID secuencial (DP-002, DP-003, ...).
3. Documentar contexto, opciones y recomendación.
4. Marcar como "Pendiente de decisión humana".

### Plantilla

```markdown
## DP-XXX · [Título breve]

**Detectado en**: [Feature que lo detectó]  
**Fecha**: [YYYY-MM-DD]  
**Severidad**: [Alta/Media/Baja]

### Contexto
[Descripción de la inconsistencia o decisión pendiente]

### Opciones de resolución
| Opción | Acción | Implicaciones |
|--------|--------|---------------|
| **A. [Nombre]** | [Qué hacer] | [Consecuencias] |
| **B. [Nombre]** | [Qué hacer] | [Consecuencias] |

### Recomendación
[Opción recomendada con justificación]

### Estado
- [ ] Pendiente de decisión humana
```

---

**Última actualización**: 2026-07-08  
**Total decisiones pendientes**: 1
