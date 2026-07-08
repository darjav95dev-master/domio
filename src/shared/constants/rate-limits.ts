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
 * Maximum number of failed login attempts per IP within the login window.
 */
export const LOGIN_MAX_ATTEMPTS = 5;

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
