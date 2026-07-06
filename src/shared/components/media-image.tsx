"use client";

import { useState, type ComponentProps } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";

export interface MediaImageProps extends ComponentProps<typeof Image> {
  alt: string;
}

export function MediaImage({
  alt,
  className,
  onError,
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

  return (
    <Image
      alt={alt}
      className={className}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
      {...props}
    />
  );
}
