"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/shared/components/input";
import { Button } from "@/shared/components/button";
import { setupPasswordAction } from "@/features/team/actions/setup-password.action";

/**
 * SetupPasswordPage — destino del enlace del email de invitación al equipo.
 *
 * Pública a propósito: quien llega aquí todavía no tiene contraseña, así que no
 * puede tener sesión. El middleware la excluye del guard de /panel/*.
 */
function SetupPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, setIsPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <p role="alert" className="font-sans text-sm text-status-danger-default">
        Falta el token de invitación. Abre el enlace tal cual viene en el email.
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <p aria-live="polite" className="font-sans text-sm text-fg-default">
          Contraseña establecida. Ya puedes entrar al panel.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => router.push("/panel/login")}
        >
          Ir al login
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsPending(true);

    try {
      const result = await setupPasswordAction(new FormData(e.currentTarget));

      if (result.success) {
        setDone(true);
        return;
      }

      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    } catch {
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />

      <Input
        id="password"
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        disabled={isPending}
        error={fieldErrors.password?.[0]}
      />

      <Input
        id="confirmPassword"
        label="Repite la contraseña"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        disabled={isPending}
        error={fieldErrors.confirmPassword?.[0]}
      />

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="font-sans text-sm text-status-danger-default"
        >
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Guardando..." : "Establecer contraseña"}
      </Button>
    </form>
  );
}

export default function SetupPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-canvas px-6">
      <div className="w-full max-w-sm rounded-card border border-border-default bg-bg-surface p-8">
        <h1 className="mb-8 text-center font-display text-2xl font-medium text-fg-default">
          Establece tu contraseña
        </h1>
        <Suspense fallback={null}>
          <SetupPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
