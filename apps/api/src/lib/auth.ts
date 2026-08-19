import { eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";
import { hashSecret, verifySecret } from "./crypto";
import { createOrg, type Org } from "./orgs";
import { seedDefaultRoles } from "./roles";

export interface AdminUser {
  id: string;
  orgId: string;
  email: string;
  name: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signup(params: {
  name: string;
  email: string;
  password: string;
  orgName: string;
  logoDataUrl?: string | null;
}): Promise<{ org: Org; adminUser: AdminUser }> {
  const email = normalizeEmail(params.email);
  if (!email || !email.includes("@")) throw new Error("A valid email is required");
  if (params.password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!params.orgName.trim()) throw new Error("Firm name is required");

  const db = getDb();
  const existing = await db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.email, email) });
  if (existing) throw new Error("An account with this email already exists");

  const org = await createOrg(params.orgName.trim(), params.logoDataUrl);
  await seedDefaultRoles(org.id);
  const [adminUser] = await db
    .insert(schema.adminUsers)
    .values({
      orgId: org.id,
      email,
      passwordHash: hashSecret(params.password),
      name: params.name.trim() || email,
    })
    .returning();

  return { org, adminUser };
}

export async function login(email: string, password: string): Promise<AdminUser | null> {
  const db = getDb();
  const user = await db.query.adminUsers.findFirst({
    where: eq(schema.adminUsers.email, normalizeEmail(email)),
  });
  if (!user) return null;
  if (!verifySecret(password, user.passwordHash)) return null;
  return { id: user.id, orgId: user.orgId, email: user.email, name: user.name };
}

export async function getAdminUser(adminUserId: string): Promise<AdminUser | null> {
  const db = getDb();
  const user = await db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.id, adminUserId) });
  if (!user) return null;
  return { id: user.id, orgId: user.orgId, email: user.email, name: user.name };
}

export async function changeAdminPassword(
  adminUserId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const db = getDb();
  const user = await db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.id, adminUserId) });
  if (!user || !verifySecret(oldPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect");
  }
  if (newPassword.length < 8) throw new Error("New password must be at least 8 characters");
  await db
    .update(schema.adminUsers)
    .set({ passwordHash: hashSecret(newPassword) })
    .where(eq(schema.adminUsers.id, adminUserId));
}
