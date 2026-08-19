import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export interface Role {
  value: string;
  label: string;
}

const SEED_ROLES: Role[] = [
  { value: "manager", label: "Manager" },
  { value: "purchase", label: "Purchase" },
  { value: "shop_handler", label: "Shop Handler" },
  { value: "office_manager", label: "Office Manager" },
  { value: "sales", label: "Sales" },
  { value: "accounts", label: "Accounts" },
  { value: "other", label: "Other" },
];

function normalizeValue(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "role";
}

export async function seedDefaultRoles(orgId: string): Promise<void> {
  const db = getDb();
  await db.insert(schema.roles).values(SEED_ROLES.map((r) => ({ orgId, ...r })));
}

export async function getAllRoles(orgId: string): Promise<Role[]> {
  const db = getDb();
  return db.query.roles.findMany({ where: eq(schema.roles.orgId, orgId) });
}

export async function addRole(orgId: string, role: Role): Promise<Role> {
  const db = getDb();
  const value = normalizeValue(role.value);
  const existing = await db.query.roles.findFirst({
    where: and(eq(schema.roles.orgId, orgId), eq(schema.roles.value, value)),
  });
  if (existing) throw new Error(`Role "${value}" already exists`);

  const label = role.label.trim() || value;
  await db.insert(schema.roles).values({ orgId, value, label });
  return { value, label };
}

export async function updateRole(
  orgId: string,
  oldValue: string,
  updates: Partial<Role>,
): Promise<Role> {
  const db = getDb();
  const existing = await db.query.roles.findFirst({
    where: and(eq(schema.roles.orgId, orgId), eq(schema.roles.value, oldValue)),
  });
  if (!existing) throw new Error(`Role "${oldValue}" not found`);

  // Renaming a role's value means moving to a new primary key — delete +
  // insert in place of an UPDATE on the key column.
  const newValue = updates.value ? normalizeValue(updates.value) : existing.value;
  const newLabel = updates.label?.trim() || existing.label;

  if (newValue !== existing.value) {
    await db
      .delete(schema.roles)
      .where(and(eq(schema.roles.orgId, orgId), eq(schema.roles.value, existing.value)));
    await db.insert(schema.roles).values({ orgId, value: newValue, label: newLabel });
  } else {
    await db
      .update(schema.roles)
      .set({ label: newLabel })
      .where(and(eq(schema.roles.orgId, orgId), eq(schema.roles.value, existing.value)));
  }

  return { value: newValue, label: newLabel };
}

export async function deleteRole(orgId: string, value: string): Promise<void> {
  const db = getDb();
  const existing = await db.query.roles.findFirst({
    where: and(eq(schema.roles.orgId, orgId), eq(schema.roles.value, value)),
  });
  if (!existing) throw new Error(`Role "${value}" not found`);
  await db.delete(schema.roles).where(and(eq(schema.roles.orgId, orgId), eq(schema.roles.value, value)));
}
