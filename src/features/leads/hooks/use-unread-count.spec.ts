import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useUnreadCount } from "./use-unread-count";

describe("useUnreadCount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns null on initial render (before first fetch)", () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useUnreadCount());
    expect(result.current).toBeNull();
  });

  it("returns count after successful fetch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 4 }),
    });

    const { result } = renderHook(() => useUnreadCount());
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current).toBe(4);
  });

  it("stays null on non-OK response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useUnreadCount());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current).toBeNull();
  });

  it("stays null on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useUnreadCount());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current).toBeNull();
  });

  it("polls at the given interval", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 1 }),
    });
    globalThis.fetch = fetchMock;

    renderHook(() => useUnreadCount(5_000));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("re-fetches immediately when 'lead:read' event is dispatched", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 3 }),
    });
    globalThis.fetch = fetchMock;

    renderHook(() => useUnreadCount(30_000));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Dispatch the event — should trigger an immediate extra fetch
    await act(async () => {
      window.dispatchEvent(new CustomEvent("lead:read"));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("updates count when 'lead:read' event triggers a fetch with new value", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      const count = callCount === 1 ? 3 : 2; // first fetch: 3, after event: 2
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ count }),
      });
    });

    const { result } = renderHook(() => useUnreadCount(30_000));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current).toBe(3);

    await act(async () => {
      window.dispatchEvent(new CustomEvent("lead:read"));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current).toBe(2);
  });

  it("removes event listener and aborts fetch on unmount", async () => {
    const abortSpy = vi.fn();
    globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
      const signal = options?.signal as AbortSignal | undefined;
      signal?.addEventListener("abort", abortSpy);
      return new Promise(() => {});
    });

    const { unmount } = renderHook(() => useUnreadCount());
    unmount();

    expect(abortSpy).toHaveBeenCalledTimes(1);

    // After unmount, dispatching the event should not trigger fetch
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ count: 0 }) });
    globalThis.fetch = fetchMock;
    window.dispatchEvent(new CustomEvent("lead:read"));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores negative count values", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: -1 }),
    });

    const { result } = renderHook(() => useUnreadCount());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current).toBeNull();
  });
});
