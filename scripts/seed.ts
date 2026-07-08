import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import * as schema from "../src/infrastructure/db/schema";
import type { EnergyCert, UnitStatus, ContentBlockType } from "../src/shared/constants/db-enums";

// ─── Load .env.local if present (tsx does not auto-load env files) ──────
// Manual parser instead of tsx --env-file because the seed script may be
// invoked via `node -r tsx scripts/seed.ts` (which ignores --env-file).
const envLocalPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ─── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_ISLAND = "Tenerife";
const DEMO_EMAIL_DOMAIN = "@domio.dev";
const PASSWORD_HASH_SALT_ROUNDS = 10;
// eslint-disable-next-line sonarjs/no-hardcoded-passwords -- demo password for dev seed
const DEMO_PASSWORD = "Domio2026!";
const TENANT_SLUG = "domio";

// ─── DB client ─────────────────────────────────────────────────────────────────

async function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not defined");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const USER_SEED = [
  { email: `admin${DEMO_EMAIL_DOMAIN}`, role: "ADMIN" as const, name: "Admin Domio" },
  { email: `agente1${DEMO_EMAIL_DOMAIN}`, role: "AGENT" as const, name: "Ana García" },
  { email: `agente2${DEMO_EMAIL_DOMAIN}`, role: "AGENT" as const, name: "Carlos Pérez" },
  { email: `operador1${DEMO_EMAIL_DOMAIN}`, role: "OPERATOR" as const, name: "Laura Rodríguez" },
  { email: `operador2${DEMO_EMAIL_DOMAIN}`, role: "OPERATOR" as const, name: "Miguel Fernández" },
];

