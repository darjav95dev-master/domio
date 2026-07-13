/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareButton } from "./ShareButton";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockShare = vi.fn();
const mockClipboardWrite = vi.fn();

beforeEach(() => {
  // Mock Web Share API
  Object.defineProperty(navigator, "share", {
    value: mockShare,
    writable: true,
    configurable: true,
  });

  // Mock clipboard API
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mockClipboardWrite },
    writable: true,
    configurable: true,
  });

  mockShare.mockReset();
  mockClipboardWrite.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ShareButton", () => {
  it("renders the share button", () => {
    render(<ShareButton url="https://wedomio.com/test" />);

    expect(
      screen.getByRole("button", { name: /compartir enlace/i }),
    ).toBeInTheDocument();
  });

  it("uses Web Share API when available", async () => {
    mockShare.mockResolvedValueOnce(undefined);

    render(<ShareButton url="https://wedomio.com/test" />);

    fireEvent.click(
      screen.getByRole("button", { name: /compartir enlace/i }),
    );

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: "Domio",
        text: "Domio",
        url: "https://wedomio.com/test",
      });
    });
  });

  it("falls back to clipboard when Web Share API is unavailable", async () => {
    // Remove navigator.share
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    mockClipboardWrite.mockResolvedValueOnce(undefined);

    render(<ShareButton url="https://wedomio.com/test" />);

    fireEvent.click(
      screen.getByRole("button", { name: /compartir enlace/i }),
    );

    await waitFor(() => {
      expect(mockClipboardWrite).toHaveBeenCalledWith(
        "https://wedomio.com/test",
      );
    });
  });

  it("falls back to clipboard when Web Share API rejects", async () => {
    mockShare.mockRejectedValueOnce(new Error("AbortError"));
    mockClipboardWrite.mockResolvedValueOnce(undefined);

    render(<ShareButton url="https://wedomio.com/test" />);

    fireEvent.click(
      screen.getByRole("button", { name: /compartir enlace/i }),
    );

    await waitFor(() => {
      expect(mockClipboardWrite).toHaveBeenCalledWith(
        "https://wedomio.com/test",
      );
    });
  });

  it("shows 'Enlace copiado' feedback after clipboard copy", async () => {
    // Remove Web Share API so clipboard fallback is used
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    mockClipboardWrite.mockResolvedValueOnce(undefined);

    render(<ShareButton url="https://wedomio.com/test" />);

    fireEvent.click(
      screen.getByRole("button", { name: /compartir enlace/i }),
    );

    await waitFor(() => {
      expect(
        screen.getAllByText("Enlace copiado").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("has aria-live region for clipboard feedback", async () => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    mockClipboardWrite.mockResolvedValueOnce(undefined);

    render(<ShareButton url="https://wedomio.com/test" />);

    fireEvent.click(
      screen.getByRole("button", { name: /compartir enlace/i }),
    );

    await waitFor(() => {
      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
    });
  });
});
