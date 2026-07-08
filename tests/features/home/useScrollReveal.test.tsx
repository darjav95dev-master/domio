import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useScrollReveal } from "@/features/home/hooks/useScrollReveal";

// Mock IntersectionObserver for jsdom
function createMockObserver() {
  return vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: "0px",
    thresholds: [0],
    takeRecords: () => [],
  }));
}

/**
 * Test component that uses the hook and has elements to reveal.
 */
function TestComponent() {
  const ref = useScrollReveal("[data-reveal]");
  return (
    <div ref={ref}>
      <div data-reveal data-testid="el-1">Element 1</div>
      <div data-reveal data-testid="el-2">Element 2</div>
    </div>
  );
}

describe("useScrollReveal", () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalIntersectionObserver: typeof window.IntersectionObserver;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalIntersectionObserver = window.IntersectionObserver;
    window.IntersectionObserver = createMockObserver() as unknown as typeof window.IntersectionObserver;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it("sets initial state to invisible (opacity: 0, translateY: 24px)", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    render(<TestComponent />);
    const el1 = screen.getByTestId("el-1");
    expect(el1.style.opacity).toBe("0");
    expect(el1.style.transform).toBe("translateY(24px)");
  });

  it("shows elements immediately when prefers-reduced-motion is active", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;

    render(<TestComponent />);
    const el1 = screen.getByTestId("el-1");
    // When reduced motion, opacity is set to "1" immediately
    expect(el1.style.opacity).toBe("1");
    expect(el1.style.transform).toBe("translateY(0)");
  });
});
