/**
 * Islas Canarias.
 * Conjunto cerrado de islas donde opera Domio.
 */
export const ISLANDS = [
  "Tenerife",
  "Gran Canaria",
  "Lanzarote",
  "Fuerteventura",
  "La Palma",
  "La Gomera",
  "El Hierro",
] as const;

export type Island = (typeof ISLANDS)[number];

/**
 * Municipios donde Domio tiene presencia actualmente.
 * Conjunto abierto: se amplía cuando se añadan nuevas zonas.
 */
export const MUNICIPALITIES = [
  "Las Palmas de Gran Canaria",
  "Telde",
  "Santa Lucía de Tirajana",
  "San Bartolomé de Tirajana",
  "Arucas",
  "Gáldar",
  "Ingenio",
  "Agüimes",
  "Mogán",
  "La Aldea de San Nicolás",
] as const;

export type Municipality = (typeof MUNICIPALITIES)[number];
