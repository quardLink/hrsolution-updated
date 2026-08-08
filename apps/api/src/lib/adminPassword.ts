import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getOfficeSettings, updateOfficeSettings } from "./settings";

const ENV_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyHashed(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  try {
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Verify the supplied admin password.
 * - If a custom hash is stored in the Settings sheet (key `adminPasswordHash`), it is checked.
 * - Otherwise the legacy env-var password is accepted.
 */
export async function verifyAdminPassword(
  sheetId: string | undefined,
  supplied: string,
): Promise<boolean> {
  if (!supplied) return false;
  if (sheetId) {
    try {
      const settings = await getOfficeSettings(sheetId);
      const stored = settings.adminPasswordHash;
      if (stored) return verifyHashed(supplied, stored);
    } catch {
      // fall through to env fallback
    }
  }
  return supplied === ENV_PASSWORD;
}

export async function setAdminPassword(
  sheetId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const ok = await verifyAdminPassword(sheetId, oldPassword);
  if (!ok) throw new Error("Current password is incorrect");
  if (newPassword.length < 6) throw new Error("New password must be at least 6 characters");
  const hash = hashPassword(newPassword);
  await updateOfficeSettings(sheetId, { adminPasswordHash: hash });
}
