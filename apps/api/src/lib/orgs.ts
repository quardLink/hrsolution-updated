import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export interface Org {
  id: string;
  name: string;
  slug: string;
  logoDataUrl: string | null;
  timezone: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "firm";
}

async function uniqueSlug(name: string): Promise<string> {
  const db = getDb();
  const base = slugify(name);
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await db.query.orgs.findFirst({ where: eq(schema.orgs.slug, candidate) });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function createOrg(name: string, logoDataUrl?: string | null): Promise<Org> {
  const db = getDb();
  const slug = await uniqueSlug(name);
  const [org] = await db
    .insert(schema.orgs)
    .values({ name, slug, logoDataUrl: logoDataUrl ?? null })
    .returning();
  await db.insert(schema.orgSettings).values({ orgId: org.id });
  return org;
}

export async function getOrgById(orgId: string): Promise<Org | null> {
  const db = getDb();
  const org = await db.query.orgs.findFirst({ where: eq(schema.orgs.id, orgId) });
  return org ?? null;
}

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  const db = getDb();
  const org = await db.query.orgs.findFirst({ where: eq(schema.orgs.slug, slug) });
  return org ?? null;
}

export async function updateOrgBranding(
  orgId: string,
  updates: { name?: string; logoDataUrl?: string | null },
): Promise<Org> {
  const db = getDb();
  const [updated] = await db
    .update(schema.orgs)
    .set(updates)
    .where(eq(schema.orgs.id, orgId))
    .returning();
  return updated;
}
