# Research: detalle-inmueble-core

## Decisiones de diseño

### 1. maplibre-gl vs alternativas de mapas

**Decisión**: maplibre-gl con tiles de OpenStreetMap.

**Rationale**: architecture.md §1 lista "Google Maps" como servicio NO. maplibre-gl es open-source, compatible con tiles OSM, y no tiene dependencia comercial. El componente MapPromocion es cliente (Client Component) y carga el mapa dinámicamente.

**Alternativas consideradas**: Leaflet (menos rendimiento), Google Maps (prohibido por architecture.md §1), Mapbox (requiere API key comercial).

### 2. Renderizado de bloques editoriales

**Decisión**: Un componente `EditorialBlocks` que itera sobre los bloques y delega en sub-componentes por `block_type`.

**Rationale**: Los 5 block_types tienen estructuras muy diferentes. Un componente por tipo mantiene la complejidad baja y permite condicionalidad por kind (ZONAS_COMUNES y PLAZOS_GARANTIAS solo si kind='portfolio').

**Alternativas consideradas**: Un solo componente con switch interno (alta complejidad cognitiva), renderizado genérico con JSON (pierde control de diseño).

### 3. Modo de privacidad del mapa

**Decisión**: Si map_privacy_mode='AREA', el componente no recibe coordenadas exactas en props. El servidor solo envía location_approx (centroide del municipio). El HTML servido nunca contiene coordenadas exactas.

**Rationale**: architecture.md §7.3 y product.md §4 exigen que las coordenadas exactas no se expongan. La protección es en el servidor, no solo en el cliente.

**Alternativas consideradas**: Ocultar coordenadas con CSS (insuficiente, quedan en HTML), redactar en cliente (el HTML ya las contiene).

### 4. SEO fallback determinista

**Decisión**: Si seo_title está vacío → `"{tipo} en {operacion} en {zona} — {n_dormitorios} dormitorios | Domio"`. Si seo_description está vacío → resumen de 155 chars desde descripción general.

**Rationale**: product.md §4 y §5.1 definen el fallback. Es determinista (mismos datos → mismo resultado) y no requiere intervención del operador.

### 5. Datos estructurados RealEstateListing

**Decisión**: Generar JSON-LD desde los bloques editoriales estructurados, no desde texto libre.

**Rationale**: Los bloques tienen campos tipificados (superficie, dormitorios, precio) que mapean directamente a las propiedades de RealEstateListing de schema.org. Es más fiable que extraer de texto libre.
