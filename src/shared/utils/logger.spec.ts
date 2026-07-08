import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs info messages via console.info", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("hello");
    expect(spy).toHaveBeenCalledWith("[Domio]", "INFO", "hello");
  });

  it("logs warn messages via console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("something degraded", { key: "value" });
    expect(spy).toHaveBeenCalledWith("[Domio]", "WARN", "something degraded", { key: "value" });
  });

  it("logs error messages via console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("boom", new Error("fail"));
    expect(spy).toHaveBeenCalledWith("[Domio]", "ERROR", "boom", new Error("fail"));
  });

  it("handles no extra args gracefully", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("just a message");
    expect(spy).toHaveBeenCalledWith("[Domio]", "WARN", "just a message");
  });
});
