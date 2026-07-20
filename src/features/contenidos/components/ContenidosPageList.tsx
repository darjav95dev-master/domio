import Link from 'next/link';

type PageEntry = {
  key: string;
  label: string;
  description: string;
};

const pages: PageEntry[] = [
  {
    key: 'home',
    label: 'Home',
    description: 'Hero, cómo trabajamos, portafolio destacado, confianza, CTA final, FAQ',
  },
  {
    key: 'sobre',
    label: 'Sobre Domio',
    description: 'Hero, cuerpo de texto — historia y valores',
  },
  {
    key: 'equipo',
    label: 'Equipo',
    description: 'Hero, miembros del equipo',
  },
  {
    key: 'aviso-legal',
    label: 'Aviso Legal',
    description: 'Contenido legal — términos y condiciones',
  },
  {
    key: 'privacidad',
    label: 'Privacidad',
    description: 'Política de privacidad',
  },
  {
    key: 'cookies',
    label: 'Cookies',
    description: 'Política de cookies',
  },
  {
    key: 'contacto',
    label: 'Contacto',
    description: 'Teléfono, email, dirección, horario y WhatsApp',
  },
];

// Server component: lista estática de enlaces, sin interactividad, no necesita
// 'use client' (antes lo declaraba y viajaba al bundle del cliente sin motivo).
export function ContenidosPageList() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg-default">
          Contenidos Globales
        </h1>
      </div>

      <p className="font-sans text-base text-fg-muted">
        Selecciona una página para editar sus bloques de contenido.
      </p>

      <nav aria-label="Páginas editables" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Link
            key={page.key}
            href={`/panel/contenidos/${page.key}`}
            className="group rounded-card border border-border-default bg-bg-default p-5 transition-colors duration-deliberate ease-standard hover:border-accent-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <h2 className="font-display text-lg font-semibold text-fg-default group-hover:text-accent-default transition-colors duration-standard">
              {page.label}
            </h2>
            <p className="mt-1 font-sans text-sm text-fg-muted">
              {page.description}
            </p>
          </Link>
        ))}
      </nav>
    </div>
  );
}
