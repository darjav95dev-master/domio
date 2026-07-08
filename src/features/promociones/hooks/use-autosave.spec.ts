import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutosave } from "./use-autosave";

describe("useAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const formState = { name: "Test", kind: "portfolio", status: "DRAFT" };
  const promocionId = "promo-123";

  /** Helper: advances timers and flushes all pending microtasks inside act. */
  async function tick(ms: number) {
    await act(async () => {
      // Advance timers synchronously + flush microtasks
      vi.advanceTimersByTime(ms);
      // Allow async continuations (fetch then/catch/finally) to process
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("should call PATCH /api/internal/promociones/[id]/draft after interval", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ draftPayload: formState, updatedAt: new Date().toISOString() }),
    });

    renderHook(() => useAutosave(formState, promocionId, 1000));

    await tick(1000);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/internal/promociones/${promocionId}/draft`,
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      }),
    );
  });

  it("should set isSaving to true during the request", async () => {
    let resolveFetch!: (value: unknown) => void;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useAutosave(formState, promocionId, 1000),
    );

    await tick(1000);

    // The save function started synchronously and set isSaving
    expect(result.current.isSaving).toBe(true);

    // Resolve the pending fetch
    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ draftPayload: formState, updatedAt: new Date().toISOString() }),
      });
      // Flush microtasks
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isSaving).toBe(false);
  });

  it("should skip save if previous request is still in-flight", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise(() => {}), // never resolves
    );

    renderHook(() => useAutosave(formState, promocionId, 1000));

    // First tick triggers one call
    await tick(1000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Second tick — still in-flight
    await tick(1000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should skip save if form data hasn't changed", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ draftPayload: formState, updatedAt: new Date().toISOString() }),
    });

    const { rerender } = renderHook(
      ({ state }) => useAutosave(state, promocionId, 1000),
      { initialProps: { state: formState } },
    );

    // First tick triggers save
    await tick(1000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Re-render with same form state
    rerender({ state: formState });

    // Second tick should NOT trigger (same data)
    await tick(1000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should save again when form data changes after a save", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ draftPayload: formState, updatedAt: new Date().toISOString() }),
    });

    const { rerender } = renderHook(
      ({ state }) => useAutosave(state, promocionId, 1000),
      { initialProps: { state: formState } },
    );

    // First tick saves
    await tick(1000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Change form state
    const changedState = { ...formState, name: "Updated Name" };
    rerender({ state: changedState });

    // Let previous save complete fully
    await tick(0);

    // Second tick should save (dirty)
    await tick(1000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    // Verify it sent the new data
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const secondCallArgs = fetchMock.mock.calls[1];
    expect(secondCallArgs).toBeDefined();
    const secondCallBody = JSON.parse(secondCallArgs![1].body as string);
    expect(secondCallBody.name).toBe("Updated Name");
  });

  it("should update lastSavedAt on successful save", async () => {
    const savedAt = new Date("2026-07-08T12:00:00Z").toISOString();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ draftPayload: formState, updatedAt: savedAt }),
    });

    const { result } = renderHook(() =>
      useAutosave(formState, promocionId, 1000),
    );

    await tick(1000);

    expect(result.current.lastSavedAt).toBe(savedAt);
  });

  it("should set error on failed fetch", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() =>
      useAutosave(formState, promocionId, 1000),
    );

    await tick(1000);

    expect(result.current.error).toBe("Network error");
    expect(result.current.isSaving).toBe(false);
  });

  it("should set error on non-ok response", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    const { result } = renderHook(() =>
      useAutosave(formState, promocionId, 1000),
    );

    await tick(1000);

    expect(result.current.error).toBe("Error al guardar el borrador");
  });

  it("should use default interval of 30000ms", async () => {
    renderHook(() => useAutosave(formState, promocionId));

    // Should not have fired at 1000ms
    await tick(1000);
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // Should fire after 30000ms total
    await tick(29000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
