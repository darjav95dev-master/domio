import type { Metadata } from "next";
import { getCatalogData } from "@/features/catalog/server/get-catalog-data";
import { toCatalogItem } from "@/features/catalog/server/to-catalog-item";
import { FavoritesView } from "@/features/favorites/FavoritesView";
import { buildPageMetadata } from "@/features/seo/server/build-page-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await buildPageMetadata({
    title: "Favoritos | Domio",
    description: "Los inmuebles que has guardado en Domio.",
    path: "/favoritos",
  });
  // Favorites are per-browser and have no shareable server state.
  return { ...meta, robots: { index: false, follow: true } };
}

export default async function FavoritosPage() {
  // Favorites live in the browser; ship the full published catalog and let the
  // client filter it. Small catalog → one query beats a per-id endpoint.
  const data = await getCatalogData({ limit: 100, sort: "published" });
  const items = data.items.map(toCatalogItem);

  return (
    <div className="min-h-screen">
      <section className="bg-bg-canvas pb-10 pt-[120px]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 xl:px-14">
          <h1 className="font-display text-[clamp(36px,4.8vw,64px)] font-normal leading-[1.05] tracking-[-0.035em] text-fg-default">
            Favoritos
          </h1>
          <p className="mt-4 max-w-[52ch] font-sans text-[19px] leading-[1.6] text-fg-muted">
            Tu selección de inmuebles guardados. Se conservan en este navegador.
          </p>
        </div>
      </section>

      <section className="bg-bg-canvas pb-20">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 xl:px-14">
          <FavoritesView items={items} />
        </div>
      </section>
    </div>
  );
}
