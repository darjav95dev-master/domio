/**
 * Shared style constants for backoffice form components.
 *
 * Extracted from individual form sections (promocion-section-identity,
 * promocion-section-commercial-status, tipologia-editor, catalog-filters, etc.)
 * to avoid duplication across 8+ components.
 *
 * Note: INPUT_BASE is intentionally NOT exported here because it varies slightly
 * across components (py-2.5/py-3, text-sm/text-base, presence of placeholder).
 * Each component keeps its own INPUT_BASE where it differs.
 */

/** Label style used in all backoffice form fields. */
export const LABEL_STYLE =
  "font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-fg-subtle";

/** Additional style for select elements (removes native arrow). */
export const SELECT_STYLE = "appearance-none cursor-pointer";

/** Error message style. */
export const ERROR_STYLE = "font-sans text-sm text-status-danger-default";

/** Border style applied to inputs in error state. */
export const DANGER_BORDER = "border-status-danger-default";
