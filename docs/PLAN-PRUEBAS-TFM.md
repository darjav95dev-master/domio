# Plan de pruebas — Domio (entrega TFM)

> Plan de pruebas **exhaustivo**, a nivel de **funcionalidad y experiencia de usuario**,
> para validar el sistema completo antes de la entrega del TFM. Pensado para ejecutarse
> manualmente y dejar evidencia (marcar OK/KO y adjuntar captura donde aporte).

## Cómo usar este plan
- **Entornos:** ejecutar en **Producción** (`https://wedomio.com`) y repetir el bloque
  esencial en **Desarrollo** (`https://dev.wedomio.com`).
- **Estados:** ⬜ pendiente · ✅ OK · ❌ KO (anota el fallo) · ⚠️ OK con observaciones.
- **Dispositivos UX:** cada bloque público hazlo en **escritorio** y en **móvil** (DevTools
  responsive o teléfono real). Anota si algo se rompe en móvil.
- **Roles:** para el backoffice, prueba con `admin@domio.dev` (ADMIN) y, donde se indique,
  con un usuario AGENT y otro OPERATOR.
- **Criterio de aceptación global:** no hay ❌ en casos marcados **[crítico]**; los ⚠️ están
  documentados con su justificación.

---

# A. SITIO PÚBLICO

## A1. Home (`/`)
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| PUB-01 [crítico] | Cargar la home | Carga < 3 s, sin errores en consola, hero + secciones visibles | ⬜ |
| PUB-02 | Bloques de contenido editorial (los editados en el panel) | Se muestran los textos/imagenes configurados, no placeholders | ⬜ |
| PUB-03 | Enlaces de navegación principales | Todos llevan a su destino (portafolio, contacto, sobre) | ⬜ |
| PUB-04 UX | Ver en móvil | Layout responsive, sin scroll horizontal, menú hamburguesa funciona | ⬜ |
| PUB-05 UX | Imágenes | Cargan (Unsplash), con `alt`, sin saltos bruscos de layout | ⬜ |

## A2. Catálogo / Portafolio (`/portafolio`)
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| CAT-01 [crítico] | Listar catálogo | Muestra las 9 promociones publicadas con foto, título, precio, ubicación | ⬜ |
| CAT-02 | Filtro **operación** (venta/alquiler) | La lista se reduce correctamente | ⬜ |
| CAT-03 | Filtro **isla** y **municipio** | Filtra por ubicación; municipio depende de la isla | ⬜ |
| CAT-04 | Filtro **tipo de inmueble** | Filtra por tipología | ⬜ |
| CAT-05 | Filtro **precio** (min/max) | Solo aparecen los del rango | ⬜ |
| CAT-06 | Filtro **dormitorios / baños** | Filtra por número | ⬜ |
| CAT-07 | Filtro **amenities** (toggle múltiple) | Combina varios; resultado coherente | ⬜ |
| CAT-08 | Filtro **estado de obra** | Filtra por estado | ⬜ |
| CAT-09 | **Combinar** varios filtros | Se aplican en conjunto (AND) | ⬜ |
| CAT-10 | **Limpiar filtros** | Vuelve al listado completo | ⬜ |
| CAT-11 [crítico] | **Estado vacío**: filtros sin resultados | Mensaje de "sin resultados" claro, no página en blanco ni error | ⬜ |
| CAT-12 | **Paginación / carga** de más resultados | Funciona sin duplicar ni saltar elementos | ⬜ |
| CAT-13 UX | Filtros en **móvil** | Panel/acordeón de filtros usable con el pulgar | ⬜ |
| CAT-14 UX | Persistencia de filtros en la URL | Al recargar o compartir el enlace, se mantienen los filtros | ⬜ |

