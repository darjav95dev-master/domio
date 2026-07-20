import type { RateLimiter } from "./rate-limiter.types";
import { createRateLimiter } from "./rate-limiter.factory";
import { getRedisClient } from "./redis-client";
import { logger } from "@/shared/utils/logger";
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_SUCCESS_MAX_ATTEMPTS,
  LOGIN_WINDOW_MINUTES,
  CONTACT_MAX_ATTEMPTS,
  CONTACT_WINDOW_MINUTES,
  LOCKOUT_MINUTES,
} from "../../shared/constants/rate-limits";

// ─── Types ──────────────────────────────────────────────────────────────────

// "login" counts FAILED attempts (brute-force lockout); "login_success" counts
// SUCCESSFUL logins (abuse ceiling); "contact" counts form submissions.
export type RateLimitScope = "login" | "login_success" | "contact";

export interface IpRateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly resetAt: Date;
  readonly lockedOut: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SCOPE_CONFIGS: Record<RateLimitScope, { limit: number; windowMs: number }> = {
  login: { limit: LOGIN_MAX_ATTEMPTS, windowMs: LOGIN_WINDOW_MINUTES * 60 * 1_000 },
  login_success: {
    limit: LOGIN_SUCCESS_MAX_ATTEMPTS,
    windowMs: LOGIN_WINDOW_MINUTES * 60 * 1_000,
  },
  contact: { limit: CONTACT_MAX_ATTEMPTS, windowMs: CONTACT_WINDOW_MINUTES * 60 * 1_000 },
};

const LOCKOUT_SECONDS = LOCKOUT_MINUTES * 60;

// ─── Key builders ────────────────────────────────────────────────────────────

function buildCounterIdentifier(ip: string, scope: RateLimitScope): string {
  return `ip:${scope}:${ip}`;
}

function buildLockoutKey(ip: string, scope: RateLimitScope): string {
  return `rl:lockout:${scope}:${ip}`;
}

// ─── Main API ────────────────────────────────────────────────────────────────

/**
 * Read-only lockout check for an IP + scope. Unlike {@link checkIpRateLimit} it
 * does NOT consume a token, so it can gate every attempt (e.g. each login) while
 * leaving the counter untouched for successful ones. Only failed attempts should
 * call {@link checkIpRateLimit} to consume.
 *
 * Degrades to `false` (allow) if Redis is unavailable or errors.
 */
export async function isIpLockedOut(
  ip: string,
  scope: RateLimitScope,
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    return (await redis.exists(buildLockoutKey(ip, scope))) === 1;
  } catch (error) {
    logger.warn(
      `Degraded lockout check for "${ip}" scope "${scope}":`,
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

/**
 * Checks rate limit for a given IP and scope (login or contact).
 *
 * 1. Checks if the IP is currently locked out (lockout key exists in Redis).
 * 2. If not locked out, consumes a rate limiter token.
 * 3. If the limit is exceeded, creates a lockout key with TTL.
 *
 * Degrades gracefully: if Redis is unavailable, the request is allowed.
 *
 * @param ip - Client IP address.
 * @param scope - Rate limit scope (`"login"` or `"contact"`).
 * @param rateLimiter - Optional rate limiter instance (for DI / testing).
 *                      Defaults to `createRateLimiter()`.
 */
export async function checkIpRateLimit(
  ip: string,
  scope: RateLimitScope,
  rateLimiter?: RateLimiter,
): Promise<IpRateLimitResult> {
  const limiter = rateLimiter ?? createRateLimiter();
  const config = SCOPE_CONFIGS[scope];
  const redis = getRedisClient();

  // Step 1: Check lockout
  if (redis) {
    try {
      const lockedOut = await redis.exists(buildLockoutKey(ip, scope));
      if (lockedOut) {
        return {
          allowed: false,
          remaining: 0,
          limit: config.limit,
          resetAt: new Date(Date.now() + LOCKOUT_SECONDS * 1_000),
          lockedOut: true,
        };
      }
    } catch (error) {
      logger.warn(
        `Degraded lockout check for "${ip}" scope "${scope}":`,
        error instanceof Error ? error.message : String(error),
      );
      // Degrade gracefully: allow request to proceed
    }
  }

  // Step 2: Consume a rate limiter token
  const result = await limiter.consume(buildCounterIdentifier(ip, scope), config);

  // Step 3: Set lockout key if limit was exceeded
  if (!result.allowed && redis) {
    try {
      await redis.set(buildLockoutKey(ip, scope), "1", { ex: LOCKOUT_SECONDS });
    } catch (error) {
      logger.warn(
        `Failed to set lockout for "${ip}" scope "${scope}":`,
        error instanceof Error ? error.message : String(error),
      );
      // Degrade gracefully: the rate limiter already denied this request
    }
  }

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    limit: result.limit,
    resetAt: result.resetAt,
    lockedOut: false,
  };
}
