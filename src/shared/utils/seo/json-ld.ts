/**
 * Serializa datos JSON-LD para inyectarlos en un <script type="application/ld+json">
 * con dangerouslySetInnerHTML.
 *
 * `JSON.stringify` NO escapa `<`, por lo que un valor editable (p. ej. el nombre
 * de una promoción) que contenga `</script>` cerraría la etiqueta y permitiría
 * inyección de script (XSS almacenado). Escapamos `<` como `<` — sigue
 * siendo JSON válido y ya no puede romper la etiqueta.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
