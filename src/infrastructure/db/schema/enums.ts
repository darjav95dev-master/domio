import { pgEnum } from "drizzle-orm/pg-core";
import {
  USER_ROLES,
  PROMOCION_KINDS,
  PROMOCION_STATUSES,
  OPERATION_TYPES,
  PROPERTY_TYPES,
  CONSTRUCTION_STATUSES,
  MAP_PRIVACY_MODES,
  UNIT_STATUSES,
  LEAD_STATUSES,
  LEAD_SOURCES,
  LEAD_CHANNELS,
  MEDIA_ASSET_KINDS,
  MEDIA_ASSET_OWNER_TYPES,
  CONTENT_BLOCK_TYPES,
  ENERGY_CERTS,
  ARSOP_REQUEST_TYPES,
  EMAIL_STATUSES,
} from "@/shared/constants/db-enums";

export const roleEnum = pgEnum("role", USER_ROLES);
export const promocionKindEnum = pgEnum("promocion_kind", PROMOCION_KINDS);
export const promocionStatusEnum = pgEnum(
  "promocion_status",
  PROMOCION_STATUSES,
);
export const operationTypeEnum = pgEnum("operation_type", OPERATION_TYPES);
export const propertyTypeEnum = pgEnum("property_type", PROPERTY_TYPES);
export const constructionStatusEnum = pgEnum(
  "construction_status",
  CONSTRUCTION_STATUSES,
);
export const mapPrivacyModeEnum = pgEnum(
  "map_privacy_mode",
  MAP_PRIVACY_MODES,
);
export const unitStatusEnum = pgEnum("unit_status", UNIT_STATUSES);
export const leadStatusEnum = pgEnum("lead_status", LEAD_STATUSES);
export const leadSourceEnum = pgEnum("lead_source", LEAD_SOURCES);
export const leadChannelEnum = pgEnum("lead_channel", LEAD_CHANNELS);
export const mediaAssetKindEnum = pgEnum(
  "media_asset_kind",
  MEDIA_ASSET_KINDS,
);
export const mediaAssetOwnerTypeEnum = pgEnum(
  "media_asset_owner_type",
  MEDIA_ASSET_OWNER_TYPES,
);
export const contentBlockTypeEnum = pgEnum(
  "content_block_type",
  CONTENT_BLOCK_TYPES,
);
export const energyCertEnum = pgEnum("energy_cert", ENERGY_CERTS);
export const arsopRequestTypeEnum = pgEnum(
  "arsop_request_type",
  ARSOP_REQUEST_TYPES,
);
export const emailStatusEnum = pgEnum("email_status", EMAIL_STATUSES);
