# Tasks: contacto-y-sobre

## Phase 1: Setup + Server Layer

- [ ] T001 Crear estructura src/features/contact/components/ y src/features/contact/server/
- [ ] T002 Implementar getContactData en src/features/contact/server/get-contact-data.ts: obtiene contact_config completo (teléfono, email, dirección, horario, coordenadas oficina, whatsapp) y content_blocks con page_key='about'.

## Phase 2: Página /contacto

- [ ] T003 [P] Crear ContactHeader en src/features/contact/components/ContactHeader.tsx: header centrado con eyebrow + H1 "Contacto" + lead.
- [ ] T004 [P] Crear QuickBand en src/features/contact/components/QuickBand.tsx: grid 4-col con icono + caption + valor (teléfono, email, dirección, horario) desde contact_config.
- [ ] T005 [P] Crear ContactFormGeneric en src/features/contact/components/ContactFormGeneric.tsx: formulario genérico (nombre, email, mensaje) que envía a contact_config.email o crea lead genérico.
- [ ] T006 [P] Crear OfficeMap en src/features/contact/components/OfficeMap.tsx: Client Component con maplibre-gl mostrando ubicación de oficina.
- [ ] T007 Crear página app/(public)/contacto/page.tsx: integra ContactHeader + QuickBand + grid 1.4fr 1fr (ContactFormGeneric + OfficeMap/datos).

## Phase 3: Página /sobre

- [ ] T008 Crear página app/(public)/sobre/page.tsx: layout editorial con contenido desde content_blocks (page_key='about'), fotografía arquitectónica.

## Phase 4: Polish

- [ ] T009 Verificar Lighthouse Accessibility ≥90 en ambas páginas.
- [ ] T010 Verificar que ambas páginas usan Nav y Footer (F018).
