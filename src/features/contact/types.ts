// ---------------------------------------------------------------------------
// Contact feature types
// ---------------------------------------------------------------------------

export interface ContactConfigData {
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  whatsappNumber: string | null;
  whatsappPrefilledMessage: string | null;
  /** Office coordinates [lng, lat] — may come from a future schema addition */
  coordinates?: [number, number] | null;
}

export interface AboutHeroPayload {
  titulo: string;
  lead: string;
}

export interface AboutCuerpoPayload {
  parrafos: string[];
}

export interface ContactPageData {
  contactConfig: ContactConfigData | null;
}

export interface SobrePageData {
  hero: AboutHeroPayload | null;
  cuerpo: AboutCuerpoPayload | null;
}
