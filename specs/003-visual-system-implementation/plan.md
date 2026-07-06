# Implementation Plan: Visual System Implementation

**Branch**: `feature/003-visual-system-implementation` | **Spec**: [spec.md](./spec.md)

## Technical Context
**Stack**: Tailwind CSS v4, next/font/google, React 19, Phosphor Icons
**Source of truth**: design.md §2 (palette), §3 (typography), §7 (component contracts), §12 (Tailwind implementation), §14 (icons)

## Constitution Check
| § | Status |
|---|--------|
| §1 Stack (Next.js + Tailwind) | ✅ |
| §4 Accesibilidad (jsx-a11y) | ✅ aria-label, role en todos los primitives |
| §10 Sin dependencias nuevas sin justificar | ✅ Phosphor icons justificado por design.md §14 |

## Source Structure
```
app/globals.css               # :root tokens + @theme inline
app/layout.tsx                # next/font/google loading
src/shared/components/
├── button.tsx                # 4 variants + motion
├── input.tsx                 # FormField with label/states
├── skeleton.tsx              # Shimmer + reduced-motion
├── toast.tsx                 # 4 variants + aria-live
├── media-image.tsx           # next/image wrapper + fallback
└── index.ts
```
