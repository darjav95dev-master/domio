---
description: Audita una feature concreta del codebase contra constitution.md, architecture.md y product.md. Invoca al subagente code-auditor (Claude Sonnet 4.6) y produce un informe parcial en .specify/audits/feature-XXX-audit.md con hallazgos clasificados por severidad y fixes propuestos en formato textual (no aplicados).
---

# /audit-codebase · auditoría incremental de features

Audita una feature concreta del codebase contra los principios del
proyecto. Invoca al subagente `code-auditor` que usa Claude Sonnet 4.6
para escanear con calma el código mergeado y producir un informe
estructurado.

## Uso

```
/audit-codebase 009
/audit-codebase 010
/audit-codebase all
```

- Con un número: audita solo esa feature.
- Con `all`: audita en orden todas las features mergeadas a main que
  aún no tengan un informe en `.specify/audits/`.

## Qué hace este comando

1. Determina qué feature(s) auditar según el argumento recibido.
2. Para cada feature:
   - Invoca al subagente `code-auditor` pasándole el número de feature.
   - Espera a que produzca el informe en
     `.specify/audits/feature-XXX-audit.md`.
   - Recoge el veredicto (VERDE/AMARILLO/ROJO).
3. Al terminar todas las auditorías, produce un resumen consolidado
   en `.specify/audits/global-summary.md` con:
   - Tabla de veredictos por feature.
   - Total de hallazgos críticos / mayores / menores.
   - Recomendación global: ¿el codebase entero es defendible para el TFM
     en este estado, o requiere reparaciones antes?

## Reglas para el invocador

- **No aplicas fixes durante la auditoría.** El auditor solo propone.
- **No mergeas ni haces push.** La auditoría es read-only sobre el repo.
- **Si una feature no está mergeada a main pero existe su rama
  `feature/XXX-*`**, audita la rama directamente (cambia a ella con
  `git checkout` antes de invocar al auditor, y vuelve a main al
  terminar).
- **Crea el directorio `.specify/audits/` si no existe** antes de la
  primera auditoría.

## Salida esperada al usuario

Al terminar, devuelve al usuario:

- Lista de features auditadas con su veredicto.
- Path de los informes generados.
- Path del resumen global.
- Una recomendación de una línea: "Defender tal cual" / "Reparar antes
  de defender" / "Reparar las features X, Y, Z y re-auditar".

## Ejemplo de flujo

```
Usuario: /audit-codebase all

Asistente:
[Invocando code-auditor sobre feature 009...]
  ✅ Feature 009 (bootstrap-repo): 🟢 VERDE — informe en .specify/audits/feature-009-audit.md
[Invocando code-auditor sobre feature 010...]
  ⚠️ Feature 010 (page-catalog): 🟡 AMARILLO — 3 hallazgos mayores
[...]

Resumen escrito en .specify/audits/global-summary.md
Recomendación: Reparar las features 011 y 013 (rojas) antes de defender el TFM.
```