## A3. Detalle de inmueble (`/inmuebles/[slug]`)
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| DET-01 [crítico] | Abrir una ficha desde el catálogo | Carga la ficha completa del inmueble correcto | ⬜ |
| DET-02 | **Hero** + galería de imágenes | Galería navegable, imágenes cargan, portada correcta | ⬜ |
| DET-03 | **InfoBar / IntroStats** (precio, m², hab., baños) | Datos coherentes con el catálogo | ⬜ |
| DET-04 | **Bloques** (descripción, calidades, zonas comunes, ubicación, plazos) | Se muestran los que tengan contenido; los vacíos no aparecen | ⬜ |
| DET-05 | **Tabla de tipologías** | Lista las tipologías con sus datos | ⬜ |
| DET-06 [crítico] | **Mapa** (MapPromocion) | Carga el mapa centrado en la ubicación; respeta privacidad (área aprox. si aplica) | ⬜ |
| DET-07 | **Proceso de compra / plazos** | Sección visible y legible | ⬜ |
| DET-08 | **Inmuebles relacionados** | Muestra otros inmuebles y enlazan bien | ⬜ |
| DET-09 | Slug inexistente (`/inmuebles/no-existe`) | Página 404 controlada, no error 500 | ⬜ |
| DET-10 UX | Móvil | Galería, mapa y tablas se adaptan; sin scroll horizontal | ⬜ |

## A4. Engagement (favoritos, compartir, WhatsApp, contacto)
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| ENG-01 | **Añadir a favoritos** desde una ficha/tarjeta | Se marca como favorito | ⬜ |
| ENG-02 [crítico] | Ir a `/favoritos` | Muestra los guardados (persisten por navegador) | ⬜ |
| ENG-03 | **Quitar de favoritos** | Se elimina de la lista | ⬜ |
| ENG-04 | Favoritos en **otro navegador/incógnito** | Vacío (son por navegador, no globales) | ⬜ |
| ENG-05 | **Compartir** (ShareButton) | Copia enlace / abre share nativo en móvil | ⬜ |
| ENG-06 | **WhatsApp** (WhatsAppButton) | Abre WhatsApp con mensaje prellenado y número correcto | ⬜ |
| ENG-07 [crítico] | **Formulario de contacto** de la ficha (envío válido) | Muestra éxito; crea lead (verificar en panel) | ⬜ |
| ENG-08 | Formulario con **campos inválidos** | Validación clara, no envía | ⬜ |
| ENG-09 | Formulario **sin resolver Turnstile** | Rechazado en servidor | ⬜ |

## A5. Contacto y Sobre (`/contacto`, `/sobre`)
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| CON-01 [crítico] | Enviar formulario de **/contacto** válido | Éxito + lead creado + (email, ver INT) | ⬜ |
| CON-02 | Datos de contacto (los editados en panel `contenidos/contacto`) | Coinciden con lo configurado | ⬜ |
| CON-03 | Página **/sobre** | Contenido editorial correcto | ⬜ |
| CON-04 UX | Formularios en móvil | Teclado adecuado por campo, sin zoom molesto | ⬜ |

## A6. Chrome compartido y RGPD
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| CHR-01 | Navegación y footer en todas las páginas públicas | Consistentes, enlaces legales presentes | ⬜ |
| CHR-02 [crítico] | **Banner de cookies / consentimiento** (RGPD) | Aparece; permite aceptar/rechazar; se registra la decisión | ⬜ |
| CHR-03 | Páginas **legales** (`/legal/[slug]`: privacidad, aviso, cookies) | Cargan el texto correspondiente | ⬜ |
| CHR-04 | Reabrir tras aceptar cookies | No vuelve a pedir consentimiento | ⬜ |

---

# B. BACKOFFICE (`/panel`)

## B1. Autenticación y sesión
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| AUT-01 [crítico] | Entrar a `/panel` **sin sesión** | Redirige a `/panel/login` | ⬜ |
| AUT-02 [crítico] | Login con **admin + nueva contraseña** | Entra al panel | ⬜ |
| AUT-03 | Login con **contraseña incorrecta** | Error claro, no entra | ⬜ |
| AUT-04 | Login con usuario **desactivado** | No entra | ⬜ |
| AUT-05 [crítico] | **Rate limit de login**: varios intentos fallidos seguidos | Bloquea/limita (429 o mensaje), protege de fuerza bruta | ⬜ |
| AUT-06 | **Cerrar sesión** | Vuelve a login; `/panel` protegido de nuevo | ⬜ |
| AUT-07 | `/panel` tiene `X-Robots-Tag: noindex` | No indexable (verificar cabecera) | ⬜ |

