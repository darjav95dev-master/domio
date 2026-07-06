"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/shared/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "link";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseStyles =
  "inline-flex items-center justify-center font-sans text-base font-medium tracking-[-0.005em] transition-all duration-deliberate ease-standard";

const disabledStyles = "disabled:cursor-not-allowed disabled:opacity-50";
const pillShape = "rounded-pill";

const primaryIdleShadow =
  "shadow-[inset_0_1px_0_var(--border-on-ink),0_1px_2px_rgba(var(--shadow-tint),0.10),0_8px_24px_rgba(var(--shadow-tint),0.20)]";
const primaryHoverShadow =
  "shadow-[0_0_0_1px_var(--accent-subtle),0_12px_32px_var(--accent-glow)]";

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    pillShape,
    "px-[30px] py-4 text-fg-on-inverted",
    "bg-gradient-to-b from-ink-soft to-fg-default",
    primaryIdleShadow,
    `hover:-translate-y-px hover:bg-gradient-to-b hover:from-terracota hover:to-terracota-deep hover:${primaryHoverShadow}`,
    "active:translate-y-0",
    `${disabledStyles} disabled:hover:translate-y-0 disabled:hover:from-ink-soft disabled:hover:to-fg-default disabled:hover:${primaryIdleShadow}`,
  ),
  secondary: cn(
    pillShape,
    "border-[1.5px] border-fg-default bg-transparent px-[26.5px] py-[13.5px] text-fg-default",
    "hover:bg-fg-default hover:text-bg-canvas",
    disabledStyles,
  ),
  ghost: cn(
    pillShape,
    "border-[1.5px] border-white/40 bg-white/[0.12] px-[26.5px] py-[13.5px] text-white backdrop-blur-[8px]",
    "hover:bg-white/[0.22]",
    disabledStyles,
  ),
  link: cn(
    "inline underline underline-offset-4 text-fg-default",
    "hover:text-accent-default",
    disabledStyles,
  ),
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", className, children, disabled = false, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";
