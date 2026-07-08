# Data Model: detalle-inmueble-core

## Entidades consumidas (lectura)

Esta feature no crea nuevas tablas. Consume entidades existentes:

### Promoción (promociones)
- **Campos usados**: id, slug, nombre, tipo, operacion, kind, status, construction_status, precio, superficie, dormitorios, baños, municipio, isla, direccion, map_privacy_mode, location, location_approx, seo_title, seo_description, created_at, updated_at
- **Relaciones**: tiene muchas tipologías, unidades, bloques editoriales, media_assets

### Tipología (tipologias)
- **Campos usados**: id, nombre, superficie, dormitorios, baños, precio, estado, promocion_id
- **Relaciones**: pertenece a promoción

### Unidad (unidades)
- **Campos usados**: id, nombre, superficie, estado, promocion_id, tipologia_id
- **Relaciones**: pertenece a promoción y tipología

### Bloque editorial (promocion_content_blocks)
- **Campos usados**: id, block_type, payload (JSONB), sort_order, promocion_id
- **block_types**: DESCRIPCION_GENERAL, MEMORIA_CALIDADES, ZONAS_COMUNES, UBICACION_SERVICIOS, PLAZOS_GARANTIAS
- **Relaciones**: pertenece a promoción

### Media Asset (media_assets)
- **Campos usados**: id, url, alt_text, kind, is_cover, sort_order, promocion_id
- **kinds usados**: IMAGE_GALLERY (galería hero), PLAN (planos en tabla)
- **Relaciones**: pertenece a promoción

## Reglas de negocio aplicadas

1. **PublicContext**: solo promociones con status='PUBLISHED' son accesibles.
2. **kind constraint**: ZONAS_COMUNES y PLAZOS_GARANTIAS solo existen si kind='portfolio'.
3. **map_privacy_mode**: si 'AREA', coordenadas exactas nunca se exponen.
4. **slug persistente**: el slug no cambia al renombrar la promoción.
5. **alt_text obligatorio**: toda imagen tiene alt_text (garantizado por schema).

## Validaciones

- Slug debe existir → 404 si no.
- Promoción debe ser PUBLISHED → 404 si no.
- Imágenes sin alt_text no deberían existir (garantizado por schema de F013).
