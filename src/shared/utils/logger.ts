/**
 * Logger estructurado mínimo.
 *
 * Reemplaza console.log/warn/error directo en código de producción.
 * Los niveles son: info, warn, error.
 * Cada mensaje se antepone con "[Domio]" y el nivel para facilitar
 * el filtrado en logs agregados.
 */
function getLogFn(level: "INFO" | "WARN" | "ERROR"): (...data: unknown[]) => void {
  if (level === "ERROR") return console.error;
  if (level === "WARN") return console.warn;
  return console.info;
}

function log(level: "INFO" | "WARN" | "ERROR", message: string, ...args: unknown[]): void {
  const fn = getLogFn(level);
  fn("[Domio]", level, message, ...args);
}

export const logger = {
  info(message: string, ...args: unknown[]): void {
    log("INFO", message, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    log("WARN", message, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    log("ERROR", message, ...args);
  },
};
