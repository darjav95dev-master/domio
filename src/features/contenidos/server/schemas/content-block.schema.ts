import { z } from "zod";

// ---------------------------------------------------------------------------
// home/hero
// ---------------------------------------------------------------------------
export const heroBlockSchema = z.object({
  claim: z.string().min(1).max(200),
  lead: z.string().min(1).max(500),
  ctaPrimary: z.string().min(1).max(100),
  ctaSecondary: z.string().min(1).max(100),
  backgroundImageId: z.string().uuid().nullable(),
});

// ---------------------------------------------------------------------------
// home/como-trabajamos
// ---------------------------------------------------------------------------
export const comoTrabajamosBlockSchema = z.object({
  items: z
    .array(
      z.object({
        titulo: z.string().min(1).max(100),
        descripcion: z.string().min(1).max(300),
        icono: z.string().min(1).max(50),
      }),
    )
    .min(1)
    .max(8),
});

// ---------------------------------------------------------------------------
// home/sobre
// ---------------------------------------------------------------------------
export const sobreHomeBlockSchema = z.object({
  texto: z.string().min(1).max(1000),
  imagenId: z.string().uuid().nullable(),
});

// ---------------------------------------------------------------------------
// home/portafolio-destacado
// ---------------------------------------------------------------------------
export const portafolioDestacadoBlockSchema = z.object({
  titulo: z.string().min(1).max(100),
  descripcion: z.string().min(1).max(300),
});

// ---------------------------------------------------------------------------
// home/confianza
// ---------------------------------------------------------------------------
export const confianzaBlockSchema = z.object({
  metricas: z
    .array(
      z.object({
        valor: z.string().min(1).max(50),
        etiqueta: z.string().min(1).max(100),
      }),
    )
    .min(1)
    .max(8),
  testimonios: z
    .array(
      z.object({
        texto: z.string().min(1).max(500),
        autor: z.string().min(1).max(100),
      }),
    )
    .min(0)
    .max(6),
});

// ---------------------------------------------------------------------------
// home/cta-final
// ---------------------------------------------------------------------------
export const ctaFinalBlockSchema = z.object({
  titulo: z.string().min(1).max(150),
  texto: z.string().min(1).max(400),
  botonTexto: z.string().min(1).max(50),
});

// ---------------------------------------------------------------------------
// home/faq
// ---------------------------------------------------------------------------
export const faqBlockSchema = z.object({
  items: z
    .array(
      z.object({
        pregunta: z.string().min(1).max(200),
        respuesta: z.string().min(1).max(1000),
      }),
    )
    .min(1)
    .max(12),
});

// ---------------------------------------------------------------------------
// sobre/hero
// ---------------------------------------------------------------------------
export const sobreHeroBlockSchema = z.object({
  titulo: z.string().min(1).max(100),
  lead: z.string().min(1).max(300),
});

// ---------------------------------------------------------------------------
// sobre/cuerpo
// ---------------------------------------------------------------------------
export const sobreCuerpoBlockSchema = z.object({
  parrafos: z.array(z.string().min(1).max(1000)).min(1).max(20),
});

// ---------------------------------------------------------------------------
// equipo/hero
// ---------------------------------------------------------------------------
export const equipoHeroBlockSchema = z.object({
  titulo: z.string().min(1).max(100),
  lead: z.string().min(1).max(300),
});

// ---------------------------------------------------------------------------
// equipo/miembros
// ---------------------------------------------------------------------------
export const equipoMiembrosBlockSchema = z.object({
  items: z
    .array(
      z.object({
        nombre: z.string().min(1).max(100),
        rol: z.string().min(1).max(100),
        bio: z.string().min(1).max(500),
        avatarId: z.string().uuid().nullable(),
      }),
    )
    .min(0)
    .max(20),
});

// ---------------------------------------------------------------------------
// aviso-legal/contenido, privacidad/contenido, cookies/contenido
// ---------------------------------------------------------------------------
export const legalContentBlockSchema = z.object({
  titulo: z.string().min(1).max(100),
  secciones: z
    .array(
      z.object({
        titulo: z.string().min(1).max(100),
        contenido: z.string().min(1).max(5000),
      }),
    )
    .min(1)
    .max(20),
});