## B2. Gestión de catálogo
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| BCT-01 | Listar promociones en `/panel/catalogo` | Lista todas (borradores + publicadas) con su estado | ⬜ |
| BCT-02 [crítico] | **Nueva promoción** (`/panel/catalogo/nueva`) | Crea borrador DRAFT y abre el editor | ⬜ |
| BCT-03 [crítico] | Editar campos y **autoguardado** | Los cambios se guardan solos (draftPayload); recargar no los pierde | ⬜ |
| BCT-04 [crítico] | **Publicar** la promoción | Pasa a publicada y aparece en la web pública | ⬜ |
| BCT-05 | **Despublicar / volver a borrador** | Desaparece de la web pública | ⬜ |
| BCT-06 | **Historial** (`/panel/catalogo/[id]/history`) | Muestra versiones anteriores; permite ver/revertir | ⬜ |
| BCT-07 | Validaciones (campos obligatorios, slug) | Impide publicar con datos inválidos, mensaje claro | ⬜ |

## B3. Bloques editoriales y media
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| BLK-01 | Añadir/editar **bloques editoriales** de una promoción | Se guardan y se ven en la ficha pública | ⬜ |
| BLK-02 | **Reordenar** bloques (drag & drop) | El orden se respeta en público | ⬜ |
| MED-01 [crítico] | **Subir imagen** a la galería (R2) | Sube sin error; aparece en la galería del panel | ⬜ |
| MED-02 [crítico] | La imagen subida **se ve en la web pública** | ⚠️ Ver INT-R2 (posible fallo por build-arg `R2_PUBLIC_URL`) | ⬜ |
| MED-03 | Marcar **portada** (cover) | La portada cambia en catálogo y ficha | ⬜ |
| MED-04 | **Reordenar** galería | Orden respetado en la ficha | ⬜ |
| MED-05 | **Borrar** una imagen | Desaparece; no rompe la ficha | ⬜ |
| MED-06 | Subir archivo **no imagen / muy grande** | Rechazo controlado con mensaje | ⬜ |

## B4. Leads
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| LED-01 [crítico] | Lista de leads (`/panel/leads`) | Muestra los leads con fecha, origen, estado | ⬜ |
| LED-02 | **Contador de no leídos** | Refleja los leads sin leer; se actualiza al abrirlos | ⬜ |
| LED-03 | **Detalle** de un lead (`/panel/leads/[id]`) | Muestra datos completos (nombre, email, teléfono, mensaje, inmueble) | ⬜ |
| LED-04 | Cambiar **estado** del lead | Se guarda y refleja en la lista | ⬜ |
| LED-05 [crítico] | Un lead creado desde la web (ENG-07/CON-01) **aparece aquí** | Trazabilidad web → backoffice completa | ⬜ |

## B5. Contenidos globales
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| GCT-01 | Editar contenido global (`/panel/contenidos/[pageKey]`) | Cambios visibles en la página pública correspondiente | ⬜ |
| GCT-02 | Editar **datos de contacto** (`/panel/contenidos/contacto`) | Se reflejan en `/contacto` y footer | ⬜ |
| GCT-03 | **Historial** de contenidos + revertir | Restaura una versión anterior correctamente | ⬜ |

## B6. Equipo, API keys y roles
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| TEA-01 [crítico] | `/panel/equipo` solo accesible por **ADMIN** | AGENT/OPERATOR no pueden entrar | ⬜ |
| TEA-02 | **Crear usuario** con rol | Se crea; puede iniciar sesión | ⬜ |
| TEA-03 | Desactivar usuario | Ya no puede entrar (ligar con AUT-04) | ⬜ |
| KEY-01 [crítico] | Crear **API key** en `/panel/api-keys` | Muestra la key una sola vez; queda registrada con prefijo | ⬜ |
| KEY-02 | Revocar una API key | Deja de funcionar en la API v1 | ⬜ |
| ROL-01 [crítico] | Login como **AGENT** y como **OPERATOR** | Cada rol solo ve/acciona lo permitido; sin accesos indebidos | ⬜ |

## B7. RGPD / ARSOP
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| ARS-01 [crítico] | `/panel/arsop`: gestionar una **solicitud de derechos** (acceso/rectificación/supresión/oposición) | Flujo completo; queda registro de auditoría | ⬜ |
| ARS-02 | **Supresión** de un lead | El lead se borra pero el registro de auditoría ARSOP sobrevive (FK SET NULL) | ⬜ |
| ARS-03 | **Registros de consentimiento** | Consultables; coherentes con lo aceptado en el banner (CHR-02) | ⬜ |

