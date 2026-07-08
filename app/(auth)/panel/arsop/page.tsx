import { redirect } from "next/navigation";
import { getServerSession } from "@/infrastructure/auth/session";

/**
 * ARSOP — placeholder page.
 *
 * Server component with defence-in-depth auth guard.
 * Will be replaced by the real ARSOP feature.
 */
export default async function ArsopPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/panel/login");
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-fg-default">
        ARSOP
      </h1>
      <p className="font-sans text-base text-fg-muted">
        Esta sección será implementada en una feature futura.
      </p>
    </div>
  );
}
