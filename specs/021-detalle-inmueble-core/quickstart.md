# Quickstart Validation: detalle-inmueble-core

## Prerrequisitos

- Base de datos con seed data (F009): `pnpm db:seed`
- Servidor de desarrollo: `pnpm dev`

## Escenarios de validación

### 1. Ficha renderiza con datos reales

1. Navegar a `/portafolio` y hacer clic en cualquier promoción PUBLISHED.
2. **Esperado**: ficha carga con detail hero, infobar 4-col, bloques editoriales, tabla de tipologías, mapa.
3. Verificar que no hay cajas negras ni imágenes rotas.

### 2. Bloques condicionales por kind

1. Abrir una promoción kind='portfolio' (ej: "Residencial Parque Novo" del seed).
2. **Esperado**: aparecen los 5 bloques editoriales (descripción, calidades, zonas comunes, ubicación, plazos).
3. Abrir una promoción kind='external' (ej: una captación externa del seed).
4. **Esperado**: solo aparecen 3 bloques (descripción, calidades, ubicación). NO zonas comunes ni plazos.

### 3. Modo de privacidad del mapa

1. Abrir una promoción con map_privacy_mode='EXACT'.
2. **Esperado**: mapa muestra punto en coordenadas reales.
3. Abrir una promoción con map_privacy_mode='AREA'.
4. **Esperado**: mapa muestra círculo aproximado.
5. Verificar con `curl` o inspección de HTML que las coordenadas exactas NO aparecen en el HTML servido.

### 4. SEO meta tags

1. Inspeccionar el `<head>` de la ficha.
2. **Esperado**: `<title>` y `<meta name="description">` presentes.
3. Si la promoción tiene seo_title vacío, verificar que el fallback sigue el patrón "{tipo} en {operacion} en {zona} — {n_dormitorios} dormitorios | Domio".
4. Verificar Open Graph tags (og:title, og:description, og:image).
5. Verificar datos estructurados JSON-LD RealEstateListing en el HTML.

### 5. Tabla de tipologías

1. En la ficha, verificar la tabla de tipologías.
2. **Esperado**: columnas nombre, superficie, dormitorios, baños, precio, estado con datos reales.
3. Verificar que los planos se muestran en columna separada con MediaImage.

### 6. ISR funcional

1. En backoffice, modificar una promoción PUBLISHED (ej: cambiar precio).
2. Guardar y publicar.
3. Volver a la ficha pública.
4. **Esperado**: el cambio se refleja sin necesidad de redeploy.

### 7. Lighthouse

1. Ejecutar Lighthouse en `/inmuebles/[slug]`.
2. **Esperado**: Performance ≥80, Accessibility ≥90.
