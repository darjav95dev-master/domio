import { MediaImage } from "@/shared/components/media-image";
import { getPublicMediaUrl } from "@/infrastructure/media/public-url";
import type { PromocionDetail } from "@/infrastructure/db/repositories/promocion.repository";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetailGalleryProps {
  promocion: PromocionDetail;
}

interface GalleryImage {
  r2Key: string;
  altText: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Gallery images in order, up to 6 for the mosaic. */
function getGalleryImages(promocion: PromocionDetail): GalleryImage[] {
  return promocion.mediaAssets
    .filter((a) => a.kind === "IMAGE_GALLERY")
    .slice(0, 6)
    .map((a) => ({ r2Key: a.r2Key, altText: a.altText }));
}

function Tile({
  image,
  className,
}: {
  image: GalleryImage;
  className: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[14px] bg-bg-inverted ${className}`}>
      <MediaImage
        alt={image.altText}
        src={getPublicMediaUrl(image.r2Key)}
        fill
        sizes="(max-width: 768px) 100vw, 40vw"
        className="object-cover"
      />
      {image.altText && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(20,12,8,0.82),transparent)] px-5 pb-[18px] pt-10">
          <div className="font-display text-[16px] font-normal leading-[1.25] text-white">
            {image.altText}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DetailGallery — the "Cómo será tu hogar" mosaic from the reference: a tall
 * lead image beside two stacked tiles, then a three-up row. Degrades
 * gracefully when fewer than 6 gallery images exist; the page renders this
 * section only when the promotion has gallery images.
 */
export function DetailGallery({ promocion }: DetailGalleryProps) {
  const images = getGalleryImages(promocion);
  const [lead, ...rest] = images;
  if (!lead) return null;
  const topRight = rest.slice(0, 2);
  const bottomRow = rest.slice(2, 5);

  return (
    <section aria-label="Galería del inmueble">
      {/* Top mosaic: tall lead + up to two stacked tiles */}
      <div className="mb-[14px] grid grid-cols-1 gap-[14px] md:grid-cols-[1.4fr_1fr]">
        <Tile image={lead} className="h-[280px] md:h-[380px]" />
        {topRight.length > 0 && (
          <div className="grid grid-cols-2 gap-[14px] md:grid-cols-1">
            {topRight.map((img, i) => (
              <Tile key={i} image={img} className="h-[160px] md:h-[183px]" />
            ))}
          </div>
        )}
      </div>

      {/* Bottom three-up row */}
      {bottomRow.length > 0 && (
        <div className="grid grid-cols-2 gap-[14px] md:grid-cols-3">
          {bottomRow.map((img, i) => (
            <Tile key={i} image={img} className="h-[180px] md:h-[220px]" />
          ))}
        </div>
      )}

      <p className="mt-5 text-center text-[11px] italic text-fg-subtle">
        Imágenes orientativas del proyecto. Acabados sujetos a la memoria de
        calidades final.
      </p>
    </section>
  );
}
