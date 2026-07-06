/* eslint-disable @next/next/no-img-element */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MediaImage } from "@/shared/components/media-image";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { alt, fill, priority, ...rest } = props;
    return <img alt={alt} {...rest} data-testid="next-image" />;
  },
}));

describe("MediaImage (T010)", () => {
  it("throws when alt is missing", () => {
    expect(() => {
      render(<MediaImage src="/photo.jpg" width={400} height={300} />);
    }).toThrow("alt");
  });

  it("renders image with alt and switches to fallback gradient on error", () => {
    render(
      <MediaImage
        src="/photo.jpg"
        alt="Vivienda en Santa Cruz"
        width={400}
        height={300}
      />,
    );

    const image = screen.getByTestId("next-image");
    expect(image).toHaveAttribute("alt", "Vivienda en Santa Cruz");

    fireEvent.error(image);

    expect(screen.getByTestId("media-fallback")).toBeInTheDocument();
  });
});
