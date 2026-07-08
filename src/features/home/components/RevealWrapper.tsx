"use client";

import { type ReactNode } from "react";
import { useScrollReveal } from "@/features/home/hooks/useScrollReveal";

interface RevealWrapperProps {
  children: ReactNode;
  /** CSS selector for elements to reveal within this wrapper */
  selector?: string;
  /** Stagger delay in ms */
  stagger?: number;
}

/**
 * Client component wrapper that applies scroll-reveal to its children.
 * Each direct child should have data-reveal attribute (or custom selector).
 */
export function RevealWrapper({
  children,
  selector = "[data-reveal]",
  stagger = 80,
}: RevealWrapperProps) {
  const ref = useScrollReveal(selector, { stagger });

  return <div ref={ref}>{children}</div>;
}