/* eslint-disable sonarjs/no-duplicate-string */
const PROMOCION_SEED = [
  {
    slug: "residencial-las-americas",
    name: "Residencial Las Américas",
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "piso" as const,
    constructionStatus: "ON_PLAN" as const,
    island: DEFAULT_ISLAND,
    municipality: "Adeje",
    address: "Avenida de las Américas, 15",
    location: [-16.7240, 28.1246] as [number, number],
    locationApprox: [-16.7190, 28.1196] as [number, number],
    mapPrivacyMode: "AREA" as const,
    seoTitle: "Residencial Las Américas | Domio",
    seoDescription:
      "Nuevo residencial de obra nueva en Adeje, Tenerife. Pisos de 2 y 3 dormitorios con vistas al océano.",
    assignedAgentEmail: "agente1@domio.dev",
  },
  {
    slug: "apartamentos-costa-adeje",
    name: "Apartamentos Costa Adeje",
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "piso" as const,
    constructionStatus: "IN_CONSTRUCTION" as const,
    island: DEFAULT_ISLAND,
    municipality: "Adeje",
    address: "Calle la Arena, 32",
    location: [-16.7290, 28.1190] as [number, number],
    locationApprox: [-16.7240, 28.1140] as [number, number],
    mapPrivacyMode: "EXACT" as const,
    seoTitle: "Apartamentos Costa Adeje | Domio",
    seoDescription:
      "Apartamentos en construcción en Costa Adeje, Tenerife. Con piscina comunitaria y zonas verdes.",
    assignedAgentEmail: "agente2@domio.dev",
  },
  {
    slug: "villas-la-laguna",
    name: "Villas La Laguna",
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "chalet" as const,
    constructionStatus: "READY" as const,
    island: DEFAULT_ISLAND,
    municipality: "La Laguna",
    address: "Camino de la Villa, 8",
    location: [-16.3155, 28.4872] as [number, number],
    locationApprox: [-16.3105, 28.4822] as [number, number],
    mapPrivacyMode: "EXACT" as const,
    seoTitle: "Villas La Laguna | Domio",
    seoDescription:
      "Exclusivas villas unifamiliares en La Laguna, Tenerife. Entrega inmediata.",
    assignedAgentEmail: "agente1@domio.dev",
  },
  {
    slug: "pisos-santa-cruz-centro",
    name: "Pisos Santa Cruz Centro",
    kind: "portfolio" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "piso" as const,
    constructionStatus: "READY" as const,
    island: DEFAULT_ISLAND,
    municipality: "Santa Cruz",
    address: "Calle Castillo, 23",
    location: [-16.2546, 28.4682] as [number, number],
    locationApprox: [-16.2496, 28.4632] as [number, number],
    mapPrivacyMode: "AREA" as const,
    seoTitle: "Pisos Santa Cruz Centro | Domio",
    seoDescription:
      "Pisos céntricos en Santa Cruz de Tenerife. Entrega inmediata, lista para entrar a vivir.",
    assignedAgentEmail: "agente2@domio.dev",
  },
  {
    slug: "atico-santa-cruz-mar",
    name: "Ático Santa Cruz Mar",
    kind: "external" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "ático" as const,
    constructionStatus: "READY" as const,
    island: DEFAULT_ISLAND,
    municipality: "Santa Cruz",
    address: "Avenida Marítima, 7",
    location: [-16.2500, 28.4650] as [number, number],
    locationApprox: [-16.2450, 28.4600] as [number, number],
    mapPrivacyMode: "EXACT" as const,
    seoTitle: "Ático Santa Cruz Mar | Domio",
    seoDescription:
      "Impresionante ático con vistas al mar en Santa Cruz de Tenerife.",
    assignedAgentEmail: "agente1@domio.dev",
  },
  {
    slug: "casa-arona-sur",
    name: "Casa Arona Sur",
    kind: "external" as const,
    status: "PUBLISHED" as const,
    operation: "SALE" as const,
    propertyType: "casa" as const,
    constructionStatus: "READY" as const,
    island: DEFAULT_ISLAND,
    municipality: "Arona",
    address: "Calle del Sur, 45",
    location: [-16.7162, 28.0986] as [number, number],
    locationApprox: [-16.7112, 28.0936] as [number, number],
    mapPrivacyMode: "AREA" as const,
    seoTitle: "Casa Arona Sur | Domio",
    seoDescription:
      "Casa independiente en Arona, Tenerife. Excelente ubicación cerca de servicios.",
    assignedAgentEmail: "agente2@domio.dev",
  },
  {
    slug: "local-comercial-la-laguna",
    name: "Local Comercial La Laguna",
    kind: "external" as const,
    status: "PUBLISHED" as const,
    operation: "RENT" as const,
    propertyType: "local" as const,
    constructionStatus: "READY" as const,
    island: DEFAULT_ISLAND,
    municipality: "La Laguna",
    address: "Calle Herradores, 12",
    location: [-16.3190, 28.4890] as [number, number],
    locationApprox: [-16.3140, 28.4840] as [number, number],
    mapPrivacyMode: "EXACT" as const,
    seoTitle: "Local Comercial La Laguna | Domio",
    seoDescription:
      "Local comercial en alquiler en La Laguna, Tenerife. Alto tránsito peatonal.",
    assignedAgentEmail: "agente1@domio.dev",
  },
  {
    slug: "oficina-santa-cruz-business",
    name: "Oficina Santa Cruz Business",
    kind: "external" as const,
    status: "PUBLISHED" as const,
    operation: "RENT" as const,
    propertyType: "oficina" as const,
    constructionStatus: "READY" as const,
    island: DEFAULT_ISLAND,
    municipality: "Santa Cruz",
    address: "Avenida de la Economía, 5",
    location: [-16.2480, 28.4620] as [number, number],
    locationApprox: [-16.2430, 28.4570] as [number, number],
    mapPrivacyMode: "AREA" as const,
    seoTitle: "Oficina Santa Cruz Business | Domio",
    seoDescription:
      "Oficina en alquiler en zona business de Santa Cruz de Tenerife.",
    assignedAgentEmail: "agente2@domio.dev",
  },
];

interface TipologiaSeed {
  name: string;
  usefulArea: number | null;
  builtArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  energyCert: string;
  referencePriceSale: number | null;
  referencePriceRent: number | null;
  units: { identifier: string; status: string }[];
}

