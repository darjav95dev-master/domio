

/**
 * Mapas de traducción para operaciones.
 */
const OPERATION_MAP: Record<string, string> = {
  SALE: "venta",
  RENT: "alquiler",
  SALE_AND_RENT: "venta-y-alquiler",
};

/**
 * Normaliza un texto eliminando acentos, caracteres especiales y
 * convirtiendo a lowercase. Los espacios se colapsan a un único guión.
 */
function normalize(text: string): string {
  return text
    .normalize("NFD")                   // descompone caracteres con acento
    .replace(/[\u0300-\u036f]/g, "")    // elimina diacríticos (acentos)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")          // elimina caracteres no alfanumericos, espacios o guiones
    .replace(/[\s-]+/g, "-")               // espacios y guiones múltiples → un solo guión
    .replace(/^-|-$/g, "");                // guión inicial o final
}

/**
 * Genera un slug determinista para una promoción inmobiliaria.
 *
 * Formato: `{tipo}-en-{operacion}-en-{municipio}-{n}hab-{idCorto}`
 *
 * @param propertyType - Tipo de propiedad (PROPERTY_TYPES)
 * @param operation - Tipo de operación (SALE | RENT | SALE_AND_RENT)
 * @param municipality - Municipio (puede llevar acentos, espacios, etc.)
 * @param bedrooms - Número de dormitorios (0 muestra "estudio")
 * @param shortId - Identificador corto (últimos 4 chars del UUID en hex)
 * @returns Slug normalizado
 */
export function generateSlug(
  propertyType: string,
  operation: string,
  municipality: string,
  bedrooms: number,
  shortId: string,
): string {
  const tipo = normalize(propertyType);
  const op = OPERATION_MAP[operation] ?? normalize(operation);
  const mun = normalize(municipality);
  const habs = bedrooms === 0 ? "estudio" : `${bedrooms}hab`;
  const id = shortId.replace(/[^a-z0-9]/gi, "").toLowerCase();

  return `${tipo}-en-${op}-en-${mun}-${habs}-${id}`;
}
