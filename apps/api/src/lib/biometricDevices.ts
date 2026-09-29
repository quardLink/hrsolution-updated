import { and, eq, isNull } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export interface BiometricDevice {
  id: string;
  orgId: string;
  serialNumber: string;
  name: string;
  lastSeenIp: string | null;
  lastSeenAt: Date | null;
  clockOffsetMs: number | null;
  offsetCandidateMs: number | null;
  offsetCandidateAt: Date | null;
  registeredAt: Date;
}

function toDevice(row: typeof schema.biometricDevices.$inferSelect): BiometricDevice {
  return {
    id: row.id,
    orgId: row.orgId,
    serialNumber: row.serialNumber,
    name: row.name,
    lastSeenIp: row.lastSeenIp,
    lastSeenAt: row.lastSeenAt,
    clockOffsetMs: row.clockOffsetMs,
    offsetCandidateMs: row.offsetCandidateMs,
    offsetCandidateAt: row.offsetCandidateAt,
    registeredAt: row.registeredAt,
  };
}

export async function registerBiometricDevice(
  orgId: string,
  serialNumber: string,
  name: string,
): Promise<BiometricDevice> {
  const db = getDb();
  const existing = await db.query.biometricDevices.findFirst({
    where: eq(schema.biometricDevices.serialNumber, serialNumber),
  });
  if (existing && !existing.revokedAt) {
    throw new Error("A device with this serial number is already registered");
  }
  if (existing && existing.revokedAt) {
    // Re-registering a previously revoked unit — reactivate the same row
    // rather than fighting the unique constraint on serialNumber.
    const [updated] = await db
      .update(schema.biometricDevices)
      .set({ orgId, name, revokedAt: null, registeredAt: new Date() })
      .where(eq(schema.biometricDevices.id, existing.id))
      .returning();
    return toDevice(updated);
  }
  const [device] = await db.insert(schema.biometricDevices).values({ orgId, serialNumber, name }).returning();
  return toDevice(device);
}

export async function listBiometricDevices(orgId: string): Promise<BiometricDevice[]> {
  const db = getDb();
  const rows = await db.query.biometricDevices.findMany({
    where: and(eq(schema.biometricDevices.orgId, orgId), isNull(schema.biometricDevices.revokedAt)),
  });
  return rows.map(toDevice);
}

export async function revokeBiometricDevice(orgId: string, id: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.biometricDevices)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.biometricDevices.id, id), eq(schema.biometricDevices.orgId, orgId)));
}

// The name is only ever set once, at registration — this is the only way
// to change it afterward.
export async function renameBiometricDevice(orgId: string, id: string, name: string): Promise<void> {
  const db = getDb();
  await db
    .update(schema.biometricDevices)
    .set({ name })
    .where(and(eq(schema.biometricDevices.id, id), eq(schema.biometricDevices.orgId, orgId)));
}

// Looked up on every ADMS request the terminal makes — this is the only
// thing that ties an inbound push to an org, so it excludes revoked rows.
export async function findBiometricDeviceBySerial(serialNumber: string): Promise<BiometricDevice | null> {
  const db = getDb();
  const row = await db.query.biometricDevices.findFirst({
    where: and(eq(schema.biometricDevices.serialNumber, serialNumber), isNull(schema.biometricDevices.revokedAt)),
  });
  return row ? toDevice(row) : null;
}

export async function touchBiometricDeviceLastSeen(id: string, ip: string | undefined): Promise<void> {
  const db = getDb();
  await db
    .update(schema.biometricDevices)
    .set({ lastSeenAt: new Date(), ...(ip ? { lastSeenIp: ip } : {}) })
    .where(eq(schema.biometricDevices.id, id));
}

// Persists the calibration decision made in routes/zkteco.ts's ingestPunch
// for this device — either a confirmed offset, a new one-punch candidate,
// or clearing the candidate. Never combined with touchBiometricDeviceLastSeen
// since only a punch (not a bare heartbeat) carries the device's own clock
// reading to calibrate against.
export async function updateDeviceClockOffset(
  id: string,
  update: { clockOffsetMs?: number; offsetCandidateMs?: number | null; offsetCandidateAt?: Date | null },
): Promise<void> {
  const db = getDb();
  await db.update(schema.biometricDevices).set(update).where(eq(schema.biometricDevices.id, id));
}
