import { randomBytes, randomInt, createHash } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { getDb, schema } from "../db/client";

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function generatePairingCode(
  orgId: string,
  deviceName = "Kiosk",
): Promise<{ code: string; expiresAt: Date }> {
  const db = getDb();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
  await db.insert(schema.pairingCodes).values({ orgId, code, deviceName, expiresAt });
  return { code, expiresAt };
}

// Redeems a pairing code for a long-lived device token. The raw token is
// returned exactly once here — only its hash is ever persisted, so a
// database read alone can't be used to impersonate a paired kiosk.
export async function redeemPairingCode(
  code: string,
): Promise<{ orgId: string; deviceId: string; token: string } | null> {
  const db = getDb();
  const now = new Date();

  const candidates = await db.query.pairingCodes.findMany({
    where: and(eq(schema.pairingCodes.code, code), isNull(schema.pairingCodes.usedAt)),
  });
  const valid = candidates.find((c) => c.expiresAt.getTime() > now.getTime());
  if (!valid) return null;

  const [claimed] = await db
    .update(schema.pairingCodes)
    .set({ usedAt: now })
    .where(and(eq(schema.pairingCodes.id, valid.id), isNull(schema.pairingCodes.usedAt)))
    .returning();
  if (!claimed) return null; // lost a race with a concurrent redemption

  const token = randomBytes(32).toString("base64url");
  const [device] = await db
    .insert(schema.devices)
    .values({ orgId: claimed.orgId, name: claimed.deviceName, tokenHash: hashToken(token) })
    .returning();

  return { orgId: device.orgId, deviceId: device.id, token };
}

export async function verifyDeviceToken(
  token: string,
): Promise<{ orgId: string; deviceId: string } | null> {
  const db = getDb();
  const device = await db.query.devices.findFirst({
    where: eq(schema.devices.tokenHash, hashToken(token)),
  });
  if (!device || device.revokedAt) return null;

  void db
    .update(schema.devices)
    .set({ lastSeenAt: new Date() })
    .where(eq(schema.devices.id, device.id))
    .then(
      () => {},
      () => {},
    );

  return { orgId: device.orgId, deviceId: device.id };
}

export async function listDevices(orgId: string) {
  const db = getDb();
  return db.query.devices.findMany({
    where: and(eq(schema.devices.orgId, orgId), isNull(schema.devices.revokedAt)),
  });
}

export async function revokeDevice(orgId: string, deviceId: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.devices)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.devices.id, deviceId), eq(schema.devices.orgId, orgId)));
}

export async function requireDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;
  if (!token) {
    res.status(401).json({ error: "Device not paired", code: "DEVICE_NOT_PAIRED" });
    return;
  }

  const device = await verifyDeviceToken(token);
  if (!device) {
    res.status(401).json({ error: "Device not paired", code: "DEVICE_NOT_PAIRED" });
    return;
  }

  req.orgId = device.orgId;
  req.deviceId = device.deviceId;
  next();
}
