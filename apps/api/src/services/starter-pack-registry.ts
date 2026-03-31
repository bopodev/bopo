import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listBuiltinStarterTemplates } from "./template-catalog";

const PACK_DIR = join(dirname(fileURLToPath(import.meta.url)), "../assets/starter-packs");

export type StarterPackDefinition = {
  id: string;
  label: string;
  description: string;
  filename: string;
};

/** Optional extra packs as zips only (id must not match a builtin template slug). */
export const STARTER_PACK_DEFINITIONS: StarterPackDefinition[] = [
  {
    id: "product-delivery-trio",
    label: "Product Delivery Trio",
    description:
      "CEO, Product, and Engineering with strategy, delivery, and quality projects; weekly leadership sync and release hygiene; skills for triage and RCA.",
    filename: "product-delivery-trio.zip"
  },
  {
    id: "revenue-gtm-b2b",
    label: "Revenue GTM (B2B)",
    description:
      "CEO, Head of GTM, and Pipeline Owner with pipeline, deals, and customer success projects; revenue review and pipeline hygiene loops; ICP and discovery skills.",
    filename: "revenue-gtm-b2b.zip"
  },
  {
    id: "devrel-growth",
    label: "DevRel & Growth",
    description:
      "CEO, DevRel Lead, and Technical Content Producer with docs, community, and partners projects; content planning and community health loops.",
    filename: "devrel-growth.zip"
  },
  {
    id: "customer-support-excellence",
    label: "Customer Support Excellence",
    description:
      "CEO, Support Lead, and Support Specialist with queue, knowledge base, and quality projects; daily standup and KB gap sweep loops.",
    filename: "customer-support-excellence.zip"
  }
];

export function listStarterPackMetadata(): Array<{ id: string; label: string; description: string }> {
  const fromTemplates = listBuiltinStarterTemplates();
  const builtinIds = new Set(fromTemplates.map((t) => t.id));
  const fromZips = STARTER_PACK_DEFINITIONS.filter((p) => !builtinIds.has(p.id)).map(({ id, label, description }) => ({
    id,
    label,
    description
  }));
  return [...fromTemplates, ...fromZips];
}

export function resolveStarterPackDefinition(id: string): StarterPackDefinition | null {
  return STARTER_PACK_DEFINITIONS.find((p) => p.id === id) ?? null;
}

export async function readStarterPackZipBuffer(id: string): Promise<Buffer> {
  const def = resolveStarterPackDefinition(id);
  if (!def) {
    throw new Error(`Unknown starter pack id: ${id}`);
  }
  return readFile(join(PACK_DIR, def.filename));
}
