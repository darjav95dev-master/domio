/**
 * Constantes de configuración del dominio.
 * Límites de paginación, longitudes máximas de campos y tamaños de thumbnail.
 */

/** Paginación por defecto en listados. */
export const DEFAULT_PAGE_SIZE = 20;

/** Límite máximo de items por página. */
export const MAX_PAGE_SIZE = 100;

/** Longitud máxima del nombre de una promoción. */
export const PROMOCION_NAME_MAX_LENGTH = 200;

/** Longitud máxima del mensaje de un lead. */
export const LEAD_MESSAGE_MAX_LENGTH = 2000;

/** Longitud máxima del nombre de un lead. */
export const LEAD_NAME_MAX_LENGTH = 100;

/** Longitud máxima del email de un lead (estándar RFC 5321). */
export const LEAD_EMAIL_MAX_LENGTH = 254;

/** Longitud máxima del SEO title (estándar Google: ~60 caracteres). */
export const SEO_TITLE_MAX_LENGTH = 60;

/** Longitud máxima del SEO description (estándar Google: ~160 caracteres). */
export const SEO_DESCRIPTION_MAX_LENGTH = 160;

/** Ancho por defecto de thumbnails en px. */
export const THUMBNAIL_WIDTH = 400;

/** Alto por defecto de thumbnails en px. */
export const THUMBNAIL_HEIGHT = 300;
