/**
 * Rate limiting constants.
 *
 * Centralised configuration for all rate limit thresholds.
 * No magic numbers in the code — always reference these constants.
 *
 * @see specs/008-rate-limiting-and-observability/data-model.md
 */

/**
 * Default rate limit (requests per minute) for API keys that have
 * `rate_limit_per_min` set to NULL in the database.
 */
export const DEFAULT_API_LIMIT_PER_MIN = 60;

/**
 * Guarda anti-abuso por IP en la API pública v1, ANTES de autenticar la clave.
 * Solo frena floods de peticiones no autenticadas (fuerza bruta de claves /
 * DoS sobre el bcrypt de verificación). Se fija muy por encima del límite por
 * clave (2×) para no penalizar nunca a un consumidor legítimo, y NO aplica
 * lockout: al pasar la ventana el contador se reinicia solo.
 */
export const PUBLIC_API_IP_MAX_PER_MIN = 120;

/**
 * Maximum number of failed login attempts per IP within the login window.
 * On exceed, the IP is locked out (brute-force protection).
 */
export const LOGIN_MAX_ATTEMPTS = 5;

/**
 * Maximum number of SUCCESSFUL logins per IP within the login window.
 * Abuse ceiling: legitimate use (including switching between accounts) stays
 * well under it; only real hammering of the endpoint gets cut off.
 */
export const LOGIN_SUCCESS_MAX_ATTEMPTS = 30;

/**
 * Duration (minutes) of the sliding window for login attempts.
 */
export const LOGIN_WINDOW_MINUTES = 15;

/**
 * Maximum number of contact form submissions per IP within the contact window.
 */
export const CONTACT_MAX_ATTEMPTS = 3;

/**
 * Duration (minutes) of the sliding window for contact form submissions.
 */
export const CONTACT_WINDOW_MINUTES = 10;

/**
 * Duration (minutes) of the temporary lockout after exceeding the limit.
 */
export const LOCKOUT_MINUTES = 15;
