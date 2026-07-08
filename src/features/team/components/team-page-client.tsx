"use client";

import { useState, useCallback } from "react";
import { Plus } from "@phosphor-icons/react";
import { UsersTable } from "@/features/team/components/users-table";
import { CreateUserDialog } from "@/features/team/components/create-user-dialog";
import { Button } from "@/shared/components/button";
import { ICON_SIZES } from "@/shared/constants/iconography";
import { Toast } from "@/shared/components/toast";

/**
 * TeamPageClient — client component that composes the team management page.
 *
 * Wraps the UsersTable and CreateUserDialog, managing the shared state
 * for refreshing the table after mutations.
 */
export function TeamPageClient() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<{
    variant: "success" | "error";
    title: string;
    message?: string;
  } | null>(null);

  const handleCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setShowCreateDialog(false);
    setToast({
      variant: "success",
      title: "Invitación enviada",
      message: "El usuario recibirá un email para establecer su contraseña.",
    });
  }, []);

  const handleUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Toast notification */}
      {toast && (
        <div className="fixed right-6 top-6 z-overlay-max">
          <Toast
            variant={toast.variant}
            title={toast.title}
            autoDismiss={5000}
            onDismiss={() => setToast(null)}
          >
            {toast.message}
          </Toast>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-fg-default">
            Equipo
          </h1>
          <p className="mt-1 font-sans text-sm text-fg-muted">
            Gestiona los usuarios de tu organización
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
        >
          <Plus size={ICON_SIZES.inline} aria-hidden="true" />
          Nuevo usuario
        </Button>
      </div>

      {/* Users table */}
      <UsersTable key={refreshKey} onEditUser={handleUpdated} />

      {/* Create user dialog */}
      <CreateUserDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
