"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/shared/components/input";
import { Button } from "@/shared/components/button";

/**
 * LoginPage — placeholder funcional para el backoffice.
 *
 * Formulario de credenciales (email + password) que llama a
 * signIn("credentials", { redirect: false }). En éxito redirige
 * a /panel; en error muestra mensaje con aria-live.
 *
 * @see design.md §13.5
 * @see middleware.ts (auth guard redirige aquí si no hay sesión)
 */
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Credenciales inválidas. Verifica tu email y contraseña.");
        return;
      }

      // Login exitoso → redirigir al panel
      router.push("/panel");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-card border border-border-default bg-bg-surface p-8">
      <h1 className="mb-8 text-center font-display text-2xl font-medium text-fg-default">
        Panel de Administración
      </h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Input
          id="email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
        />

        <Input
          id="password"
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
        />

        {error && (
          <p
            id="login-error"
            role="alert"
            aria-live="polite"
            className="font-sans text-sm text-status-danger-default"
          >
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
      </form>
    </div>
  );
}