---

# C. INTEGRACIONES Y OBSERVABILIDAD

## C1. R2 (almacenamiento de imágenes)
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| INT-R2-01 [crítico] | Subir imagen (MED-01) y comprobar el objeto en **Cloudflare → R2 → `domio-prod`** | El fichero aparece en el bucket | ⬜ |
| INT-R2-02 [crítico] | La imagen se sirve desde `cdn.wedomio.com` y **se ve** en la web | ⚠️ Si no se ve: falta `R2_PUBLIC_URL` como build-arg → **Fix Parte 4 del PLAN-MANANA** | ⬜ |
| INT-R2-03 | Bucket **dev** (`domio-dev`) separado del de prod | No se mezclan imágenes entre entornos | ⬜ |

## C2. Resend (email transaccional) — dominio ya verificado ✅
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| INT-EM-01 [crítico] | Tras ENG-07/CON-01, el **worker** procesa la cola | `docker logs domio-prod-worker-1` muestra el envío | ⬜ |
| INT-EM-02 [crítico] | La tabla `email_queue` marca el email como `sent` | `select status,count(*) from email_queue group by status` → sin `failed` | ⬜ |
| INT-EM-03 [crítico] | **El email llega** a la bandeja de destino | Recibido, remitente `@wedomio.com`, no en spam (SPF/DKIM OK) | ⬜ |
| INT-EM-04 | Reintentos: forzar un fallo temporal | El worker reintenta según la lógica de la cola | ⬜ |

## C3. Sentry (observabilidad de errores) — foco del TFM
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| INT-SEN-01 [crítico] | **Forzar un error de servidor** (p. ej. una petición malformada a un endpoint, o añadir temporalmente una ruta `/api/debug-error` que lance) | Aparece en el dashboard de Sentry del proyecto **producción** en segundos | ⬜ |
| INT-SEN-02 | **Error de cliente** (romper algo en el navegador) | Sentry lo captura con stack y contexto | ⬜ |
| INT-SEN-03 | El evento incluye **entorno** (`production`/`development`) y no mezcla | Filtrable por entorno en Sentry | ⬜ |
| INT-SEN-04 | **Release / versión** asociada al evento | El evento muestra la versión desplegada | ⬜ |
| INT-SEN-05 | **Alerta**: configurar y provocar una alerta por email/Slack | Llega la notificación | ⬜ |
| INT-SEN-06 | **Scrubbing de PII**: un error que roce datos de un lead | No se filtran datos personales al evento (verificar `beforeSend`) | ⬜ |
| INT-SEN-07 | Quitar la ruta de prueba antes de la entrega | No queda código de debug en producción | ⬜ |

> Sugerencia para INT-SEN-01: crea en una rama una ruta temporal
> `app/api/debug-error/route.ts` con `export function GET(){ throw new Error("sentry-test") }`,
> despliega a **dev**, provócalo, confírmalo en Sentry, y **elimínalo** antes de main.

## C4. Rate limiting (Upstash)
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| INT-RL-01 [crítico] | Bucle de peticiones a `/api/v1/promociones` sin/con key hasta superar el límite | Devuelve **429** al exceder | ⬜ |
| INT-RL-02 [crítico] | Login: varios intentos fallidos (ligar AUT-05) | Bloqueo por IP | ⬜ |
| INT-RL-03 | Confirmar que **NO** es no-op | Con `RATE_LIMIT_STORE_URL` presente, el 429 aparece de verdad | ⬜ |

## C5. Turnstile (anti-bot)
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| INT-TS-01 [crítico] | El widget aparece en los formularios públicos | Visible y funcional | ⬜ |
| INT-TS-02 [crítico] | Envío con token válido | Aceptado | ⬜ |
| INT-TS-03 | Envío manipulado / sin token | Rechazado en servidor (ligar ENG-09) | ⬜ |

## C6. API pública v1
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| API-01 [crítico] | `GET /api/v1/promociones` **sin key** | 401/403 (no autorizado) | ⬜ |
| API-02 [crítico] | `GET /api/v1/promociones` **con key válida** | 200 + datos paginados | ⬜ |
| API-03 | Paginación (`cursor`/`limit`) | Consistente, sin duplicados | ⬜ |
| API-04 | `POST /api/v1/leads/institutional` | Crea lead institucional; valida payload | ⬜ |
| API-05 | Documentación OpenAPI (`/api/internal/docs`) | Refleja los endpoints reales (contrato) | ⬜ |
| API-06 | Rate limit por key (ligar INT-RL-01) | 429 al exceder | ⬜ |