const TIPOLOGIAS_BY_SLUG: Record<string, TipologiaSeed[]> = {
  "residencial-las-americas": [
    {
      name: "2 dormitorios",
      usefulArea: 65, builtArea: 78, bedrooms: 2, bathrooms: 1,
      amenities: ["terraza", "garaje", "aire_acondicionado"],
      energyCert: "A",
      referencePriceSale: 185000, referencePriceRent: null,
      units: [
        { identifier: "A-101", status: "AVAILABLE" },
        { identifier: "A-102", status: "AVAILABLE" },
        { identifier: "A-103", status: "RESERVED" },
      ],
    },
    {
      name: "3 dormitorios",
      usefulArea: 85, builtArea: 100, bedrooms: 3, bathrooms: 2,
      amenities: ["terraza", "garaje", "aire_acondicionado", "ascensor"],
      energyCert: "A",
      referencePriceSale: 240000, referencePriceRent: null,
      units: [
        { identifier: "B-201", status: "AVAILABLE" },
        { identifier: "B-202", status: "AVAILABLE" },
        { identifier: "B-203", status: "AVAILABLE" },
        { identifier: "B-204", status: "SOLD" },
      ],
    },
    {
      name: "Ático 3 dormitorios",
      usefulArea: 100, builtArea: 120, bedrooms: 3, bathrooms: 2,
      amenities: ["terraza", "garaje", "aire_acondicionado", "ascensor", "piscina"],
      energyCert: "A",
      referencePriceSale: 295000, referencePriceRent: null,
      units: [
        { identifier: "C-301", status: "AVAILABLE" },
        { identifier: "C-302", status: "RESERVED" },
        { identifier: "C-303", status: "AVAILABLE" },
      ],
    },
  ],
  "apartamentos-costa-adeje": [
    {
      name: "1 dormitorio",
      usefulArea: 45, builtArea: 55, bedrooms: 1, bathrooms: 1,
      amenities: ["terraza", "piscina", "aire_acondicionado"],
      energyCert: "B",
      referencePriceSale: 145000, referencePriceRent: null,
      units: [
        { identifier: "1-A", status: "AVAILABLE" },
        { identifier: "1-B", status: "AVAILABLE" },
      ],
    },
    {
      name: "2 dormitorios",
      usefulArea: 70, builtArea: 85, bedrooms: 2, bathrooms: 1,
      amenities: ["terraza", "piscina", "garaje", "aire_acondicionado"],
      energyCert: "B",
      referencePriceSale: 195000, referencePriceRent: null,
      units: [
        { identifier: "2-A", status: "AVAILABLE" },
        { identifier: "2-B", status: "RESERVED" },
        { identifier: "2-C", status: "AVAILABLE" },
      ],
    },
  ],
  "villas-la-laguna": [
    {
      name: "Villa 4 dormitorios",
      usefulArea: 150, builtArea: 180, bedrooms: 4, bathrooms: 3,
      amenities: ["terraza", "garaje", "piscina", "zonas_verdes", "calefacción"],
      energyCert: "C",
      referencePriceSale: 450000, referencePriceRent: null,
      units: [
        { identifier: "V-1", status: "AVAILABLE" },
        { identifier: "V-2", status: "SOLD" },
      ],
    },
    {
      name: "Villa 3 dormitorios",
      usefulArea: 120, builtArea: 145, bedrooms: 3, bathrooms: 2,
      amenities: ["terraza", "garaje", "zonas_verdes", "calefacción"],
      energyCert: "C",
      referencePriceSale: 380000, referencePriceRent: null,
      units: [
        { identifier: "V-3", status: "AVAILABLE" },
        { identifier: "V-4", status: "RESERVED" },
      ],
    },
  ],
  "pisos-santa-cruz-centro": [
    {
      name: "2 dormitorios",
      usefulArea: 60, builtArea: 72, bedrooms: 2, bathrooms: 1,
      amenities: ["ascensor", "calefacción"],
      energyCert: "D",
      referencePriceSale: 165000, referencePriceRent: null,
      units: [
        { identifier: "SC-1", status: "AVAILABLE" },
        { identifier: "SC-2", status: "AVAILABLE" },
      ],
    },
    {
      name: "3 dormitorios",
      usefulArea: 80, builtArea: 95, bedrooms: 3, bathrooms: 2,
      amenities: ["ascensor", "calefacción", "terraza"],
      energyCert: "D",
      referencePriceSale: 215000, referencePriceRent: null,
      units: [
        { identifier: "SC-3", status: "AVAILABLE" },
        { identifier: "SC-4", status: "SOLD" },
        { identifier: "SC-5", status: "AVAILABLE" },
      ],
    },
  ],
  "atico-santa-cruz-mar": [
    {
      name: "Ático 3 dormitorios",
      usefulArea: 110, builtArea: 130, bedrooms: 3, bathrooms: 2,
      amenities: ["terraza", "ascensor", "garaje", "aire_acondicionado"],
      energyCert: "C",
      referencePriceSale: 350000, referencePriceRent: null,
      units: [
        { identifier: "AT-1", status: "AVAILABLE" },
        { identifier: "AT-2", status: "AVAILABLE" },
      ],
    },
  ],
  "casa-arona-sur": [
    {
      name: "Casa 3 dormitorios",
      usefulArea: 95, builtArea: 115, bedrooms: 3, bathrooms: 2,
      amenities: ["terraza", "garaje", "zonas_verdes"],
      energyCert: "E",
      referencePriceSale: 220000, referencePriceRent: null,
      units: [
        { identifier: "CA-1", status: "AVAILABLE" },
        { identifier: "CA-4", status: "AVAILABLE" },
      ],
    },
    {
      name: "Casa 2 dormitorios",
      usefulArea: 75, builtArea: 90, bedrooms: 2, bathrooms: 1,
      amenities: ["terraza", "garaje"],
      energyCert: "E",
      referencePriceSale: 175000, referencePriceRent: null,
      units: [
        { identifier: "CA-2", status: "AVAILABLE" },
        { identifier: "CA-3", status: "RESERVED" },
      ],
    },
  ],
  "local-comercial-la-laguna": [
    {
      name: "Local 50m²",
      usefulArea: 50, builtArea: 55, bedrooms: 0, bathrooms: 1,
      amenities: [],
      energyCert: "EN_TRAMITE",
      referencePriceSale: null, referencePriceRent: 800,
      units: [
        { identifier: "LC-1", status: "AVAILABLE" },
        { identifier: "LC-3", status: "AVAILABLE" },
      ],
    },
    {
      name: "Local 80m²",
      usefulArea: 80, builtArea: 88, bedrooms: 0, bathrooms: 1,
      amenities: ["accesible"],
      energyCert: "EN_TRAMITE",
      referencePriceSale: null, referencePriceRent: 1200,
      units: [
        { identifier: "LC-2", status: "AVAILABLE" },
        { identifier: "LC-4", status: "RENTED" },
      ],
    },
  ],
  "oficina-santa-cruz-business": [
    {
      name: "Oficina 40m²",
      usefulArea: 40, builtArea: 45, bedrooms: 0, bathrooms: 1,
      amenities: ["ascensor", "accesible", "calefacción"],
      energyCert: "B",
      referencePriceSale: null, referencePriceRent: 650,
      units: [
        { identifier: "OF-1", status: "AVAILABLE" },
        { identifier: "OF-4", status: "AVAILABLE" },
      ],
    },
    {
      name: "Oficina 70m²",
      usefulArea: 70, builtArea: 78, bedrooms: 0, bathrooms: 1,
      amenities: ["ascensor", "accesible", "calefacción", "aire_acondicionado"],
      energyCert: "B",
      referencePriceSale: null, referencePriceRent: 1100,
      units: [
        { identifier: "OF-2", status: "AVAILABLE" },
        { identifier: "OF-3", status: "AVAILABLE" },
      ],
    },
  ],
};

