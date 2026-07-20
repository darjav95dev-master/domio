import { type Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * CatalogoEditPage — Page Object for /panel/catalogo/[id]
 *
 * @see app/(auth)/panel/catalogo/[id]/page.tsx
 * @see src/features/promociones/components/promocion-form.tsx
 * @see src/features/promociones/components/blocks-editor.tsx
 * @see src/features/promociones/components/media-gallery.tsx
 */
export class CatalogoEditPage extends BasePage {
  protected readonly path = "/panel/catalogo";

  /**
   * Navigate to a specific promotion edit page by ID.
   */
  async gotoId(id: string): Promise<ReturnType<BasePage["goto"]>> {
    return this.gotoPath(`/panel/catalogo/${id}`);
  }

  // ── Navigation ───────────────────────────────────────────────────────

  get backLink(): Locator {
    return this.page.getByRole("link", { name: /volver al catálogo/i });
  }

  /** Promotion name as the page heading */
  get heading(): Locator {
    return this.page.getByRole("heading", { level: 1 });
  }

  // ── Form Sections ────────────────────────────────────────────────────

  /**
   * The main PromocionForm. No usa <form>: las secciones son <fieldset> con
   * <legend> (rol implícito "group"). Anclamos a la sección "Identidad".
   */
  get promocionForm(): Locator {
    return this.page.getByRole("group", { name: /identidad/i });
  }

  /** Construction status select (in the Commercial Status section) */
  get constructionStatusSelect(): Locator {
    return this.page.getByLabel(/estado de obra/i);
  }

  /** Publish button */
  get publishButton(): Locator {
    return this.page.getByRole("button", { name: /publicar/i });
  }

  /** Save draft button — use full label to avoid matching multiple block-level Guardar buttons */
  get saveDraftButton(): Locator {
    return this.page.getByRole("button", { name: /guardar borrador/i });
  }

  // ── Autosave ─────────────────────────────────────────────────────────

  /** Autosave indicator text (e.g. "Guardado", "Cambios sin guardar") */
  get autosaveIndicator(): Locator {
    return this.page.getByText(/guardado|cambios sin guardar|autoguardado/i);
  }

  // ── Image Gallery ────────────────────────────────────────────────────

  get imageUploadArea(): Locator {
    return this.page.getByText(/imagen|galería/i).first();
  }

  /** Alt text input for images */
  get altTextInput(): Locator {
    return this.page.getByLabel(/texto alternativo|alt/i);
  }

  // ── Editorial Blocks ─────────────────────────────────────────────────

  get blocksEditor(): Locator {
    return this.page.getByText(/bloques editoriales/i);
  }
}
