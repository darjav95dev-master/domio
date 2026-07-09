# Data Model: E2E Tests

**Feature**: 026-e2e-tests | **Date**: 2026-07-09

## Overview

Esta feature no introduce nuevas entidades de dominio. Los tests E2E operan sobre las entidades existentes del sistema Domio. Este documento describe las entidades que los tests leen/escriben y las relaciones que los tests verifican.

## Entidades Operadas por Tests

### Page Object (patrón de diseño)

- **BasePage**: Clase abstracta con métodos comunes (`goto`, `waitForLoad`, `getTitle`). Todas las páginas heredan de esta.
- **HomePage**: Extiende BasePage. Selectores para hero, trust card, portafolio destacado, bloques, FAQ, footer.
- **PortafolioPage**: Extiende BasePage. Selectores para filter bar, grid de PropertyCards, paginación, empty state.
- **InmuebleDetailPage**: Extiende BasePage. Selectores para galería, infobar, bloques editoriales, tabla tipologías, mapa, formulario contacto.
- **ContactoPage**: Extiende BasePage. Selectores para formulario de contacto genérico, quick-band, mapa.
- **LoginPage**: Extiende BasePage. Selectores para email input, password input, submit button, error messages.
- **DashboardPage**: Extiende BasePage. Selectores para contador leads no leídos, últimas promociones, enlaces rápidos.
- **CatalogoPage**: Extiende BasePage. Selectores para listado, filtros, PropertyCards del panel.
- **CatalogoEditPage**: Extiende BasePage. Selectores para formulario de edición (secciones: identidad, estado comercial, ubicación, SEO, agente), botón publicar, indicador autoguardado.
- **LeadsPage**: Extiende BasePage. Selectores para bandeja, filtros, lista de leads, badge no leídos.
- **LeadDetailPage**: Extiende BasePage. Selectores para estado actual, máquina de estados (botones de transición), notas, histórico.
- **EquipoPage**: Extiende BasePage. Selectores para listado de usuarios, formulario de creación, roles.
- **ApiKeysPage**: Extiende BasePage. Selectores para listado de keys, botón crear, modal de creación, botón revocar.
- **ArsopPage**: Extiende BasePage. Selectores para listado de solicitudes, botón exportar, botón borrar.
- **ContenidosContactoPage**: Extiende BasePage. Selectores para formulario de configuración de contacto (teléfono, email, dirección, horario, WhatsApp).

### Test Fixtures

- **DbResetHelper**: No es una entidad de dominio. Helper que ejecuta TRUNCATE CASCADE en tablas mutables y re-inserta datos seed base antes de cada suite.
- **AuthHelper**: No es una entidad de dominio. Helper que encapsula el flujo de login usando LoginPage Page Object.

## Entidades de Dominio que los Tests Verifican

| Entidad | Tabla | Tests que la operan |
|---------|-------|-------------------|
| Promoción | promociones | visitor (read), catalog-editor (read/write), api-consumer (read) |
| Tipología | tipologias | visitor (read), catalog-editor (read) |
| Unidad | unidades | visitor (read) |
| Lead | leads | visitor (write), sales-agent (read/write), api-consumer (write), admin (read/write/delete) |
| Lead Note | lead_notes | sales-agent (write) |
| Lead History | lead_history | sales-agent (read), admin (read) |
| Lead Read Mark | lead_read_marks | sales-agent (read/write) |
| Consent Record | consent_records | visitor (write), api-consumer (write) |
| ARSOP Request | arsop_requests | admin (write/read) |
| Content Block | content_blocks | visitor (read), admin (write via contenidos) |
| Contact Config | contact_config | visitor (read via footer), admin (write) |
| API Key | api_keys | api-consumer (read via auth), admin (write) |
| User | users | admin (write), all auth tests (read) |
| Media Asset | media_assets | catalog-editor (write) |

## Relaciones Verificadas por Tests

- Lead → Promoción (lead creado desde formulario de ficha está asociado a la promoción)
- Lead → Consent Record (todo lead tiene al menos un consent_record)
- Lead → Lead Read Mark (lead abierto por agente genera read_mark)
- Lead → Lead History (cada cambio de estado genera entrada en histórico)
- Lead → Lead Note (notas internas asociadas al lead)
- Promoción → Media Assets (galería de imágenes asociada)
- Promoción → Content Blocks (bloques editoriales asociados)
- ARSOP Request → Lead (request de borrado referencia al lead eliminado)
- API Key → User (key creada por admin, usada por consumidor)