function getContentBlocks(
  promocionName: string,
  kind: string,
): { blockType: string; payload: Record<string, unknown>; sortOrder: number }[] {
  const blocks: ReturnType<typeof getContentBlocks> = [
    {
      blockType: "DESCRIPCION_GENERAL",
      payload: {
        text: `${promocionName} es un proyecto residencial de alta calidad ubicado en Tenerife, Canarias. Disfrute de viviendas diseñadas con los más altos estándares de confort y eficiencia energética, en un entorno privilegiado.`,
      },
      sortOrder: 0,
    },
    {
      blockType: "MEMORIA_CALIDADES",
      payload: {
        items: [
          {
            title: "Suelos",
            description: "Porcelánico rectificado 60x60 de alta resistencia",
            icon: "floor",
          },
          {
            title: "Carpintería exterior",
            description:
              "Aluminio con rotura de puente térmico y doble acristalamiento",
            icon: "window",
          },
          {
            title: "Climatización",
            description:
              "Sistema de aerotermia con suelo radiante refrescante",
            icon: "climate",
          },
        ],
      },
      sortOrder: 1,
    },
  ];

  if (kind === "portfolio") {
    blocks.push({
      blockType: "ZONAS_COMUNES",
      payload: {
        items: [
          {
            name: "Piscina comunitaria",
            description: "Piscina para adultos e infantil con solárium",
          },
          {
            name: "Zonas ajardinadas",
            description: "Jardines comunitarios con riego automatizado",
          },
        ],
      },
      sortOrder: 2,
    });
    blocks.push({
      blockType: "PLAZOS_GARANTIAS",
      payload: {
        delivery: "Q4 2026",
        license: "Licencia municipal concedida",
        guarantee: "10 años de seguro decenal",
        audit: "Auditoría técnica externa",
      },
      sortOrder: 4,
    });
  }

  blocks.push({
    blockType: "UBICACION_SERVICIOS",
    payload: {
      items: [
        { service: "Supermercado", distance: "200m" },
        { service: "Colegio", distance: "500m" },
        { service: "Parada de guagua", distance: "100m" },
        { service: "Centro de salud", distance: "800m" },
      ],
    },
    sortOrder: 3,
  });

  return blocks;
}

