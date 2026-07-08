import { ContactConfigFormSkeleton } from "@/features/contenidos/components/ContactConfigForm";

/**
 * Loading state for the contacto page.
 *
 * Renders header skeletons and the form skeleton while the server
 * component fetches session data and queries the repository.
 */
export default function ContactConfigLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-9 w-72 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
        <div className="h-4 w-36 animate-shimmer rounded bg-surface-sunken bg-[linear-gradient(90deg,var(--bg-surface-sunken)_25%,var(--bg-canvas)_50%,var(--bg-surface-sunken)_75%)] bg-[length:200%_100%]" />
      </div>

      {/* Form skeleton */}
      <ContactConfigFormSkeleton />
    </div>
  );
}
