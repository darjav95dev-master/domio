import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UnreadBadge } from "./unread-badge";

describe("UnreadBadge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders skeleton on initial load", () => {
    render(<UnreadBadge />);

    // Skeleton renders with role="status" (hidden from a11y tree)
    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
  });

  it("renders nothing when count is 0", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0 }),
    });

    render(<UnreadBadge />);

    // Wait for the initial fetch to resolve
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders pill with count when count > 0", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 5 }),
    });

    render(<UnreadBadge />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Leads no leídos: 5"),
    ).toBeInTheDocument();
  });

  it("renders nothing on fetch error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<UnreadBadge />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("polls every 30 seconds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 3 }),
    });
    globalThis.fetch = fetchMock;

    render(<UnreadBadge />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    // Initial fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Advance 30s — second poll
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Advance another 30s — third poll
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("cleans up interval on unmount", () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 1 }),
    });
    globalThis.fetch = fetchMock;

    const { unmount } = render(<UnreadBadge />);
    unmount();

    // Advance 30s — fetch should NOT be called again
    act(() => vi.advanceTimersByTime(30_000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts pending fetch on unmount", async () => {
    const abortSpy = vi.fn();

    // Return a promise that never settles to simulate a hanging request
    globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
      const signal = options?.signal as AbortSignal | undefined;
      if (signal) {
        signal.addEventListener("abort", abortSpy);
      }
      return new Promise(() => {
        /* never resolves */
      });
    });

    const { unmount } = render(<UnreadBadge />);
    unmount();

    expect(abortSpy).toHaveBeenCalledTimes(1);
  });

  it("handles non-OK response gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<UnreadBadge />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("handles malformed JSON response gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    render(<UnreadBadge />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("handles NaN count response gracefully", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: "abc" }),
    });

    render(<UnreadBadge />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