const LEAD_SEED = [
  {
    name: "Juan López",
    email: "juan@example.com",
    phone: "+34 611 111 111",
    message: "Me interesa recibir más información sobre las promociones en Adeje.",
    source: "commercial" as const,
    channel: "FORM" as const,
    status: "NEW" as const,
    promocionSlug: "residencial-las-americas",
    assignedAgentEmail: "agente1@domio.dev",
  },
  {
    name: "María Torres",
    email: "maria@example.com",
    phone: "+34 622 222 222",
    message: "Quisiera visitar las villas de La Laguna.",
    source: "commercial" as const,
    channel: "FORM" as const,
    status: "CONTACTED" as const,
    promocionSlug: "villas-la-laguna",
    assignedAgentEmail: "agente2@domio.dev",
  },
  {
    name: "Pedro Sánchez",
    email: "pedro@example.com",
    phone: "+34 633 333 333",
    message:
      "Soy inversor institucional, busco varias unidades en Santa Cruz.",
    source: "institutional" as const,
    channel: "FORM" as const,
    status: "IN_NEGOTIATION" as const,
    promocionSlug: "pisos-santa-cruz-centro",
    assignedAgentEmail: "agente1@domio.dev",
  },
  {
    name: "Laura Martín",
    email: "laura@example.com",
    phone: "+34 644 444 444",
    message: "Confirmo mi interés en el piso de Costa Adeje.",
    source: "commercial" as const,
    channel: "WHATSAPP" as const,
    status: "WON" as const,
    promocionSlug: "apartamentos-costa-adeje",
    assignedAgentEmail: "agente2@domio.dev",
  },
  {
    name: "Roberto Díaz",
    email: "roberto@example.com",
    phone: "+34 655 555 555",
    message: "He encontrado otra opción, pero gracias.",
    source: "commercial" as const,
    channel: "FORM" as const,
    status: "LOST" as const,
    promocionSlug: "casa-arona-sur",
    assignedAgentEmail: "agente1@domio.dev",
  },
];
/* eslint-enable sonarjs/no-duplicate-string */

// ─── Seed function (CLI entry point) ─────────────────────────────────────────────

async function seed() {
  const { db, pool } = await getDb();
  try {
    await runSeed(db);
  } finally {
    await pool.end();
  }
}

// ─── Step helpers (one per phase, keeps runSeed cognitive complexity low) ──────

const TENANT_SEED_UUID = "00000000-0000-0000-0000-000000000001";

async function stepTenant(
  db: NodePgDatabase<typeof schema>,
): Promise<string> {
  console.log("  [1/8] Tenant...");
  await db
    .insert(schema.tenants)
    .values({
      id: TENANT_SEED_UUID,
      slug: TENANT_SLUG,
      name: "Domio Inmobiliaria",
      config: {},
    })
    .onConflictDoNothing({ target: schema.tenants.slug });

  const [tenantRow] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, TENANT_SLUG))
    .limit(1);
  if (!tenantRow) throw new Error("Tenant not found");
  console.log(`    Tenant ID: ${tenantRow.id}`);
  return tenantRow.id;
}

async function stepUsers(
  tx: Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0],
  tid: string,
  passwordHash: string,
): Promise<Record<string, string>> {
  console.log("  [2/8] Users...");
  const userMap: Record<string, string> = {};

  for (const u of USER_SEED) {
    const [user] = await tx
      .insert(schema.users)
      .values({ tenantId: tid, email: u.email, passwordHash, name: u.name, role: u.role })
      .onConflictDoNothing({ target: [schema.users.tenantId, schema.users.email] })
      .returning({ id: schema.users.id });

    if (user) {
      userMap[u.email] = user.id;
    } else {
      const [existing] = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(and(eq(schema.users.tenantId, tid), eq(schema.users.email, u.email)))
        .limit(1);
      if (!existing) throw new Error(`User not found: ${u.email}`);
      userMap[u.email] = existing.id;
    }
  }
  console.log(`    ${USER_SEED.length} users ready.`);
  return userMap;
}

