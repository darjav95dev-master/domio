import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/shared/components/skeleton";

describe("Skeleton (T008)", () => {
  it("carries role status and aria-hidden true", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const skeleton = container.firstChild;

    expect(skeleton).toHaveAttribute("role", "status");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
  });

  it("includes shimmer animation class", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const skeleton = container.firstChild as HTMLElement;

    expect(skeleton.className).toContain("animate-shimmer");
  });

  it("rests on a static sunken background", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const skeleton = container.firstChild as HTMLElement;

    expect(skeleton.className).toContain("bg-surface-sunken");
  });
});
