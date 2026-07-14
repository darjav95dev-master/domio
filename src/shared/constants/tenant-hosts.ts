import { getSiteUrl } from "@/shared/utils/seo/site-url";

export const PUBLIC_HOST = "wedomio.com";
export const API_V1_PREFIX = "/api/v1/";
export const API_KEY_HEADER = "x-api-key";

/**
 * El backoffice se sirve en /panel del host principal (app/(auth)/panel/...),
 * no en un subdominio: no hay DNS, Caddy ni middleware para panel.wedomio.com.
 * Se deriva de NEXT_PUBLIC_SITE_URL para que los emails de dev enlacen a dev.
 */
export const backofficeLeadUrl = (leadId: string): string =>
  `${getSiteUrl()}/panel/leads/${leadId}`;
