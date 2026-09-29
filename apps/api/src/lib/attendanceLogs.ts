import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../db/client";

export interface AttendanceLogRow {
  timestamp: string;
  employeeName: string;
  employeeId: string;
  session: string;
  action: string;
  status: string;
  message: string;
  authType: string;
  deviceName: string | null;
  syncedLate: boolean;
}

export async function appendAttendanceRow(params: {
  orgId: string;
  employeeName: string;
  employeeId: string;
  action: string;
  session: string;
  timestamp: string;
  status: string;
  message: string;
  deviceId?: string;
  biometricDeviceId?: string;
  sourceRawTimestamp?: string;
  occurredAt?: Date;
  syncedLate?: boolean;
  authType?: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(schema.attendanceLogs).values({
    orgId: params.orgId,
    employeeCode: params.employeeId,
    employeeName: params.employeeName,
    action: params.action,
    session: params.session,
    timestamp: params.timestamp,
    status: params.status,
    message: params.message,
    deviceId: params.deviceId,
    biometricDeviceId: params.biometricDeviceId,
    sourceRawTimestamp: params.sourceRawTimestamp,
    occurredAt: params.occurredAt ?? new Date(),
    syncedLate: params.syncedLate ?? false,
    authType: params.authType ?? "pin",
  });
}

// Most recent event for this employee regardless of source (kiosk or
// terminal) — used to toggle a bare fingerprint punch between checkin and
// checkout, since the terminal itself doesn't tell us which one it is, and
// to guard against a double-tap on the sensor being read as a genuine
// checkin-then-checkout a few seconds apart (see MIN_PUNCH_GAP_MS in
// routes/zkteco.ts).
export async function getLastAttendanceLog(
  orgId: string,
  employeeCode: string,
): Promise<{ action: string; occurredAt: Date; biometricDeviceId: string | null } | null> {
  const db = getDb();
  const rows = await db.query.attendanceLogs.findMany({
    where: and(eq(schema.attendanceLogs.orgId, orgId), eq(schema.attendanceLogs.employeeCode, employeeCode)),
    orderBy: (t, { desc }) => [desc(t.occurredAt)],
    limit: 1,
  });
  return rows[0]
    ? { action: rows[0].action, occurredAt: rows[0].occurredAt, biometricDeviceId: rows[0].biometricDeviceId }
    : null;
}

// A terminal retries a push until it gets an "OK" back, so the same batch
// of punches can arrive more than once — this is the guard against
// double-inserting the same physical punch. Keyed on the device's own raw
// timestamp string (not a time window): a retry resends that string
// byte-for-byte, while two genuinely different scans seconds apart (e.g.
// checkin immediately followed by a checkout, common during testing)
// always carry different raw strings, so this can't confuse the two the
// way a recency window did.
export async function attendancePunchExists(
  orgId: string,
  employeeCode: string,
  biometricDeviceId: string,
  sourceRawTimestamp: string,
): Promise<boolean> {
  const db = getDb();
  const row = await db.query.attendanceLogs.findFirst({
    where: and(
      eq(schema.attendanceLogs.orgId, orgId),
      eq(schema.attendanceLogs.employeeCode, employeeCode),
      eq(schema.attendanceLogs.biometricDeviceId, biometricDeviceId),
      eq(schema.attendanceLogs.sourceRawTimestamp, sourceRawTimestamp),
    ),
  });
  return !!row;
}

// Kiosk and terminal names live in two separate tables (devices,
// biometricDevices) — fetched once per call and joined in memory rather
// than per-row, since an org typically has a handful of devices at most.
export async function getAttendanceLogs(orgId: string): Promise<AttendanceLogRow[]> {
  const db = getDb();
  const [rows, devices, biometricDevices] = await Promise.all([
    db.query.attendanceLogs.findMany({ where: eq(schema.attendanceLogs.orgId, orgId) }),
    db.query.devices.findMany({ where: eq(schema.devices.orgId, orgId) }),
    db.query.biometricDevices.findMany({ where: eq(schema.biometricDevices.orgId, orgId) }),
  ]);
  const deviceNames = new Map(devices.map((d) => [d.id, d.name]));
  const biometricDeviceNames = new Map(biometricDevices.map((d) => [d.id, d.name]));

  return rows.map((r) => ({
    timestamp: r.timestamp,
    employeeName: r.employeeName,
    employeeId: r.employeeCode,
    session: r.session,
    action: r.action,
    status: r.status,
    message: r.message,
    authType: r.authType,
    deviceName:
      (r.deviceId && deviceNames.get(r.deviceId)) ||
      (r.biometricDeviceId && biometricDeviceNames.get(r.biometricDeviceId)) ||
      null,
    syncedLate: r.syncedLate,
  }));
}
