"use client";

import { useState, useCallback } from "react";
import { Plus } from "@phosphor-icons/react";
import { ApiKeysTable } from "@/features/api-keys/components/api-keys-table";
import { CreateApiKeyDialog } from "@/features/api-keys/components/create-api-key-dialog";
import { revokeApiKeyAction } from "@/features/api-keys/actions/api-keys.actions";
import { Button } from "@/shared/components/button";
import { ICON_SIZES } from "@/shared/constants/iconography";
import { Toast } from "@/shared/components/toast";
import type { ApiKeyResponse } from "@/shared/types/api-key-schema";

/**
 * ApiKeysPageClient — client component that composes the API keys management page.
 */
export function ApiKeysPageClient() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState<{
    variant: "success" | "error";
    title: string;
    message?: string;
  } | null>(null);

  const handleCreated = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // Keep dialog open so the user can see and copy the generated key.
    // The dialog's own close button dismisses it after the user copies the key.
  }, []);

  const handleRevoked = useCallback(async (key: ApiKeyResponse) => {
    const result = await revokeApiKeyAction(key.id);
    setRefreshKey((k) => k + 1);
    if (result.success) {
      setToast({
        variant: "success",
        title: "API key revocada",
        message: "La clave ya no es válida para autenticación.",
      });
    } else {
      setToast({
        variant: "error",
        title: result.error ?? "Error al revocar la API key",
      });
    }
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
            API Keys
          </h1>
          <p className="mt-1 font-sans text-sm text-fg-muted">
            Gestiona las claves de acceso a la API pública
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
        >
          <Plus size={ICON_SIZES.inline} aria-hidden="true" />
          Nueva API key
        </Button>
      </div>

      {/* API keys table */}
      <ApiKeysTable key={refreshKey} onRevokeKey={handleRevoked} />

      {/* Create API key dialog */}
      <CreateApiKeyDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
