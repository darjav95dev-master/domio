"use client";

import { useState, type ComponentProps } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";

export interface MediaImageProps extends ComponentProps<typeof Image> {
  alt: string;
}

/**
 * Normalizes an image src so it does not crash next/image.
 *
 * next/image requires the src to be either:
 * - an absolute URL (https://... or http://...), or
 * - a relative URL starting with "/".
 *
 * If src is a non-empty string that is not absolute and does not
 * start with "/", we prepend "/" to make it a valid relative URL.
 */
function normalizeSrc(src: string): string {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("/") ||
    src.startsWith("data:")
  ) {
    return src;
  }
  return "/" + src;
}

export function MediaImage({
  alt,
  className,
  onError,
  src,
  ...props
}: MediaImageProps) {
  if (!alt) {
    throw new Error("MediaImage requires a non-empty alt prop");
  }

  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        data-testid="media-fallback"
        className={cn(
          "bg-[linear-gradient(135deg,var(--color-ink-2),var(--color-ink))]",
          className,
        )}
        role="img"
        aria-label={alt}
      />
    );
  }

  // Normalize src to avoid next/image parse errors on relative paths
  const normalizedSrc = typeof src === "string" ? normalizeSrc(src) : src;

  return (
    <Image
      alt={alt}
      className={className}
      src={normalizedSrc}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
      {...props}
    />
  );
}
