import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";

/**
 * Catálogo — placeholder page.
 *
 * Server component with defence-in-depth auth guard (the layout already
 * protects /panel/*, but we verify the session here too per constitution §2).
 * Will be replaced by the real catalogo feature (F011).
 */
export default async function CatalogoPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/panel/login");
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-fg-default">
        Catálogo
      </h1>
      <p className="font-sans text-base text-fg-muted">
        Esta sección será implementada en una feature futura.
      </p>
    </div>
  );
}
