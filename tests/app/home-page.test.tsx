import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/link before any component imports
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// Mock the data fetching — getHomePageData is async
vi.mock("@/features/home/server/get-home-data", () => ({
  getHomePageData: vi.fn().mockResolvedValue({
    hero: {
      claim: "Tu hogar en Canarias empieza aquí",
      lead: "Descubre las mejores propiedades.",
      ctaPrimary: "Ver propiedades",
      ctaSecondary: "Contactar",
      backgroundImageId: null,
      trustStats: [
        { value: "15", unit: "años", label: "de experiencia" },
        { value: "500", unit: "inmuebles", label: "gestionados" },
        { value: "10", unit: "ciudades", label: "en Tenerife" },
      ],
    },
    howWeWork: {
      title: "Cómo trabajamos",
      subtitle: "Nuestro proceso transparente.",
      steps: [
        { numeral: "01", icon: "magnifying-glass", title: "Analizamos", body: "Estudiamos tus necesidades." },
        { numeral: "02", icon: "house", title: "Visitamos", body: "Te acompañamos a las visitas." },
        { numeral: "03", icon: "handshake", title: "Gestionamos", body: "Tramitamos la documentación." },
        { numeral: "04", icon: "key", title: "Entregamos", body: "Te damos las llaves." },
      ],
    },
    about: {
      title: "Quiénes somos",
      subtitle: "Más de 15 años de experiencia.",
      imageId: null,
      imageAlt: "Equipo Domio",
      tagText: "Desde 2010",
      rows: [
        { aspect: "Experiencia", agenciaTradicional: "Variable", domio: "15+ años" },
      ],
    },
    trust: {
      title: "Confianza",
      subtitle: "Los números hablan.",
      metrics: [
        { value: "15", unit: "años", label: "de experiencia" },
        { value: "500", unit: "+", label: "inmuebles" },
      ],
      testimonios: [
        { quote: "Gran experiencia.", author: "María", role: "Cliente" },
      ],
    },
    cta: {
      title: "¿Listo para tu hogar?",
      body: "Déjanos ayudarte.",
      ctaLabel: "Solicitar visita",
      ctaHref: "/contacto",
      backgroundImageId: null,
    },
    faq: {
      title: "Preguntas frecuentes",
      subtitle: "Todo lo que necesitas saber.",
      items: [
        { question: "¿Qué gestionan?", answer: "Todo tipo de inmuebles." },
      ],
    },
    portfolio: [],
  }),
}));

describe("HomePage", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    originalMatchMedia = window.matchMedia;

    // Mock matchMedia for useScrollReveal
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("renders all 7 blocks with their titles", async () => {
    const HomePage = (await import("@app/(public)/page")).default;
    render(await HomePage());

    // Hero
    expect(
      screen.getByRole("heading", { level: 1, name: "Tu hogar en Canarias empieza aquí" }),
    ).toBeInTheDocument();

    // HowWeWork
    expect(
      screen.getByRole("heading", { level: 2, name: "Cómo trabajamos" }),
    ).toBeInTheDocument();

    // About
    expect(
      screen.getByRole("heading", { level: 2, name: "Quiénes somos" }),
    ).toBeInTheDocument();

    // Portfolio
    expect(
      screen.getByRole("heading", { level: 2, name: "Portafolio destacado" }),
    ).toBeInTheDocument();

    // Trust
    expect(
      screen.getByRole("heading", { level: 2, name: "Confianza" }),
    ).toBeInTheDocument();

    // CTA
    expect(
      screen.getByRole("heading", { level: 2, name: "¿Listo para tu hogar?" }),
    ).toBeInTheDocument();

    // FAQ
    expect(
      screen.getByRole("heading", { level: 2, name: "Preguntas frecuentes" }),
    ).toBeInTheDocument();
  });

  it("renders 7 data-reveal wrappers", async () => {
    const HomePage = (await import("@app/(public)/page")).default;
    const { container } = render(await HomePage());

    const revealedElements = container.querySelectorAll("[data-reveal]");
    expect(revealedElements).toHaveLength(7);
  });
});
