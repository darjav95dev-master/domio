"use client";

import { useEffect, useRef, type RefObject } from "react";

interface UseScrollRevealOptions {
  /** Delay in ms between each element (default: 80) */
  stagger?: number;
  /** Root margin for IntersectionObserver (default: "0px 0px 15% 0px") */
  rootMargin?: string;
  /** Threshold for IntersectionObserver (default: 0) */
  threshold?: number;
}

/**
 * Scroll-reveal hook using IntersectionObserver.
 *
 * Returns a ref to attach to the parent container.
 * Elements matching the selector inside the container will be revealed
 * with a staggered delay as they enter the viewport.
 *
 * Respects `prefers-reduced-motion`: when active, elements become visible
 * immediately (no animation).
 *
 * @param selector - CSS selector for elements to reveal (default: "[data-reveal]")
 * @param options - Stagger delay, root margin, threshold
 * @returns A React ref to attach to a parent container element
 */
export function useScrollReveal(
  selector: string = "[data-reveal]",
  options: UseScrollRevealOptions = {},
): RefObject<HTMLDivElement | null> {
  const { stagger = 80, rootMargin = "0px 0px 15% 0px", threshold = 0 } = options;
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const container = ref.current;
    if (!container) return;

    const elements = container.querySelectorAll<HTMLElement>(selector);
    if (elements.length === 0) return;

    // If reduced motion, just make everything visible immediately
    if (prefersReducedMotion) {
      elements.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
      return;
    }

    // Set initial state
    elements.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)";
    });

    function onIntersect(entry: IntersectionObserverEntry, obs: IntersectionObserver) {
      if (!entry.isIntersecting) return;
      const el = entry.target as HTMLElement;
      const index = Array.from(elements).indexOf(el);
      const delay = index * stagger;

      setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, delay);

      obs.unobserve(el);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => onIntersect(entry, observer));
      },
      { rootMargin, threshold },
    );

    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [selector, stagger, rootMargin, threshold]);

  return ref;
}