async function stepPromociones(
  tx: Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0],
  tid: string,
  userMap: Record<string, string>,
): Promise<Record<string, string>> {
  console.log("  [3/8] Promociones...");
  const promMap: Record<string, string> = {};

  for (const p of PROMOCION_SEED) {
    const [prom] = await tx
      .insert(schema.promociones)
      .values({
        tenantId: tid,
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        status: p.status,
        operation: p.operation,
        propertyType: p.propertyType,
        constructionStatus: p.constructionStatus,
        island: p.island,
        municipality: p.municipality,
        address: p.address,
        location: p.location,
        locationApprox: p.locationApprox,
        mapPrivacyMode: p.mapPrivacyMode,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        assignedAgentId: userMap[p.assignedAgentEmail],
      })
      .onConflictDoNothing({ target: [schema.promociones.tenantId, schema.promociones.slug] })
      .returning({ id: schema.promociones.id });

    if (prom) {
      promMap[p.slug] = prom.id;
    } else {
      const [existing] = await tx
        .select({ id: schema.promociones.id })
        .from(schema.promociones)
        .where(and(eq(schema.promociones.tenantId, tid), eq(schema.promociones.slug, p.slug)))
        .limit(1);
      if (!existing) throw new Error(`Promocion not found: ${p.slug}`);
      promMap[p.slug] = existing.id;
    }
  }
  console.log(`    ${PROMOCION_SEED.length} promociones ready.`);
  return promMap;
}

async function stepTipologias(
  tx: Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0],
  tid: string,
  promMap: Record<string, string>,
): Promise<void> {
  console.log("  [4/8] Tipologias y unidades...");
  let tipoCount = 0;
  let unitCount = 0;

  for (const p of PROMOCION_SEED) {
    const tipologias = TIPOLOGIAS_BY_SLUG[p.slug];
    if (!tipologias) continue;
    for (const t of tipologias) {
      const [tipo] = await tx
        .insert(schema.tipologias)
        .values({
          tenantId: tid,
          promocionId: promMap[p.slug]!,
          name: t.name,
          usefulArea: t.usefulArea,
          builtArea: t.builtArea,
          bedrooms: t.bedrooms,
          bathrooms: t.bathrooms,
          energyCert: t.energyCert as EnergyCert,
          referencePriceSale: t.referencePriceSale,
          referencePriceRent: t.referencePriceRent,
          amenities: t.amenities,
        })
        .returning({ id: schema.tipologias.id });

      if (!tipo) continue;
      tipoCount++;

      for (const u of t.units) {
        await tx
          .insert(schema.unidades)
          .values({ tenantId: tid, tipologiaId: tipo.id, identifier: u.identifier, status: u.status as UnitStatus });
        unitCount++;
      }
    }
  }
  console.log(`    ${tipoCount} tipologias, ${unitCount} unidades.`);
}

async function stepContentBlocks(
  tx: Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0],
  tid: string,
  promMap: Record<string, string>,
): Promise<void> {
  console.log("  [5/8] Content blocks...");
  let blockCount = 0;

  for (const p of PROMOCION_SEED) {
    const blocks = getContentBlocks(p.name, p.kind);
    for (const b of blocks) {
      await tx
        .insert(schema.promocionContentBlocks)
        .values({
          tenantId: tid,
          promocionId: promMap[p.slug]!,
          blockType: b.blockType as ContentBlockType,
          payload: b.payload,
          sortOrder: b.sortOrder,
        });
      blockCount++;
    }
  }
  console.log(`    ${blockCount} content blocks.`);
}

