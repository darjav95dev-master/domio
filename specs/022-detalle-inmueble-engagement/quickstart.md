# Quickstart Validation: detalle-inmueble-engagement

## Prerrequisitos

- Base de datos con seed data: `pnpm db:seed`
- Servidor de desarrollo: `pnpm dev`
- Feature 021 mergeada (ficha de detalle funcional)

## Escenarios de validación

### 1. Formulario con consentimiento

1. Navegar a `/inmuebles/[slug]` (promoción PUBLISHED).
2. Completar formulario: nombre, email, teléfono, mensaje.
3. Marcar checkbox de consentimiento.
4. Enviar.
5. **Esperado**: mensaje "Solicitud recibida. Nuestro equipo te contactará en 24-48h."
6. Verificar en backoffice → Leads: lead creado con source='commercial', channel='FORM'.
7. Verificar en BD: consent_records tiene registro, email_queue tiene 2 emails (confirmación + notificación agente).

### 2. Formulario sin consentimiento

1. Completar formulario sin marcar consentimiento.
2. Intentar enviar.
3. **Esperado**: error visible "Debe aceptar la política de privacidad". Nada persistido.

### 3. Rate limiting

1. Enviar formulario 6 veces seguidas desde la misma IP.
2. **Esperado**: sexto envío retorna 429 "Demasiados intentos".

### 4. WhatsApp

1. Hacer clic en botón WhatsApp.
2. **Esperado**: abre `https://wa.me/{number}?text={mensaje}` con datos de contact_config.
3. Si previamente se dio consentimiento (formulario enviado), verificar que se genera lead con channel='WHATSAPP'.

### 5. Compartir

1. Hacer clic en botón compartir.
2. **Esperado**: URL copiada al portapapeles con feedback visual "Enlace copiado".
3. Verificar OG tags en `<head>`: og:title, og:description, og:image.

### 6. Inmuebles relacionados

1. Cargar ficha de promoción PUBLISHED.
2. Scroll al pie.
3. **Esperado**: hasta 4 PropertyCards de misma zona, tipo y precio ±20%.
4. Si no hay relacionados, sección no aparece o muestra "No hay inmuebles similares".

### 7. Accesibilidad

1. Ejecutar Lighthouse en `/inmuebles/[slug]`.
2. **Esperado**: Accessibility ≥90.
3. Verificar: labels asociados en formulario, aria-live en feedback de envío, focus-visible en todos los interactivos.
