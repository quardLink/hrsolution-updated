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

const PRIVATE_IP = /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::ffff:127\.|::ffff:10\.)/;

// Best-effort city/country lookup for a device's IP, resolved once at
// pairing time so an admin can tell paired machines apart without staring
// at raw addresses. Never throws — pairing must succeed even if this
// lookup is slow, rate-limited, or the IP is unresolvable (localhost,
// private network, lookup service down, etc).
async function resolveIpLocation(ip: string | undefined): Promise<string | null> {
  if (!ip || PRIVATE_IP.test(ip)) return null;
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,country`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status: string; city?: string; country?: string };
    if (data.status !== "success") return null;
    return [data.city, data.country].filter(Boolean).join(", ") || null;
  } catch {
    return null;
  }
}

export async function generatePairingCode(
  orgId: string,
  deviceName = "Kiosk",
  employeeCode?: string,
): Promise<{ code: string; expiresAt: Date }> {
  const db = getDb();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
  await db.insert(schema.pairingCodes).values({ orgId, code, deviceName, employeeCode, expiresAt });
  return { code, expiresAt };
}

// Redeems a pairing code for a long-lived device token. The raw token is
// returned exactly once here — only its hash is ever persisted, so a
// database read alone can't be used to impersonate a paired kiosk.
export async function redeemPairingCode(
  code: string,
  meta: { userAgent?: string; ip?: string } = {},
): Promise<{ orgId: string; deviceId: string; token: string; employeeCode: string | null } | null> {
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

  // "One paired phone per employee" — pairing a new phone replaces
  // whatever previously held this employeeCode, rather than leaving two
  // live tokens able to punch for the same person.
  if (claimed.employeeCode) {
    await db
      .update(schema.devices)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.devices.orgId, claimed.orgId),
          eq(schema.devices.employeeCode, claimed.employeeCode),
          isNull(schema.devices.revokedAt),
        ),
      );
  }

  const token = randomBytes(32).toString("base64url");
  const pairedLocation = await resolveIpLocation(meta.ip);
  const [device] = await db
    .insert(schema.devices)
    .values({
      orgId: claimed.orgId,
      name: claimed.deviceName,
      tokenHash: hashToken(token),
      userAgent: meta.userAgent,
      pairedIp: meta.ip,
      pairedLocation,
      lastSeenIp: meta.ip,
      employeeCode: claimed.employeeCode,
    })
    .returning();

  return { orgId: device.orgId, deviceId: device.id, token, employeeCode: device.employeeCode };
}

export async function verifyDeviceToken(
  token: string,
  meta: { ip?: string } = {},
): Promise<{ orgId: string; deviceId: string; employeeCode: string | null } | null> {
  const db = getDb();
  const device = await db.query.devices.findFirst({
    where: eq(schema.devices.tokenHash, hashToken(token)),
  });
  if (!device || device.revokedAt) return null;

  void db
    .update(schema.devices)
    .set({ lastSeenAt: new Date(), ...(meta.ip ? { lastSeenIp: meta.ip } : {}) })
    .where(eq(schema.devices.id, device.id))
    .then(
      () => {},
      () => {},
    );

  return { orgId: device.orgId, deviceId: device.id, employeeCode: device.employeeCode };
}

// Kiosk devices only (Settings → Devices) — an employee's personal
// remote-checkin phone is a different concept, shown instead on that
// employee's own record (see getEmployeeDevice).
export async function listDevices(orgId: string) {
  const db = getDb();
  return db.query.devices.findMany({
    where: and(eq(schema.devices.orgId, orgId), isNull(schema.devices.revokedAt), isNull(schema.devices.employeeCode)),
  });
}

export async function getEmployeeDevice(orgId: string, employeeCode: string) {
  const db = getDb();
  return db.query.devices.findFirst({
    where: and(
      eq(schema.devices.orgId, orgId),
      eq(schema.devices.employeeCode, employeeCode),
      isNull(schema.devices.revokedAt),
    ),
  });
}

export async function revokeDevice(orgId: string, deviceId: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.devices)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.devices.id, deviceId), eq(schema.devices.orgId, orgId)));
}

// The name is only ever set once, at pairing time (typed in before
// generating the code, or defaulted to "Kiosk") — this is the only way to
// change it afterward.
export async function renameDevice(orgId: string, deviceId: string, name: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.devices)
    .set({ name })
    .where(and(eq(schema.devices.id, deviceId), eq(schema.devices.orgId, orgId)));
}

export async function requireDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;
  if (!token) {
    res.status(401).json({ error: "Device not paired", code: "DEVICE_NOT_PAIRED" });
    return;
  }

  const device = await verifyDeviceToken(token, { ip: req.ip });
  if (!device) {
    res.status(401).json({ error: "Device not paired", code: "DEVICE_NOT_PAIRED" });
    return;
  }

  req.orgId = device.orgId;
  req.deviceId = device.deviceId;
  req.pairedEmployeeCode = device.employeeCode;
  next();
}

// Same as requireDeviceToken, plus rejecting an employee's personal
// remote-checkin phone — the kiosk endpoints assume a shared device
// anyone at the office can use, which a personal phone token was
// deliberately scoped tighter than (see redeemPairingCode).
export async function requireKioskDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireDeviceToken(req, res, () => {
    if (req.pairedEmployeeCode) {
      res.status(401).json({ error: "Device not paired", code: "DEVICE_NOT_PAIRED" });
      return;
    }
    next();
  });
}

// The mirror image, for the remote-checkin routes: only a personal
// employee-scoped phone token may call these, never a shared kiosk token
// — a kiosk device has no single employeeCode to submit a remote request
// for.
export async function requireEmployeeDeviceToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireDeviceToken(req, res, () => {
    if (!req.pairedEmployeeCode) {
      res.status(401).json({ error: "Device not paired", code: "DEVICE_NOT_PAIRED" });
      return;
    }
    next();
  });
}
