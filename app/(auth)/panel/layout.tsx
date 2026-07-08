import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";
import { Sidebar } from "@/features/backoffice/components/sidebar";
import PanelHeader from "@/features/backoffice/components/panel-header";

/**
 * The entire backoffice panel is dynamic — it uses server sessions and redirects.
 * Prevent Next.js from attempting static generation during build.
 */
export const dynamic = "force-dynamic";

/**
 * Robots meta: noindex, nofollow for the entire backoffice.
 *
 * The middleware at `middleware.ts` already injects `X-Robots-Tag: noindex, nofollow`
 * on every `/panel/*` response. This `<meta name="robots">` tag provides defence-in-depth
 * for crawlers that ignore HTTP headers (e.g. some bots, cached pages).
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * PanelLayout — protected layout for the backoffice area.
 *
 * **Auth guard:** checks the server session; redirects to `/panel/login` if null.
 * **Structure:** sidebar (240px fixed on desktop, drawer on mobile) + main area.
 * **Header:** PanelHeader at the top of the content area with user name and logout.
 *
 * @see design.md §13.5
 */
export default async function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  // ── Auth guard ──────────────────────────────────────────────────────
  // The middleware already protects /panel/*, but we check here too
  // (defence-in-depth — constitution §2).
  if (!session) {
    redirect("/panel/login");
  }

  return (
    <div className="flex min-h-screen bg-bg-canvas">
      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <Sidebar role={session.role} />

      {/* Main content area — offset by 240px on desktop for the fixed sidebar */}
      <div className="flex flex-1 flex-col md:ml-[240px]">
        <PanelHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
