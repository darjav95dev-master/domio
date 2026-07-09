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
  /** Office latitude (from contact_config.office_lat) */
  officeLat: number | null;
  /** Office longitude (from contact_config.office_lng) */
  officeLng: number | null;
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