---

# D. NO FUNCIONAL

## D1. SEO y metadatos
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| SEO-01 | `/sitemap.xml` | Lista home, portafolio y fichas; URLs con `wedomio.com` | ⬜ |
| SEO-02 | `/robots.txt` | Correcto; apunta al sitemap | ⬜ |
| SEO-03 | Meta title/description por página | Únicos y descriptivos | ⬜ |
| SEO-04 | **Open Graph** de una ficha (compartir en redes) | Imagen + título + descripción correctos | ⬜ |
| SEO-05 | Datos estructurados (JSON-LD breadcrumb) | Presentes y válidos | ⬜ |

## D2. Seguridad
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| SEC-01 [crítico] | Cabeceras (`curl -I https://wedomio.com`) | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | ⬜ |
| SEC-02 [crítico] | HTTPS válido + redirección HTTP→HTTPS | Certificado OK, sin avisos | ⬜ |
| SEC-03 | Puerto de Postgres | No accesible desde fuera (solo loopback/túnel) | ⬜ |
| SEC-04 | `/panel` y `/api/internal/*` | `noindex` y protegidos | ⬜ |
| SEC-05 | Cloudflare en **naranja** (proxied) | IP de origen oculta (`dig` → IPs de Cloudflare) | ⬜ |

## D3. Rendimiento y accesibilidad
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| PRF-01 | Lighthouse a home y ficha (móvil y escritorio) | Performance razonable; anota puntuaciones | ⬜ |
| PRF-02 | Tiempos de carga percibidos | Sin bloqueos largos; estados de carga visibles | ⬜ |
| A11Y-01 | Navegación por **teclado** (tab) en formularios y menús | Foco visible, orden lógico | ⬜ |
| A11Y-02 | Contraste y `alt` de imágenes | Cumple mínimos (jsx-a11y ya en el build) | ⬜ |
| A11Y-03 | Lectores de pantalla en formularios clave | Etiquetas y roles correctos | ⬜ |

## D4. Multi-tenant y aislamiento
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| TEN-01 [crítico] | La web pública solo muestra datos del **tenant público** | No se filtran datos de otros tenants | ⬜ |
| TEN-02 | Las consultas usan `SET LOCAL` (aislamiento por RLS) | (Verificado por las guardas de CI; comprobación conceptual) | ⬜ |

## D5. Paridad prod/dev y entorno
| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| ENV-01 [crítico] | `/api/health` en ambos | `env` correcto en cada uno (production/development) | ⬜ |
| ENV-02 | Repetir A2–A4 y ENG-07 en **dev** | Mismo comportamiento que prod | ⬜ |
| ENV-03 | **dev con noindex** | `dev.wedomio.com` no indexable (Fix Parte 4) | ⬜ |

---

# E. DESPLIEGUE AUTOMÁTICO (CI/CD) — verificación

> `main` ya está al día (merge hecho). Falta configurar secrets y probar el flujo.
> Detalle en [PLAN-MANANA.md](PLAN-MANANA.md) Parte 3.

| ID | Caso / pasos | Resultado esperado | Estado |
|----|--------------|--------------------|:------:|
| CD-01 [crítico] | Configurar Environments `production`/`development` en GitHub (secrets+vars) | Guardados | ⬜ |
| CD-02 [crítico] | `push` a **develop** | Actions: build+push imágenes `develop` + deploy a **dev**; `dev.wedomio.com` refleja el cambio | ⬜ |
| CD-03 [crítico] | `merge/push` a **main** | Actions: build+push `latest` + deploy a **prod** con backup→migrate→healthcheck | ⬜ |
| CD-04 | Provocar un deploy que falle el healthcheck | **Rollback** automático al tag anterior | ⬜ |
| CD-05 | Revisar logs/estado en Actions | Trazabilidad completa del despliegue | ⬜ |

---

# Registro de incidencias
Anota aquí cada ❌/⚠️ con: ID del caso, descripción, severidad, y acción/fix.

| Caso | Descripción | Severidad | Acción |
|------|-------------|-----------|--------|
| | | | |
