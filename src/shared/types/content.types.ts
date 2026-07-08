// ---------------------------------------------------------------------------
// Global content editor types — shared between server and UI layers
// Used by content blocks (home, sobre, equipo, legales), contact config,
// and content history (versionado con revert).
// ---------------------------------------------------------------------------

export type PageKey =
  | 'home'
  | 'sobre'
  | 'equipo'
  | 'aviso-legal'
  | 'privacidad'
  | 'cookies';

export type BlockKey =
  | 'hero'
  | 'como-trabajamos'
  | 'sobre'
  | 'portafolio-destacado'
  | 'confianza'
  | 'cta-final'
  | 'faq'
  | 'cuerpo'
  | 'miembros'
  | 'contenido';

export type ContentType = 'block' | 'contact';

// ---------------------------------------------------------------------------
// Data shapes — align with drizzle schemas in infrastructure/db/schema/
// ---------------------------------------------------------------------------

export interface ContentBlockData {
  id: string;
  tenantId: string;
  pageKey: PageKey;
  blockKey: BlockKey;
  payload: Record<string, unknown>;
  updatedBy: string | null;
  updatedAt: Date;
}

export interface ContactConfigData {
  tenantId: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  whatsappNumber: string | null;
  whatsappPrefilledMessage: string | null;
  updatedBy: string | null;
  updatedAt: Date;
}

export interface ContentHistoryData {
  id: string;
  tenantId: string;
  contentType: ContentType;
  contentKey: string;
  payloadSnapshot: Record<string, unknown>;
  updatedBy: string | null;
  createdAt: Date;
}
