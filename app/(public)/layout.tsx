import { SkipToContent } from "@/shared/components/skip-to-content";
import { Nav } from "@/shared/components/nav";
import { Footer } from "@/shared/components/footer";

/**
 * PublicLayout — shared chrome for all public-facing pages.
 *
 * Renders:
 * 1. SkipToContent (accessible skip-link, tab-visible only)
 * 2. Nav (fixed, over-hero/glass transition on scroll)
 * 3. <main id="main-content"> wrapping page children
 * 4. Footer (slate 4-column)
 *
 * No business logic. No tenant context.
 * The root layout (app/layout.tsx) provides <html>, fonts, and body.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkipToContent />
      <Nav />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}
