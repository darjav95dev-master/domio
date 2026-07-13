/**
 * Utilities para generación de CSV.
 *
 * - `escapeCsvField()`: escapa un valor individual según RFC 4180.
 * - `csvLine()`: genera una línea CSV (CRLF) concatenando campos escapados.
 */

/**
 * Escapa un valor para CSV: si contiene comas, comillas dobles o saltos de
 * línea, lo envuelve entre comillas dobles y escapa las comillas internas.
 */
export function escapeCsvField(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Genera una línea CSV (CRLF) a partir de los valores proporcionados.
 */
export function csvLine(...fields: unknown[]): string {
  return fields.map(escapeCsvField).join(",") + "\r\n";
}
