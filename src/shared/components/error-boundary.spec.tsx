import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { type ReactNode } from "react";
import { ErrorBoundary } from "./error-boundary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Bomb({ message = "💣" }: { message?: string }): never {
  throw new Error(message);
}

function SafeContent({ label = "safe-content" }: { label?: string }) {
  return <div data-testid={label}>Content</div>;
}

/**
 * A component that can be toggled between throwing and safe rendering.
 * Useful for testing the reset flow.
 */
function ToggleBomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Toggle 💣");
  return <div data-testid="safe-after-reset">Safe after reset</div>;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ErrorBoundary", () => {
  describe("render normal children", () => {
    it("renders children without error", () => {
      render(
        <ErrorBoundary>
          <SafeContent />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId("safe-content")).toBeInTheDocument();
    });

    it("renders complex children tree", () => {
      render(
        <ErrorBoundary>
          <div>
            <h1>Title</h1>
            <p>Body text</p>
          </div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Title")).toBeInTheDocument();
      expect(screen.getByText("Body text")).toBeInTheDocument();
    });
  });

  describe("error catching and default fallback", () => {
    it("renders default fallback when a child throws", () => {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("default fallback has aria-live polite", () => {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );

      expect(screen.getByRole("alert")).toHaveAttribute(
        "aria-live",
        "polite",
      );
    });

    it("default fallback shows error message copy", () => {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );

      expect(
        screen.getByText("Algo salió mal al cargar esta página"),
      ).toBeInTheDocument();
    });

    it("default fallback has a Reintentar button", () => {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );

      expect(
        screen.getByRole("button", { name: /reintentar/i }),
      ).toBeInTheDocument();
    });

    it("Reintentar button is focusable (focus-visible a11y)", () => {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );

      const btn = screen.getByRole("button", { name: /reintentar/i });
      btn.focus();
      expect(btn).toHaveFocus();
    });
  });

  describe("custom fallback", () => {
    it("renders custom fallback ReactNode", () => {
      render(
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom</div>}>
          <Bomb />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();
    });

    it("calls fallback render function with error and reset", () => {
      const fallbackFn = vi.fn(
        (error: Error, reset: () => void) => (
          <div>
            <span data-testid="error-msg">{error.message}</span>
            <button data-testid="reset-btn" onClick={reset}>
              Custom Retry
            </button>
          </div>
        ),
      );

      render(
        <ErrorBoundary fallback={fallbackFn}>
          <Bomb message="💣 custom error" />
        </ErrorBoundary>,
      );

      expect(screen.getByTestId("error-msg")).toHaveTextContent("💣 custom error");
      expect(screen.getByTestId("reset-btn")).toBeInTheDocument();
    });
  });

  describe("onError callback", () => {
    it("calls onError when a child throws", () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <Bomb message="capture-me" />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "capture-me" }),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });

    it("calls onError even when custom fallback is provided", () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary
          fallback={<div>Custom</div>}
          onError={onError}
        >
          <Bomb message="also-capture-me" />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "also-capture-me" }),
        expect.any(Object),
      );
    });

    it("does not throw if onError is not provided", () => {
      expect(() => {
        render(
          <ErrorBoundary>
            <Bomb />
          </ErrorBoundary>,
        );
      }).not.toThrow();
    });
  });

  describe("reset functionality", () => {
    it("resets error state when Reintentar is clicked and error is fixed", () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ToggleBomb shouldThrow={true} />
        </ErrorBoundary>,
      );

      // After error, fallback is shown
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(
        screen.queryByTestId("safe-after-reset"),
      ).not.toBeInTheDocument();

      // Re-render with non-throwing children to simulate fixed error
      rerender(
        <ErrorBoundary>
          <ToggleBomb shouldThrow={false} />
        </ErrorBoundary>,
      );

      // ErrorBoundary instance is preserved, still in error state
      expect(screen.getByRole("alert")).toBeInTheDocument();

      // Click Reintentar to reset
      fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

      // After reset, children should render
      expect(screen.getByTestId("safe-after-reset")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("catches error again if child still throws after reset", () => {
      render(
        <ErrorBoundary>
          <ToggleBomb shouldThrow={true} />
        </ErrorBoundary>,
      );

      // Fallback is shown
      expect(screen.getByRole("alert")).toBeInTheDocument();

      // Click Reintentar — Bomb still throws, fallback shown again
      fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));

      // Fallback should still be visible (error caught again)
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles null children gracefully", () => {
      expect(() => {
        render(
          <ErrorBoundary>{null}</ErrorBoundary>,
        );
      }).not.toThrow();
    });

    it("handles undefined children gracefully", () => {
      expect(() => {
        render(<ErrorBoundary>{undefined as unknown as ReactNode}</ErrorBoundary>);
      }).not.toThrow();
    });

    it("renders error message text correctly", () => {
      render(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>,
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/algo salió mal/i);
      expect(alert).toHaveTextContent(/reintentar/i);
    });

    it("does not render fallback when there is no error", () => {
      render(
        <ErrorBoundary>
          <SafeContent />
        </ErrorBoundary>,
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