async function stepMediaAssets(
  tx: Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0],
  tid: string,
  promMap: Record<string, string>,
): Promise<void> {
  console.log("  [6/8] Media assets...");
  let assetCount = 0;

  for (const p of PROMOCION_SEED) {
    const promId = promMap[p.slug]!;

    await tx
      .insert(schema.mediaAssets)
      .values({
        tenantId: tid,
        ownerType: "PROMOCION",
        ownerId: promId,
        kind: "IMAGE_GALLERY",
        r2Key: "placeholder/image-1.jpg",
        mimeType: "image/jpeg",
        altText: `${p.name} — imagen principal`,
        sortOrder: 0,
        isCover: true,
      });
    assetCount++;

    await tx
      .insert(schema.mediaAssets)
      .values({
        tenantId: tid,
        ownerType: "PROMOCION",
        ownerId: promId,
        kind: "IMAGE_GALLERY",
        r2Key: "placeholder/image-2.jpg",
        mimeType: "image/jpeg",
        altText: `${p.name} — vista general`,
        sortOrder: 1,
        isCover: false,
      });
    assetCount++;
  }
  console.log(`    ${assetCount} media assets.`);
}

async function stepLeads(
  tx: Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0],
  tid: string,
  promMap: Record<string, string>,
  userMap: Record<string, string>,
): Promise<void> {
  console.log("  [7/8] Leads...");
  let leadCount = 0;

  for (const l of LEAD_SEED) {
    const promId = promMap[l.promocionSlug];
    if (!promId) continue;

    const [lead] = await tx
      .insert(schema.leads)
      .values({
        tenantId: tid,
        promocionId: promId,
        tipologiaId: null,
        source: l.source,
        channel: l.channel,
        name: l.name,
        email: l.email,
        phone: l.phone,
        message: l.message,
        status: l.status,
        assignedAgentId: userMap[l.assignedAgentEmail],
      })
      .returning({ id: schema.leads.id });

    if (lead) {
      leadCount++;
      await tx
        .insert(schema.consentRecords)
        .values({
          tenantId: tid,
          leadId: lead.id,
          legalBasis: "RGPD consentimiento explícito",
          textAccepted: "He leído y acepto la política de privacidad de Domio Inmobiliaria.",
          ip: "127.0.0.1",
          userAgent: "seed-script",
        });
    }
  }
  console.log(`    ${leadCount} leads.`);
}

async function stepContactConfig(
  tx: Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0],
  tid: string,
): Promise<void> {
  console.log("  [8/8] Contact config...");
  await tx
    .insert(schema.contactConfig)
    .values({
      tenantId: tid,
      phone: "+34 922 123 456",
      email: "info@domio.dev",
      address: "Calle Castillo 42, 38002 Santa Cruz de Tenerife",
      hours: "Lun-Vie 9:00-18:00",
      whatsappNumber: "+34 622 987 654",
      whatsappPrefilledMessage:
        "Hola, me gustaría recibir información sobre sus propiedades.",
    })
    .onConflictDoNothing({ target: schema.contactConfig.tenantId });

  console.log("    Contact config created.");
}

// ─── Core seed logic (accepts injected db for testability) ──────────────────

async function runSeed(db: NodePgDatabase<typeof schema>): Promise<void> {
  try {
    console.log("Starting seed...");

    // Step 1: Tenant (no RLS — tenants table has no tenant_id)
    const tid = await stepTenant(db);

    // Check if already seeded (within a mini-transaction for RLS context)
    const alreadySeeded = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tid}, true)`);
      const [existingPromos] = await tx
        .select({ count: sql<string>`count(*)::text` })
        .from(schema.promociones)
        .where(eq(schema.promociones.tenantId, tid));
      return existingPromos && parseInt(existingPromos.count, 10) >= 8;
    });

    if (alreadySeeded) {
      console.log("Seed data already exists for this tenant. Skipping.");
      console.log("Seed completed successfully!");
      return;
    }

    // Steps 2-8 in a single transaction with tenant context
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, PASSWORD_HASH_SALT_ROUNDS);

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tid}, true)`);

      const userMap = await stepUsers(tx, tid, passwordHash);
      const promMap = await stepPromociones(tx, tid, userMap);
      await stepTipologias(tx, tid, promMap);
      await stepContentBlocks(tx, tid, promMap);
      await stepMediaAssets(tx, tid, promMap);
      await stepLeads(tx, tid, promMap, userMap);
      await stepContactConfig(tx, tid);
    });

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  }
}

export { seed, runSeed };

// Allow direct execution: `tsx scripts/seed.ts`
// Only runs when this file is the entry point (not when imported by tests)
const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith("/seed.ts") || process.argv[1].endsWith("\\seed.ts"));
if (isMainModule) {
  seed().catch(() => process.exit(1));
}
