/**
 * Rate limiter types.
 *
 * @see specs/008-rate-limiting-and-observability/contracts/rate-limiting-and-observability.md#C-1
 */

export interface RateLimitConfig {
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly resetAt: Date;
}

export interface RateLimiter {
  /**
   * Verifica si una request está permitida bajo el límite configurado.
   * Si el almacén no responde, retorna { allowed: true } (degradación graceful).
   */
  check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Incrementa el contador para el identificador dado.
   * Se llama solo si check() retornó allowed: true.
   * Retorna el resultado actualizado.
   */
  increment(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Verifica e incrementa en una sola operación atómica.
   * Es el método principal que usan los consumidores.
   */
  consume(identifier: string, config: RateLimitConfig): Promise<RateLimitResult>;
}
