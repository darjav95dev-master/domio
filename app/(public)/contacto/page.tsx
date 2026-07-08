import type { Metadata } from "next";
import { ContactForm } from "@/features/leads/components/contact-form";

export const metadata: Metadata = {
  title: "Contacto | Domio",
  description:
    "Contacta con Domio para recibir informacion sobre nuestras promociones inmobiliarias.",
};

/**
 * ContactoPage — pagina publica de contacto con formulario
 * y consentimiento RGPD.
 */
export default function ContactoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-fg-default">
        Contacto
      </h1>
      <p className="mt-2 font-sans text-base text-fg-muted">
        Rellena el formulario y te responderemos a la mayor brevedad posible.
      </p>

      <div className="mt-10">
        <ContactForm />
      </div>
    </main>
  );
}
