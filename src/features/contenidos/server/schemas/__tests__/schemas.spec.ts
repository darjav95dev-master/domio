/* eslint-disable sonarjs/no-duplicate-string */

import { describe, it, expect } from "vitest";
import { getBlockSchema, isValidBlockKey } from "../block-schema-registry";
import { contactConfigSchema } from "../contact-config.schema";
import type { PageKey, BlockKey } from "@/shared/types/content.types";

// ---------------------------------------------------------------------------
// Content block schemas — valid payloads
// ---------------------------------------------------------------------------
describe("Content block schemas", () => {
  describe("heroBlockSchema", () => {
    const validPayload = {
      claim: "Vive tu hogar ideal",
      lead: "Descubre promociones únicas diseñadas para ti",
      ctaPrimary: "Ver promociones",
      ctaSecondary: "Saber más",
      backgroundImageId: null,
    };

    it("accepts a valid hero payload", () => {
      const schema = getBlockSchema("home", "hero");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects hero payload with empty claim", () => {
      const schema = getBlockSchema("home", "hero");
      const result = schema!.safeParse({ ...validPayload, claim: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.path).toContain("claim");
      }
    });

    it("rejects hero payload with claim exceeding 200 characters", () => {
      const schema = getBlockSchema("home", "hero");
      const result = schema!.safeParse({
        ...validPayload,
        claim: "x".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("rejects hero payload with invalid uuid for backgroundImageId", () => {
      const schema = getBlockSchema("home", "hero");
      const result = schema!.safeParse({
        ...validPayload,
        backgroundImageId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("comoTrabajamosBlockSchema", () => {
    const validPayload = {
      items: [
        {
          titulo: "Asesoría personalizada",
          descripcion: "Te ayudamos a encontrar la mejor opción",
          icono: "handshake",
        },
      ],
    };

    it("accepts a valid como-trabajamos payload", () => {
      const schema = getBlockSchema("home", "como-trabajamos");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload with empty items array", () => {
      const schema = getBlockSchema("home", "como-trabajamos");
      const result = schema!.safeParse({ items: [] });
      expect(result.success).toBe(false);
    });

    it("rejects payload with more than 8 items", () => {
      const schema = getBlockSchema("home", "como-trabajamos");
      const items = Array.from({ length: 9 }, (_, i) => ({
        titulo: `Item ${i + 1}`,
        descripcion: `Descripción ${i + 1}`,
        icono: "icon",
      }));
      const result = schema!.safeParse({ items });
      expect(result.success).toBe(false);
    });
  });

  describe("sobreHomeBlockSchema", () => {
    const validPayload = {
      texto: "Somos una empresa comprometida con tu hogar",
      imagenId: null,
    };

    it("accepts a valid sobre payload", () => {
      const schema = getBlockSchema("home", "sobre");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects sobre payload with empty texto", () => {
      const schema = getBlockSchema("home", "sobre");
      const result = schema!.safeParse({ ...validPayload, texto: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("portafolioDestacadoBlockSchema", () => {
    const validPayload = {
      titulo: "Nuestro portafolio",
      descripcion: "Conoce nuestras promociones destacadas",
    };

    it("accepts a valid portafolio-destacado payload", () => {
      const schema = getBlockSchema("home", "portafolio-destacado");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload with missing titulo", () => {
      const schema = getBlockSchema("home", "portafolio-destacado");
      const result = schema!.safeParse({ descripcion: "test" });
      expect(result.success).toBe(false);
    });
  });

  describe("confianzaBlockSchema", () => {
    const validPayload = {
      metricas: [
        { valor: "500+", etiqueta: "Clientes satisfechos" },
      ],
      testimonios: [],
    };

    it("accepts a valid confianza payload", () => {
      const schema = getBlockSchema("home", "confianza");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload with empty metricas", () => {
      const schema = getBlockSchema("home", "confianza");
      const result = schema!.safeParse({ metricas: [], testimonios: [] });
      expect(result.success).toBe(false);
    });

    it("rejects payload with more than 8 metricas", () => {
      const schema = getBlockSchema("home", "confianza");
      const metricas = Array.from({ length: 9 }, (_, i) => ({
        valor: `${i + 1}`,
        etiqueta: `Métrica ${i + 1}`,
      }));
      const result = schema!.safeParse({ metricas, testimonios: [] });
      expect(result.success).toBe(false);
    });

    it("rejects payload with more than 6 testimonios", () => {
      const schema = getBlockSchema("home", "confianza");
      const testimonios = Array.from({ length: 7 }, (_, i) => ({
        texto: `Texto ${i + 1}`,
        autor: `Autor ${i + 1}`,
      }));
      const result = schema!.safeParse({
        metricas: [{ valor: "1", etiqueta: "Métrica" }],
        testimonios,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ctaFinalBlockSchema", () => {
    const validPayload = {
      titulo: "¿Listo para tu nuevo hogar?",
      texto: "Contáctanos hoy y descubre las mejores opciones",
      botonTexto: "Contáctanos",
    };

    it("accepts a valid cta-final payload", () => {
      const schema = getBlockSchema("home", "cta-final");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload with empty titulo", () => {
      const schema = getBlockSchema("home", "cta-final");
      const result = schema!.safeParse({ ...validPayload, titulo: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("faqBlockSchema", () => {
    const validPayload = {
      items: [
        {
          pregunta: "¿Cómo puedo agendar una visita?",
          respuesta: "Puedes contactarnos a través de nuestro formulario",
        },
      ],
    };

    it("accepts a valid faq payload", () => {
      const schema = getBlockSchema("home", "faq");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload with empty items", () => {
      const schema = getBlockSchema("home", "faq");
      const result = schema!.safeParse({ items: [] });
      expect(result.success).toBe(false);
    });

    it("rejects payload with more than 12 items", () => {
      const schema = getBlockSchema("home", "faq");
      const items = Array.from({ length: 13 }, (_, i) => ({
        pregunta: `Pregunta ${i + 1}?`,
        respuesta: `Respuesta ${i + 1}`,
      }));
      const result = schema!.safeParse({ items });
      expect(result.success).toBe(false);
    });
  });

  describe("sobreHeroBlockSchema", () => {
    const validPayload = {
      titulo: "Sobre nosotros",
      lead: "Conoce nuestra historia y valores",
    };

    it("accepts a valid sobre hero payload", () => {
      const schema = getBlockSchema("sobre", "hero");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects sobre hero payload with missing lead", () => {
      const schema = getBlockSchema("sobre", "hero");
      const result = schema!.safeParse({ titulo: "Sobre nosotros" });
      expect(result.success).toBe(false);
    });
  });

  describe("sobreCuerpoBlockSchema", () => {
    const validPayload = {
      parrafos: [
        "Somos una empresa con más de 20 años de experiencia.",
        "Nuestro compromiso es la calidad y la transparencia.",
      ],
    };

    it("accepts a valid sobre cuerpo payload", () => {
      const schema = getBlockSchema("sobre", "cuerpo");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload with empty parrafos array", () => {
      const schema = getBlockSchema("sobre", "cuerpo");
      const result = schema!.safeParse({ parrafos: [] });
      expect(result.success).toBe(false);
    });

    it("rejects payload with more than 20 parrafos", () => {
      const schema = getBlockSchema("sobre", "cuerpo");
      const parrafos = Array.from({ length: 21 }, (_, i) => `Párrafo ${i + 1}`);
      const result = schema!.safeParse({ parrafos });
      expect(result.success).toBe(false);
    });
  });

  describe("equipoHeroBlockSchema", () => {
    const validPayload = {
      titulo: "Nuestro equipo",
      lead: "Conoce a los profesionales que hacen posible tu hogar",
    };

    it("accepts a valid equipo hero payload", () => {
      const schema = getBlockSchema("equipo", "hero");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });
  });

  describe("equipoMiembrosBlockSchema", () => {
    const validPayload = {
      items: [
        {
          nombre: "Ana García",
          rol: "Directora Comercial",
          bio: "Más de 15 años en el sector inmobiliario",
          avatarId: null,
        },
      ],
    };

    it("accepts a valid equipo miembros payload", () => {
      const schema = getBlockSchema("equipo", "miembros");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload with more than 20 miembros", () => {
      const schema = getBlockSchema("equipo", "miembros");
      const items = Array.from({ length: 21 }, (_, i) => ({
        nombre: `Miembro ${i + 1}`,
        rol: "Rol",
        bio: "Bio",
        avatarId: null,
      }));
      const result = schema!.safeParse({ items });
      expect(result.success).toBe(false);
    });
  });

  describe("legalContentBlockSchema", () => {
    const validPayload = {
      titulo: "Aviso Legal",
      secciones: [
        {
          titulo: "Identificación del titular",
          contenido: "El presente aviso legal regula el uso del sitio web.",
        },
      ],
    };

    it("accepts a valid legal content payload for aviso-legal", () => {
      const schema = getBlockSchema("aviso-legal", "contenido");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("accepts a valid legal content payload for privacidad", () => {
      const schema = getBlockSchema("privacidad", "contenido");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("accepts a valid legal content payload for cookies", () => {
      const schema = getBlockSchema("cookies", "contenido");
      expect(schema).not.toBeNull();
      const result = schema!.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload with empty secciones", () => {
      const schema = getBlockSchema("aviso-legal", "contenido");
      const result = schema!.safeParse({ titulo: "Aviso Legal", secciones: [] });
      expect(result.success).toBe(false);
    });

    it("rejects payload with more than 20 secciones", () => {
      const schema = getBlockSchema("aviso-legal", "contenido");
      const secciones = Array.from({ length: 21 }, (_, i) => ({
        titulo: `Sección ${i + 1}`,
        contenido: `Contenido de la sección ${i + 1}`,
      }));
      const result = schema!.safeParse({ titulo: "Aviso Legal", secciones });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Contact config schema
// ---------------------------------------------------------------------------
describe("contactConfigSchema", () => {
  it("accepts a complete valid contact config", () => {
    const result = contactConfigSchema.safeParse({
      phone: "+34 900 123 456",
      email: "info@wedomio.com",
      address: "Calle Mayor 1, Madrid",
      hours: "Lun-Vie 9:00-18:00",
      whatsappNumber: "+34 600 123 456",
      whatsappPrefilledMessage: "Hola, me interesa una propiedad",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a partially null contact config", () => {
    const result = contactConfigSchema.safeParse({
      phone: null,
      email: null,
      address: null,
      hours: null,
      whatsappNumber: null,
      whatsappPrefilledMessage: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = contactConfigSchema.safeParse({
      phone: null,
      email: "not-an-email",
      address: null,
      hours: null,
      whatsappNumber: null,
      whatsappPrefilledMessage: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects email exceeding 255 characters", () => {
    const result = contactConfigSchema.safeParse({
      phone: null,
      email: `${"a".repeat(246)}@example.com`,
      address: null,
      hours: null,
      whatsappNumber: null,
      whatsappPrefilledMessage: null,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Schema registry
// ---------------------------------------------------------------------------
describe("block-schema-registry", () => {
  const validCombinations: Array<[PageKey, BlockKey, string]> = [
    ["home", "hero", "heroBlockSchema"],
    ["home", "como-trabajamos", "comoTrabajamosBlockSchema"],
    ["home", "sobre", "sobreHomeBlockSchema"],
    ["home", "portafolio-destacado", "portafolioDestacadoBlockSchema"],
    ["home", "confianza", "confianzaBlockSchema"],
    ["home", "cta-final", "ctaFinalBlockSchema"],
    ["home", "faq", "faqBlockSchema"],
    ["sobre", "hero", "sobreHeroBlockSchema"],
    ["sobre", "cuerpo", "sobreCuerpoBlockSchema"],
    ["equipo", "hero", "equipoHeroBlockSchema"],
    ["equipo", "miembros", "equipoMiembrosBlockSchema"],
    ["aviso-legal", "contenido", "legalContentBlockSchema"],
    ["privacidad", "contenido", "legalContentBlockSchema"],
    ["cookies", "contenido", "legalContentBlockSchema"],
  ];

  it.each(validCombinations)(
    "getBlockSchema returns a schema for %s/%s",
    (pageKey, blockKey) => {
      const schema = getBlockSchema(pageKey, blockKey);
      expect(schema).not.toBeNull();
    },
  );

  it.each(validCombinations)(
    "isValidBlockKey returns true for %s/%s",
    (pageKey, blockKey) => {
      expect(isValidBlockKey(pageKey, blockKey)).toBe(true);
    },
  );

  const invalidCombinations: Array<[PageKey, string]> = [
    ["home", "nonexistent" as BlockKey],
    ["sobre", "foo" as BlockKey],
    ["equipo", "bar" as BlockKey],
    ["paginainvalida" as PageKey, "hero" as BlockKey],
  ];

  it.each(invalidCombinations)(
    "getBlockSchema returns null for invalid combination %s/%s",
    (pageKey, blockKey) => {
      // Use type assertion to simulate invalid runtime values
      const schema = getBlockSchema(pageKey as PageKey, blockKey as BlockKey);
      expect(schema).toBeNull();
    },
  );

  it.each(invalidCombinations)(
    "isValidBlockKey returns false for invalid combination %s/%s",
    (pageKey, blockKey) => {
      expect(isValidBlockKey(pageKey as PageKey, blockKey as BlockKey)).toBe(false);
    },
  );
});
