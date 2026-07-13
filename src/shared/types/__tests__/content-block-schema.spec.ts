/* eslint-disable sonarjs/no-duplicate-string */
import { describe, it, expect } from "vitest";
import { contentBlockSchema } from "@/shared/types/content-block-schema";

const B_DESC = "DESCRIPCION_GENERAL";
const B_CALIDADES = "MEMORIA_CALIDADES";
const B_ZONAS = "ZONAS_COMUNES";
const B_UBICACION = "UBICACION_SERVICIOS";
const B_PLAZOS = "PLAZOS_GARANTIAS";

describe("contentBlockSchema", () => {
  // -------------------------------------------------------------------------
  // DESCRIPCION_GENERAL
  // -------------------------------------------------------------------------

  describe(B_DESC, () => {
    it("accepts valid text with no HTML", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: { text: "Descripción de la promoción" },
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid text with allowed HTML tags", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: {
          text: "<p>Descripción con <b>negrita</b> y <i>cursiva</i></p>",
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty text", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: { text: "" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects text with disallowed HTML tags (like <script>)", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: { text: "<script>alert('xss')</script>" },
      });
      expect(result.success).toBe(false);
    });

    it("rejects text with <img> tag", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: { text: "Texto con <img src='x' />" },
      });
      expect(result.success).toBe(false);
    });

    it("accepts text with <br> tags", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: { text: "Línea 1<br>Línea 2" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing text field", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: {},
      });
      expect(result.success).toBe(false);
    });

    it("strips event handler attributes from HTML", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: {
          text: '<p onclick="alert(1)" style="color:red">Texto</p>',
        },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.blockType === B_DESC) {
        expect(result.data.payload.text).not.toContain("onclick");
        expect(result.data.payload.text).toContain("style");
      }
    });

    it("strips onmouseover and other event attributes", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: {
          text: '<b onmouseover="evil()" class="foo">texto</b>',
        },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.blockType === B_DESC) {
        expect(result.data.payload.text).not.toContain("onmouseover");
        expect(result.data.payload.text).toContain("class");
      }
    });

    it("strips javascript: URLs from href attributes", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: {
          text: '<a href="javascript:alert(1)">click</a>',
        },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.blockType === B_DESC) {
        // eslint-disable-next-line sonarjs/code-eval
        expect(result.data.payload.text).not.toContain("javascript:");
        expect(result.data.payload.text).toContain(">click</a>");
        // href should be removed, remaining <a> has no attributes
        expect(result.data.payload.text).toBe("<a>click</a>");
      }
    });

    it("strips data: URLs from href attributes", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: {
          text: '<a href="data:text/plain,hello">link</a>',
        },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.blockType === B_DESC) {
        expect(result.data.payload.text).not.toContain("data:");
        expect(result.data.payload.text).toBe("<a>link</a>");
      }
    });

    it("keeps valid href attributes on <a> tags", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_DESC,
        payload: {
          text: '<a href="https://example.com" target="_blank">link</a>',
        },
      });
      expect(result.success).toBe(true);
      if (result.success && result.data.blockType === B_DESC) {
        expect(result.data.payload.text).toContain("href=");
        expect(result.data.payload.text).toContain("https://example.com");
      }
    });
  });

  // -------------------------------------------------------------------------
  // MEMORIA_CALIDADES
  // -------------------------------------------------------------------------

  describe(B_CALIDADES, () => {
    it("accepts valid items", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_CALIDADES,
        payload: {
          items: [
            { title: "Calidad A", description: "Descripción A" },
            { title: "Calidad B", description: "Descripción B", icon: "star" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty items array", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_CALIDADES,
        payload: { items: [] },
      });
      expect(result.success).toBe(false);
    });

    it("rejects item with empty title", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_CALIDADES,
        payload: {
          items: [{ title: "", description: "Descripción" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects item with empty description", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_CALIDADES,
        payload: {
          items: [{ title: "Calidad", description: "" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("accepts item without optional icon", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_CALIDADES,
        payload: {
          items: [{ title: "Calidad", description: "Descripción" }],
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing items field", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_CALIDADES,
        payload: {},
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // ZONAS_COMUNES
  // -------------------------------------------------------------------------

  describe(B_ZONAS, () => {
    it("accepts valid items", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_ZONAS,
        payload: {
          items: [
            { name: "Piscina", description: "Piscina comunitaria" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty items array", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_ZONAS,
        payload: { items: [] },
      });
      expect(result.success).toBe(false);
    });

    it("rejects item with empty name", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_ZONAS,
        payload: {
          items: [{ name: "", description: "Descripción" }],
        },
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // UBICACION_SERVICIOS
  // -------------------------------------------------------------------------

  describe(B_UBICACION, () => {
    it("accepts valid items", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_UBICACION,
        payload: {
          items: [
            { service: "Metro", distance: "200m" },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty items array", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_UBICACION,
        payload: { items: [] },
      });
      expect(result.success).toBe(false);
    });

    it("rejects item with empty service", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_UBICACION,
        payload: {
          items: [{ service: "", distance: "200m" }],
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects item with empty distance", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_UBICACION,
        payload: {
          items: [{ service: "Metro", distance: "" }],
        },
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // PLAZOS_GARANTIAS
  // -------------------------------------------------------------------------

  describe(B_PLAZOS, () => {
    it("accepts all fields provided", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_PLAZOS,
        payload: {
          delivery: "2026-12-01",
          license: "Licencia de obra",
          guarantee: "Aval bancario",
          audit: "Auditoría energética",
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty payload (all fields optional)", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_PLAZOS,
        payload: {},
      });
      expect(result.success).toBe(true);
    });

    it("accepts some fields provided", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_PLAZOS,
        payload: { delivery: "2026-12-01" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty string when field is provided", () => {
      const result = contentBlockSchema.safeParse({
        blockType: B_PLAZOS,
        payload: { delivery: "" },
      });
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Discriminated union
  // -------------------------------------------------------------------------

  it("rejects unknown blockType", () => {
    const result = contentBlockSchema.safeParse({
      blockType: "UNKNOWN_TYPE",
      payload: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects blockType with wrong payload shape", () => {
    const result = contentBlockSchema.safeParse({
      blockType: B_UBICACION,
      payload: { text: "wrong shape" },
    });
    expect(result.success).toBe(false);
  });
});
